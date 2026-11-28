import { z } from 'zod';
import type { LocationInfo } from '@/domain/air-quality/types';
import {
  AirQualityServiceError,
  CACHE_TTL_MS,
  fetchJsonWithTimeout,
  REVERSE_TIMEOUT_MS,
} from '@/services/open-meteo-http';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

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

const suggestionCache = new Map<string, { items: LocationInfo[]; expiresAt: number }>();

export function clearGeocodeCache(): void {
  suggestionCache.clear();
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

/**
 * Returns up to 6 deduplicated city suggestions for live autocomplete.
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

  const raw = await fetchJsonWithTimeout(`${GEOCODE_URL}?${params.toString()}`, REVERSE_TIMEOUT_MS);
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
 * Resolves GPS coordinates into a readable locality name, falling back to
 * formatted coordinates if reverse geocoding is unavailable.
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

    const subdivision = parsed.data.principalSubdivision?.trim();
    const region = subdivision && subdivision !== name ? subdivision : undefined;

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