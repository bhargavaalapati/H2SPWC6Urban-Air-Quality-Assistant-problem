import { z } from 'zod';
import { classifyUsAqi } from '@/domain/air-quality/thresholds';
import type {
  AirQualitySnapshot,
  DataProvenance,
  HourlyAqiPoint,
  LocationInfo,
} from '@/domain/air-quality/types';
import {
  AirQualityServiceError,
  CACHE_TTL_MS,
  fetchJsonWithTimeout,
  type AirQualityServiceErrorCode,
} from '@/services/open-meteo-http';
import {
  clearGeocodeCache,
  geocodeCity,
  reverseGeocodeCoords,
  searchCitySuggestions,
} from '@/services/open-meteo-geocode';

export {
  AirQualityServiceError,
  geocodeCity,
  reverseGeocodeCoords,
  searchCitySuggestions,
  type AirQualityServiceErrorCode,
};

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const DELAYED_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

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

interface CacheEntry {
  snapshot: AirQualitySnapshot;
  expiresAt: number;
}

const snapshotCache = new Map<string, CacheEntry>();

export function clearAirQualityCache(): void {
  snapshotCache.clear();
  clearGeocodeCache();
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

function parseHourlyForecast(
  hourly?: { time: string[]; us_aqi: Array<number | null> }
): HourlyAqiPoint[] | undefined {
  if (!hourly) return undefined;

  const points: HourlyAqiPoint[] = [];
  const count = Math.min(hourly.time.length, hourly.us_aqi.length);
  for (let i = 0; i < count; i += 1) {
    const isoTime = hourly.time[i];
    const aqiVal = hourly.us_aqi[i];
    if (isoTime && typeof aqiVal === 'number' && Number.isFinite(aqiVal) && aqiVal >= 0) {
      points.push({ isoTime, aqi: Math.round(aqiVal) });
    }
  }
  return points.length > 0 ? points : undefined;
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
    hourlyForecast: parseHourlyForecast(parsed.data.hourly),
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