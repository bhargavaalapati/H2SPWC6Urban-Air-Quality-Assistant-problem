import { z } from 'zod';
import { classifyUsAqi } from '@/domain/air-quality/thresholds';
import type {
  AirQualitySnapshot,
  DataProvenance,
  HourlyAqiPoint,
  LocationInfo,
} from '@/domain/air-quality/types';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const REVERSE_GEOCODE_URL =
  'https://api.bigdatacloud.net/data/reverse-geocode-client';
const REQUEST_TIMEOUT_MS = 7000;
const REVERSE_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DELAYED_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

const geocodeResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      })
    )
    .optional(),
});

const reverseGeocodeSchema = z.object({
  city: z.string().optional(),
  locality: z.string().optional(),
  principalSubdivision: z.string().optional(),
  countryName: z.string().optional(),
});

const openMeteoAirSchema = z.object({
  current: z
    .object({
      time: z.string(),
      us_aqi: z.number().nullable().optional(),
      pm2_5: z.number().nullable().optional(),
      pm10: z.number().nullable().optional(),
      nitrogen_dioxide: z.number().nullable().optional(),
      ozone: z.number().nullable().optional(),
    })
    .optional(),
  hourly: z
    .object({
      time: z.array(z.string()),
      us_aqi: z.array(z.number().nullable()),
    })
    .optional(),
});

export type AirQualityServiceErrorCode =
  | 'CITY_NOT_FOUND'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR';

export class AirQualityServiceError extends Error {
  constructor(
    public readonly code: AirQualityServiceErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AirQualityServiceError';
  }
}

interface CacheEntry {
  snapshot: AirQualitySnapshot;
  expiresAt: number;
}

const snapshotCache = new Map<string, CacheEntry>();

export function clearAirQualityCache(): void {
  snapshotCache.clear();
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new AirQualityServiceError(
        'UPSTREAM_ERROR',
        `Environmental data provider returned HTTP ${response.status}.`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AirQualityServiceError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AirQualityServiceError(
        'UPSTREAM_TIMEOUT',
        'Air-quality data request timed out. Try again or switch to a Demo Scenario.'
      );
    }
    throw new AirQualityServiceError(
      'UPSTREAM_ERROR',
      'Unable to reach the live air-quality service right now.'
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodeCity(city: string): Promise<LocationInfo> {
  const params = new URLSearchParams({
    name: city.trim(),
    count: '3',
    language: 'en',
    format: 'json',
  });

  const raw = await fetchJsonWithTimeout(`${GEOCODE_URL}?${params.toString()}`);
  const parsed = geocodeResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new AirQualityServiceError(
      'UPSTREAM_ERROR',
      'Received an unexpected response while searching for that location.'
    );
  }

  const bestMatch = parsed.data.results?.[0];
  if (!bestMatch) {
    throw new AirQualityServiceError(
      'CITY_NOT_FOUND',
      `We couldn't find "${city.trim()}". Check the spelling or try a nearby major city.`
    );
  }

  return {
    name: bestMatch.name,
    region: bestMatch.admin1,
    country: bestMatch.country,
    latitude: bestMatch.latitude,
    longitude: bestMatch.longitude,
  };
}

const suggestionCache = new Map<string, { items: LocationInfo[]; expiresAt: number }>();

/**
 * Returns up to 6 city suggestions for live autocomplete as the user types.
 */
export async function searchCitySuggestions(query: string): Promise<LocationInfo[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  const now = Date.now();
  const cached = suggestionCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.items;
  }

  const params = new URLSearchParams({
    name: trimmed,
    count: '6',
    language: 'en',
    format: 'json',
  });

  const raw = await fetchJsonWithTimeout(
    `${GEOCODE_URL}?${params.toString()}`,
    REVERSE_TIMEOUT_MS
  );
  const parsed = geocodeResponseSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.results) {
    return [];
  }

  const seen = new Set<string>();
  const items: LocationInfo[] = [];

  for (const r of parsed.data.results) {
    const dedupeKey = `${r.name.toLowerCase()}|${(r.admin1 ?? '').toLowerCase()}|${(r.country ?? '').toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    items.push({
      name: r.name,
      region: r.admin1,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
    });
  }

  suggestionCache.set(cacheKey, { items, expiresAt: now + CACHE_TTL_MS });
  return items;
}

/**
 * Resolves GPS coordinates into a human-readable city/locality name.
 * Gracefully falls back to formatted coordinates if reverse geocoding is unavailable
 * so live AQI fetching never fails solely due to reverse lookup.
 */
export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<LocationInfo> {
  const fallback: LocationInfo = {
    name: `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
    latitude,
    longitude,
  };

  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: 'en',
    });

    const raw = await fetchJsonWithTimeout(
      `${REVERSE_GEOCODE_URL}?${params.toString()}`,
      REVERSE_TIMEOUT_MS
    );
    const parsed = reverseGeocodeSchema.safeParse(raw);
    if (!parsed.success) {
      return fallback;
    }

    const name =
      parsed.data.city?.trim() ||
      parsed.data.locality?.trim() ||
      parsed.data.principalSubdivision?.trim();

    if (!name) {
      return fallback;
    }

    const region =
      parsed.data.principalSubdivision?.trim() &&
      parsed.data.principalSubdivision.trim() !== name
        ? parsed.data.principalSubdivision.trim()
        : undefined;

    return {
      name,
      region,
      country: parsed.data.countryName?.trim() || undefined,
      latitude,
      longitude,
    };
  } catch {
    return fallback;
  }
}

function determineProvenance(
  observedAt: string | null,
  aqi: number | null,
  nowMs: number
): DataProvenance {
  if (aqi === null || !observedAt) {
    return 'unavailable';
  }
  const timestampMs = Date.parse(observedAt);
  if (Number.isNaN(timestampMs)) {
    return 'delayed';
  }
  return nowMs - timestampMs > DELAYED_THRESHOLD_MS ? 'delayed' : 'live';
}

export async function fetchAirQualityForLocation(
  location: LocationInfo,
  nowMs: number = Date.now()
): Promise<AirQualitySnapshot> {
  const cacheKey = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.expiresAt > nowMs) {
    return { ...cached.snapshot, location };
  }

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone',
    hourly: 'us_aqi',
    timezone: 'auto',
    forecast_days: '1',
  });

  const raw = await fetchJsonWithTimeout(`${AIR_QUALITY_URL}?${params.toString()}`);
  const parsed = openMeteoAirSchema.safeParse(raw);

  if (!parsed.success) {
    throw new AirQualityServiceError(
      'UPSTREAM_ERROR',
      'Live air-quality response format could not be validated.'
    );
  }

  const current = parsed.data.current;
  const rawAqi = typeof current?.us_aqi === 'number' ? Math.round(current.us_aqi) : null;
  const observedAt = current?.time ?? null;
  const provenance = determineProvenance(observedAt, rawAqi, nowMs);

  const hourlyForecast: HourlyAqiPoint[] = [];
  if (parsed.data.hourly) {
    const { time, us_aqi } = parsed.data.hourly;
    const count = Math.min(time.length, us_aqi.length);
    for (let i = 0; i < count; i += 1) {
      const isoTime = time[i];
      const aqiVal = us_aqi[i];
      if (isoTime && typeof aqiVal === 'number' && Number.isFinite(aqiVal) && aqiVal >= 0) {
        hourlyForecast.push({ isoTime, aqi: Math.round(aqiVal) });
      }
    }
  }

  const snapshot: AirQualitySnapshot = {
    location,
    aqi: rawAqi,
    category: classifyUsAqi(rawAqi),
    pollutants: {
      pm25: typeof current?.pm2_5 === 'number' ? Number(current.pm2_5.toFixed(1)) : null,
      pm10: typeof current?.pm10 === 'number' ? Number(current.pm10.toFixed(1)) : null,
      no2:
        typeof current?.nitrogen_dioxide === 'number'
          ? Number(current.nitrogen_dioxide.toFixed(1))
          : null,
      o3: typeof current?.ozone === 'number' ? Number(current.ozone.toFixed(1)) : null,
    },
    observedAt,
    provenance,
    sourceLabel:
      provenance === 'unavailable'
        ? 'Open-Meteo Air Quality (Reading Currently Unavailable)'
        : 'Open-Meteo Air Quality (Model & Monitoring Blend)',
    hourlyForecast: hourlyForecast.length > 0 ? hourlyForecast : undefined,
  };

  if (provenance !== 'unavailable') {
    snapshotCache.set(cacheKey, {
      snapshot,
      expiresAt: nowMs + CACHE_TTL_MS,
    });
  }

  return snapshot;
}

export async function fetchAirQualityByCity(city: string): Promise<AirQualitySnapshot> {
  const location = await geocodeCity(city);
  return fetchAirQualityForLocation(location);
}