import { NextRequest, NextResponse } from 'next/server';
import { getDemoScenarioById } from '@/domain/air-quality/demo-scenarios';
import { locationQuerySchema } from '@/domain/air-quality/schemas';
import { apiError, getClientIp } from '@/lib/http';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  AirQualityServiceError,
  fetchAirQualityByCity,
  fetchAirQualityForLocation,
  reverseGeocodeCoords,
  searchCitySuggestions,
} from '@/services/open-meteo';

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`aqi:${getClientIp(request)}`, 60, 60_000);
  if (!rate.allowed) {
    return apiError(
      'Too many air-quality lookups. Please wait a moment and try again.',
      'RATE_LIMITED',
      429,
      { headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
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

  if (demoId) {
    const scenario = getDemoScenarioById(demoId);
    if (!scenario) {
      return apiError('Unknown demo scenario requested.', 'INVALID_DEMO', 400);
    }
    return NextResponse.json({ snapshot: scenario.snapshot }, { status: 200 });
  }

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
      return apiError('Invalid latitude or longitude coordinates.', 'INVALID_COORDS', 400);
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

  const parsed = locationQuerySchema.safeParse({ city: city ?? '' });
  if (!parsed.success) {
    return apiError(
      parsed.error.issues[0]?.message ?? 'Please enter a valid city name.',
      'INVALID_QUERY',
      400,
      {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || 'city',
          message: i.message,
        })),
      }
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
    return apiError(error.message, error.code, status);
  }

  return apiError(
    'Unexpected error while fetching air-quality data.',
    'INTERNAL_ERROR',
    500
  );
}