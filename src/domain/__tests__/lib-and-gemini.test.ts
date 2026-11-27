import { afterEach, describe, expect, it } from 'vitest';
import {
  formatMobilityLabel,
  formatOutdoorLabel,
  formatVentilationLabel,
  getActionCategoryMeta,
  getAqiTheme,
  getProvenanceMeta,
} from '@/lib/aqi-theme';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTodayKey } from '@/lib/storage';
import {
  classifyProviderError,
  getConfiguredApiKeys,
  getConfiguredModels,
  stripJsonFences,
} from '@/services/gemini-client';

describe('lib/aqi-theme helpers', () => {
  it('maps every AQI category to a distinct non-color symbol and bounded meter', () => {
    const categories = [
      'good',
      'moderate',
      'unhealthy_sensitive',
      'unhealthy',
      'very_unhealthy',
      'hazardous',
      null,
    ] as const;

    const symbols = new Set(categories.map((c) => getAqiTheme(c, c ? 120 : null).symbol));
    expect(symbols.size).toBe(categories.length);
  });

  it('formats provenance, ventilation, outdoor, mobility, and action category labels', () => {
    expect(getProvenanceMeta('live').label).toBe('Live Data');
    expect(getProvenanceMeta('delayed').label).toBe('Delayed Reading');
    expect(getProvenanceMeta('demo').label).toContain('Demo');
    expect(getProvenanceMeta('unavailable').label).toBe('Data Unavailable');

    expect(formatVentilationLabel('open_freely')).toContain('open');
    expect(formatVentilationLabel('brief_cross_ventilation')).toContain('midday');
    expect(formatVentilationLabel('keep_closed')).toContain('closed');

    expect(formatOutdoorLabel('normal')).toContain('OK');
    expect(formatOutdoorLabel('prefer_light_or_shorter')).toContain('short');
    expect(formatOutdoorLabel('move_indoors')).toContain('indoors');

    expect(formatMobilityLabel('walk_or_cycle_safe')).toContain('Walk');
    expect(formatMobilityLabel('short_walk_or_transit')).toContain('transit');
    expect(
      formatMobilityLabel('avoid_outdoor_exertion_use_transit_or_combine_trips')
    ).toContain('Combine');

    expect(getActionCategoryMeta('sustainable_alternative').label).toBe(
      'Sustainable Alternative'
    );
    expect(getActionCategoryMeta('indoor_hack').label).toBe('Indoor Air Hack');
  });
});

describe('lib/rate-limit & lib/storage', () => {
  it('enforces maxRequests within a window and returns remaining count', () => {
    const key = `unit-rl-${Date.now()}`;
    const first = checkRateLimit(key, 2, 60_000);
    const second = checkRateLimit(key, 2, 60_000);
    const third = checkRateLimit(key, 2, 60_000);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('builds a normalized date-scoped checklist storage key', () => {
    const key = getTodayKey('New Delhi (Smog!)');
    expect(key).toMatch(/^airnest_checklist_v1_\d{4}-\d{2}-\d{2}_new-delhi-smog-$/);
  });
});

describe('services/gemini-client configuration & helpers', () => {
  const savedEnv = {
    GEMINI_API_KEYS: process.env.GEMINI_API_KEYS,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_API_KEY_2: process.env.GEMINI_API_KEY_2,
    GEMINI_API_KEY_3: process.env.GEMINI_API_KEY_3,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    GEMINI_FALLBACK_MODELS: process.env.GEMINI_FALLBACK_MODELS,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('deduplicates configured keys across CSV and numbered env vars', () => {
    process.env.GEMINI_API_KEYS = 'key-a, key-b';
    process.env.GEMINI_API_KEY = 'key-b';
    process.env.GEMINI_API_KEY_2 = 'key-c';
    delete process.env.GEMINI_API_KEY_3;

    expect(getConfiguredApiKeys()).toEqual(['key-a', 'key-b', 'key-c']);
  });

  it('resolves default and fallback model lists cleanly', () => {
    delete process.env.GEMINI_MODEL;
    process.env.GEMINI_FALLBACK_MODELS = 'gemini-2.5-flash-lite, gemini-3.8-flash';
    expect(getConfiguredModels()).toEqual(['gemini-3.8-flash', 'gemini-2.5-flash-lite']);
  });

  it('strips markdown JSON fences and classifies provider errors accurately', () => {
    expect(stripJsonFences('```json\n{"ok":true}\n```')).toBe('{"ok":true}');
    expect(classifyProviderError(new Error('AI_TIMEOUT'))).toContain('timed out');
    expect(classifyProviderError(new Error('503 UNAVAILABLE'))).toContain('503');
    expect(classifyProviderError(new Error('429 RESOURCE_EXHAUSTED'))).toContain('429');
    expect(classifyProviderError(new Error('403 invalid api key'))).toContain('401/403');
    expect(classifyProviderError(new Error('404 NOT_FOUND'))).toContain('404');
  });
});