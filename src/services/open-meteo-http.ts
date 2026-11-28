export const REQUEST_TIMEOUT_MS = 7000;
export const REVERSE_TIMEOUT_MS = 4000;
export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

export async function fetchJsonWithTimeout(
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