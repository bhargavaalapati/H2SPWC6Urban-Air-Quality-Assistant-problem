import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AirQualityServiceError,
  clearAirQualityCache,
  fetchAirQualityByCity,
  fetchAirQualityForLocation,
  reverseGeocodeCoords,
} from '@/services/open-meteo';

describe('open-meteo service', () => {
  beforeEach(() => {
    clearAirQualityCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes live geocoding + air-quality data accurately', async () => {
    const recentIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              name: 'Visakhapatnam',
              admin1: 'Andhra Pradesh',
              country: 'India',
              latitude: 17.6868,
              longitude: 83.2185,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            time: recentIso,
            us_aqi: 92.4,
            pm2_5: 31.42,
            pm10: 54.88,
            nitrogen_dioxide: 18.2,
            ozone: 41.1,
          },
          hourly: {
            time: [recentIso],
            us_aqi: [92.4],
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await fetchAirQualityByCity('Visakhapatnam');
    expect(snapshot.location.name).toBe('Visakhapatnam');
    expect(snapshot.aqi).toBe(92);
    expect(snapshot.category).toBe('moderate');
    expect(snapshot.provenance).toBe('live');
    expect(snapshot.pollutants.pm25).toBe(31.4);
    expect(snapshot.pollutants.pm10).toBe(54.9);
  });

  it('marks readings older than 3 hours as delayed', async () => {
    const staleIso = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            time: staleIso,
            us_aqi: 160,
            pm2_5: 72,
            pm10: 110,
          },
        }),
      })
    );

    const snapshot = await fetchAirQualityForLocation({
      name: 'Kanpur',
      latitude: 26.4499,
      longitude: 80.3319,
    });

    expect(snapshot.provenance).toBe('delayed');
    expect(snapshot.category).toBe('unhealthy');
  });

  it('marks missing AQI reading as unavailable instead of inventing a value', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            time: new Date().toISOString(),
            us_aqi: null,
            pm2_5: null,
            pm10: null,
          },
        }),
      })
    );

    const snapshot = await fetchAirQualityForLocation({
      name: 'Remote Valley',
      latitude: 34.15,
      longitude: 77.58,
    });

    expect(snapshot.aqi).toBeNull();
    expect(snapshot.provenance).toBe('unavailable');
  });

  it('throws CITY_NOT_FOUND instead of substituting another city', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })
    );

    await expect(fetchAirQualityByCity('XyzNoSuchCity123')).rejects.toMatchObject({
      code: 'CITY_NOT_FOUND',
    } satisfies Partial<AirQualityServiceError>);
  });

  it('throws UPSTREAM_TIMEOUT when fetch aborts', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(abortError));

    await expect(
      fetchAirQualityForLocation({
        name: 'Hyderabad',
        latitude: 17.385,
        longitude: 78.4867,
      })
    ).rejects.toMatchObject({
      code: 'UPSTREAM_TIMEOUT',
    } satisfies Partial<AirQualityServiceError>);
  });
  
  it('reverse-geocodes GPS coordinates into a human-readable city and region', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          city: 'Hyderabad',
          principalSubdivision: 'Telangana',
          countryName: 'India',
        }),
      })
    );

    const loc = await reverseGeocodeCoords(17.385, 78.4867);
    expect(loc.name).toBe('Hyderabad');
    expect(loc.region).toBe('Telangana');
    expect(loc.country).toBe('India');
  });

  it('falls back to formatted coordinates if reverse-geocoding fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('Network down'))
    );

    const loc = await reverseGeocodeCoords(17.385, 78.4867);
    expect(loc.name).toContain('17.39');
    expect(loc.name).toContain('78.49');
  });
});