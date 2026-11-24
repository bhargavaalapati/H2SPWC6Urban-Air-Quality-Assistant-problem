import { NextRequest, NextResponse } from 'next/server';
import { getDemoScenarioById } from '@/domain/air-quality/demo-scenarios';
import { locationQuerySchema } from '@/domain/air-quality/schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  AirQualityServiceError,
  fetchAirQualityByCity,
  fetchAirQualityForLocation,
  reverseGeocodeCoords,
  searchCitySuggestions,
} from '@/services/open-meteo';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'local-client';
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`aqi:${getClientIp(request)}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'Too many air-quality lookups. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const suggest = searchParams.get('suggest');
  const demoId = searchParams.get('demo');
  const city = searchParams.get('city');
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const labelParam = searchParams.get('label');
  const regionParam = searchParams.get('region');
  const countryParam = searchParams.get('country');

  // 0. Live city autocomplete suggestions
  if (suggest !== null) {
    const trimmed = suggest.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }
    try {
      const suggestions = await searchCitySuggestions(trimmed);
      return NextResponse.json({ suggestions }, { status: 200 });
    } catch {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }
  }

  // 1. Explicitly labeled demo scenario
  if (demoId) {
    const scenario = getDemoScenarioById(demoId);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Unknown demo scenario requested.', code: 'INVALID_DEMO' },
        { status: 400 }
      );
    }
    return NextResponse.json({ snapshot: scenario.snapshot }, { status: 200 });
  }

  // 2. Coordinate lookup (Near Me reverse-geocoding OR exact autocomplete selection)
  if (latParam !== null && lonParam !== null) {
    const latitude = Number(latParam);
    const longitude = Number(lonParam);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude coordinates.', code: 'INVALID_COORDS' },
        { status: 400 }
      );
    }

    try {
      const resolvedLocation = labelParam?.trim()
        ? {
            name: labelParam.trim(),
            region: regionParam?.trim() || undefined,
            country: countryParam?.trim() || undefined,
            latitude,
            longitude,
          }
        : await reverseGeocodeCoords(latitude, longitude);

      const snapshot = await fetchAirQualityForLocation(resolvedLocation);
      return NextResponse.json({ snapshot }, { status: 200 });
    } catch (error) {
      return handleServiceError(error);
    }
  }

  // 3. Manual city search
  const parsed = locationQuerySchema.safeParse({ city: city ?? '' });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Please enter a valid city name.',
        code: 'INVALID_QUERY',
      },
      { status: 400 }
    );
  }

  try {
    const snapshot = await fetchAirQualityByCity(parsed.data.city);
    return NextResponse.json({ snapshot }, { status: 200 });
  } catch (error) {
    return handleServiceError(error);
  }
}

function handleServiceError(error: unknown) {
  if (error instanceof AirQualityServiceError) {
    const status =
      error.code === 'CITY_NOT_FOUND'
        ? 404
        : error.code === 'UPSTREAM_TIMEOUT'
          ? 504
          : 502;
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status }
    );
  }

  return NextResponse.json(
    {
      error: 'Unexpected error while fetching air-quality data.',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}