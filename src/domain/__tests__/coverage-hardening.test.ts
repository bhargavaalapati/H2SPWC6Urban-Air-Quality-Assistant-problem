import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  buildDeterministicAssistantReply,
  buildProvenanceNote,
  validateAndFilterAiPlan,
} from '@/domain/air-quality/ai-guardrails';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';
import { buildDeterministicPlan } from '@/domain/air-quality/recommendations';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import { evaluateSafety } from '@/domain/air-quality/thresholds';
import type { AirQualitySnapshot, FamilyProfile } from '@/domain/air-quality/types';
import { getClientIp, parseJsonBodyWithLimit } from '@/lib/http';
import {
  AirQualityServiceError,
  clearAirQualityCache,
  reverseGeocodeCoords,
  searchCitySuggestions,
} from '@/services/open-meteo';
import { fetchJsonWithTimeout } from '@/services/open-meteo-http';

const SEVERE_SNAP = DEMO_SCENARIOS[0]!.snapshot;
const MODERATE_SNAP = DEMO_SCENARIOS[1]!.snapshot;
const GOOD_SNAP = DEMO_SCENARIOS[2]!.snapshot;

const UNAVAILABLE_SNAP: AirQualitySnapshot = {
  ...GOOD_SNAP,
  aqi: null,
  category: null,
  provenance: 'unavailable',
  observedAt: null,
};

const DELAYED_SNAP: AirQualitySnapshot = {
  ...MODERATE_SNAP,
  provenance: 'delayed',
};

const LIVE_SNAP: AirQualitySnapshot = {
  ...GOOD_SNAP,
  provenance: 'live',
};

const MODERATE_AQI_SNAP: AirQualitySnapshot = {
  ...MODERATE_SNAP,
  aqi: 82,
  category: 'moderate',
};

describe('assistant-fallback & provenance coverage', () => {
  it('builds accurate provenance notes for every provenance state', () => {
    expect(buildProvenanceNote(UNAVAILABLE_SNAP)).toContain('currently unavailable');
    expect(buildProvenanceNote(SEVERE_SNAP)).toContain('Demo Scenario');
    expect(buildProvenanceNote(DELAYED_SNAP)).toContain('delayed Open-Meteo');
    expect(buildProvenanceNote(LIVE_SNAP)).toContain('current Open-Meteo');
  });

  it('covers ventilation, kids, bedroom, unavailable, and general assistant fallback branches', () => {
    const purifierProfile: FamilyProfile = { ...DEFAULT_FAMILY_PROFILE, hasAirPurifier: true };
    const noPurifierProfile: FamilyProfile = { ...DEFAULT_FAMILY_PROFILE, hasAirPurifier: false };
    const sensitiveSnap: AirQualitySnapshot = {
      ...MODERATE_SNAP,
      aqi: 112,
      category: 'unhealthy_sensitive',
    };

    expect(
      buildDeterministicAssistantReply('Should I open windows?', UNAVAILABLE_SNAP, purifierProfile)
        .answer
    ).toContain("don't have current AQI readings");

    // Ventilation: keep_closed (purifier vs no purifier), brief, open_freely
    expect(
      buildDeterministicAssistantReply('Should I open windows?', SEVERE_SNAP, purifierProfile)
        .practicalSteps.join(' ')
    ).toContain('air purifier');
    expect(
      buildDeterministicAssistantReply('Open windows?', SEVERE_SNAP, noPurifierProfile)
        .practicalSteps.join(' ')
    ).toContain('rolled towel');
    expect(
      buildDeterministicAssistantReply('Can we ventilate?', sensitiveSnap, noPurifierProfile).answer
    ).toContain('midday');
    expect(
      buildDeterministicAssistantReply('Fresh air ok?', GOOD_SNAP, noPurifierProfile).answer
    ).toContain('good time to ventilate');

    // Kids / outdoor: move_indoors, prefer_light_or_shorter, normal
    expect(
      buildDeterministicAssistantReply('Can kids play outside?', SEVERE_SNAP, purifierProfile).answer
    ).toContain('Skip outdoor park play');
    expect(
      buildDeterministicAssistantReply('Park for children?', MODERATE_AQI_SNAP, {
        ...purifierProfile,
        sensitivity: 'elevated',
      }).answer
    ).toContain('Light, shorter');
    expect(
      buildDeterministicAssistantReply('Outdoor play?', GOOD_SNAP, purifierProfile).answer
    ).toContain('suitable today');

    // Bedroom / sleep: keep_closed + purifier vs open + no purifier
    expect(
      buildDeterministicAssistantReply('Bedroom air tonight?', SEVERE_SNAP, purifierProfile)
        .practicalSteps.join(' ')
    ).toContain('bedroom door shut');
    expect(
      buildDeterministicAssistantReply('Cheap sleep tips?', GOOD_SNAP, noPurifierProfile)
        .practicalSteps.join(' ')
    ).toContain('folded towel');

    // General fallback: severe vs good
    expect(
      buildDeterministicAssistantReply('Daily summary please', SEVERE_SNAP, noPurifierProfile)
        .practicalSteps.join(' ')
    ).toContain('Keep windows closed');
    expect(
      buildDeterministicAssistantReply('Daily summary please', GOOD_SNAP, noPurifierProfile)
        .practicalSteps.join(' ')
    ).toContain('Walk or cycle');
  });
});

describe('ai-guardrails validateAndFilterAiPlan branches', () => {
  const safety = evaluateSafety(SEVERE_SNAP.aqi!, DEFAULT_FAMILY_PROFILE);

  const makeAction = (id: string, title: string, how: string) => ({
    id,
    title,
    whyItMatters: 'Reduces household fine particle exposure during hazy winter hours.',
    howToDoIt: how,
    whenLabel: 'Morning',
    timeSlot: 'morning' as const,
    category: 'indoor_hack' as const,
    isLowCost: true,
  });

  it('rejects malformed JSON, unsafe headlines, and hallucinated numbers', () => {
    expect(validateAndFilterAiPlan({ bad: true }, safety)).toBeNull();

    const unsafeHeadlinePayload = {
      dailyHeadline: 'Open the windows now to refresh your home.',
      actions: [
        makeAction('a1', 'Skip incense indoors', 'Avoid burning incense or candles today.'),
        makeAction('a2', 'Damp mop floors', 'Use a damp cloth instead of dry sweeping.'),
        makeAction('a3', 'Use kitchen exhaust', 'Run the exhaust fan with pan lids closed.'),
      ],
    };
    expect(validateAndFilterAiPlan(unsafeHeadlinePayload, safety)).toBeNull();

    const hallucinatedHeadline = {
      ...unsafeHeadlinePayload,
      dailyHeadline: 'Air quality is 999 today so stay cautious.',
    };
    expect(
      validateAndFilterAiPlan(hallucinatedHeadline, safety, { aqi: SEVERE_SNAP.aqi })
    ).toBeNull();
  });

  it('filters unsafe or ungrounded actions and returns compliant ai_personalized actions', () => {
    const payload = {
      dailyHeadline: 'Keep windows closed today and focus on clean indoor habits.',
      actions: [
        makeAction('bad-win', 'Open your windows wide', 'Open the windows for fresh air.'),
        makeAction('bad-num', 'Cut smog by 87 percent', 'This reduces particles by 87 percent.'),
        makeAction('ok-1', 'Skip indoor smoke', 'Pause incense, candles, and smoky frying today.'),
        makeAction('ok-2', 'Damp clean surfaces', 'Damp-mop rooms rather than using a dry broom.'),
        makeAction('ok-3', 'Seal door gaps', 'Place a folded towel beneath drafty balcony doors.'),
      ],
    };

    const filtered = validateAndFilterAiPlan(payload, safety, { aqi: SEVERE_SNAP.aqi });
    expect(filtered).not.toBeNull();
    expect(filtered?.actions).toHaveLength(3);
    expect(filtered?.actions.every((a) => a.source === 'ai_personalized')).toBe(true);

    // Fewer than 3 compliant actions triggers full rejection
    const tooFew = { ...payload, actions: payload.actions.slice(0, 4) };
    expect(validateAndFilterAiPlan(tooFew, safety, { aqi: SEVERE_SNAP.aqi })).toBeNull();
  });
});

describe('outdoor-and-community strategy branches via buildDeterministicPlan', () => {
  it('covers school, RWA, and neighbourhood community advisories at high AQI', () => {
    for (const communityType of ['school', 'rwa', 'neighbourhood'] as const) {
      const plan = buildDeterministicPlan(SEVERE_SNAP, {
        ...DEFAULT_FAMILY_PROFILE,
        audienceMode: 'community',
        communityType,
        communitySize: 200,
      });
      expect(plan.actions.some((a) => a.id === 'community-stagger-advisory')).toBe(true);
    }
  });

  it('covers household move_indoors, prefer_light_or_shorter, and normal outdoor branches', () => {
    const moveIndoorsAdultMorning = buildDeterministicPlan(SEVERE_SNAP, {
      ...DEFAULT_FAMILY_PROFILE,
      hasChildren: false,
      typicalOutdoorTime: 'morning',
    });
    expect(moveIndoorsAdultMorning.actions.some((a) => a.id === 'outdoor-shift-indoors')).toBe(
      true
    );

    const moveIndoorsAfternoon = buildDeterministicPlan(SEVERE_SNAP, {
      ...DEFAULT_FAMILY_PROFILE,
      hasChildren: false,
      typicalOutdoorTime: 'afternoon',
    });
    expect(moveIndoorsAfternoon.actions.some((a) => a.timeSlot === 'midday')).toBe(true);

    const moderateNoHours: AirQualitySnapshot = {
      ...MODERATE_AQI_SNAP,
      hourlyForecast: undefined,
    };
    const shortenPlan = buildDeterministicPlan(moderateNoHours, {
      ...DEFAULT_FAMILY_PROFILE,
      sensitivity: 'elevated',
    });
    expect(shortenPlan.actions.some((a) => a.id === 'outdoor-shorten')).toBe(true);

    const goodNoKids = buildDeterministicPlan(GOOD_SNAP, {
      ...DEFAULT_FAMILY_PROFILE,
      hasChildren: false,
      typicalOutdoorTime: 'morning',
    });
    expect(goodNoKids.actions.some((a) => a.id === 'outdoor-enjoy')).toBe(true);
  });
});

describe('lib/http request guardrails', () => {
  it('extracts client IP from x-forwarded-for, x-real-ip, or local fallback', () => {
    const forwardedReq = new NextRequest('http://localhost/api/plan', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    });
    expect(getClientIp(forwardedReq)).toBe('203.0.113.5');

    const realIpReq = new NextRequest('http://localhost/api/plan', {
      headers: { 'x-real-ip': '198.51.100.8' },
    });
    expect(getClientIp(realIpReq)).toBe('198.51.100.8');

    const localReq = new NextRequest('http://localhost/api/plan');
    expect(getClientIp(localReq)).toBe('local-client');
  });

  it('rejects non-JSON content-type, oversized declared/actual payloads, and invalid JSON', async () => {
    const badType = await parseJsonBodyWithLimit(
      new NextRequest('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: '{}',
      })
    );
    expect(badType.ok).toBe(false);
    if (!badType.ok) expect(badType.response.status).toBe(415);

    const declaredTooBig = await parseJsonBodyWithLimit(
      new NextRequest('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '99999' },
        body: '{}',
      }),
      64
    );
    expect(declaredTooBig.ok).toBe(false);
    if (!declaredTooBig.ok) expect(declaredTooBig.response.status).toBe(413);

    const actualTooBig = await parseJsonBodyWithLimit(
      new NextRequest('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pad: 'x'.repeat(200) }),
      }),
      64
    );
    expect(actualTooBig.ok).toBe(false);
    if (!actualTooBig.ok) expect(actualTooBig.response.status).toBe(413);

    const brokenJson = await parseJsonBodyWithLimit(
      new NextRequest('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid',
      })
    );
    expect(brokenJson.ok).toBe(false);
    if (!brokenJson.ok) expect(brokenJson.response.status).toBe(400);
  });
});

describe('open-meteo geocode & HTTP error paths', () => {
  afterEach(() => {
    clearAirQualityCache();
    vi.restoreAllMocks();
  });

  it('deduplicates, caches, and guards city autocomplete suggestions', async () => {
    expect(await searchCitySuggestions('a')).toEqual([]);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              name: 'Pune',
              admin1: 'Maharashtra',
              country: 'India',
              latitude: 18.52,
              longitude: 73.85,
            },
            {
              name: 'Pune',
              admin1: 'Maharashtra',
              country: 'India',
              latitude: 18.52,
              longitude: 73.85,
            },
            {
              name: 'Pune',
              admin1: 'Other',
              country: 'India',
              latitude: 18.6,
              longitude: 73.9,
            },
          ],
        }),
        { status: 200 }
      )
    );

    const first = await searchCitySuggestions('Pune');
    const second = await searchCitySuggestions('pune');
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back cleanly when reverse geocoding fails or returns incomplete fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          city: 'Visakhapatnam',
          principalSubdivision: 'Andhra Pradesh',
          countryName: 'India',
        }),
        { status: 200 }
      )
    );
    const resolved = await reverseGeocodeCoords(17.68, 83.21);
    expect(resolved.name).toBe('Visakhapatnam');
    expect(resolved.region).toBe('Andhra Pradesh');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );
    const unnamed = await reverseGeocodeCoords(17.68, 83.21);
    expect(unnamed.name).toContain('17.68');

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const errored = await reverseGeocodeCoords(17.68, 83.21);
    expect(errored.name).toContain('17.68');
  });

  it('maps AbortError and network failures to AirQualityServiceError codes', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortErr);
    await expect(fetchJsonWithTimeout('https://example.com')).rejects.toMatchObject({
      code: 'UPSTREAM_TIMEOUT',
    } satisfies Partial<AirQualityServiceError>);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(fetchJsonWithTimeout('https://example.com')).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
    } satisfies Partial<AirQualityServiceError>);
  });
});