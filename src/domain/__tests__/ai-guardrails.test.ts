import { afterEach, describe, expect, it } from 'vitest';
import {
  buildDeterministicAssistantReply,
  checkTextAgainstSafety,
  validateAndFilterAiPlan,
} from '@/domain/air-quality/ai-guardrails';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import { evaluateSafety } from '@/domain/air-quality/thresholds';
import { answerFamilyAirQuestion, generatePersonalizedPlan } from '@/services/ai-assistant';
import type { AirQualitySnapshot } from '@/domain/air-quality/types';

describe('AI safety guardrails', () => {
  const severeSafety = evaluateSafety(268, DEFAULT_FAMILY_PROFILE);

  it('rejects affirmative open-window advice when ventilation is keep_closed', () => {
    const violation = checkTextAgainstSafety(
      'Open the windows for 20 minutes this morning for fresh air.',
      severeSafety
    );
    expect(violation).not.toBeNull();
  });

  it('allows negated mention of windows when telling families to keep them closed', () => {
    const violation = checkTextAgainstSafety(
      'Do not open the windows today; keep them sealed until AQI improves.',
      severeSafety
    );
    expect(violation).toBeNull();
  });

  it('rejects outdoor jogging/play recommendations when outdoorGeneral is move_indoors', () => {
    const violation = checkTextAgainstSafety(
      'Head to the park and let the kids play outside for exercise.',
      severeSafety
    );
    expect(violation).not.toBeNull();
  });

  it('filters unsafe actions from AI plan and rejects entire plan if fewer than 3 safe actions remain', () => {
    const badAiPayload = {
      dailyHeadline: 'Heavy smog today—protect your household indoors.',
      actions: [
        {
          id: 'a1',
          title: 'Open the windows early',
          whyItMatters: 'Brings in fresh outdoor morning breeze.',
          howToDoIt: 'Open your windows wide for 30 minutes.',
          whenLabel: 'Morning',
          timeSlot: 'morning',
          category: 'indoor_hack',
          isLowCost: true,
        },
        {
          id: 'a2',
          title: 'Go for a morning jog outdoors',
          whyItMatters: 'Keeps cardio strong.',
          howToDoIt: 'Head to the park for a 30-minute run.',
          whenLabel: 'Morning',
          timeSlot: 'morning',
          category: 'outdoor',
          isLowCost: true,
        },
      ],
    };

    expect(validateAndFilterAiPlan(badAiPayload, severeSafety)).toBeNull();
  });
});

describe('Deterministic assistant fallback & unconfigured AI behavior', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('explicitly explains when live AQI data is unavailable without inventing numbers', () => {
    const unavailable: AirQualitySnapshot = {
      location: { name: 'Mystery City', latitude: 0, longitude: 0 },
      aqi: null,
      category: null,
      pollutants: { pm25: null, pm10: null },
      observedAt: null,
      provenance: 'unavailable',
      sourceLabel: 'Unavailable',
    };

    const reply = buildDeterministicAssistantReply(
      'Can my children play outside today?',
      unavailable,
      DEFAULT_FAMILY_PROFILE
    );

    expect(reply.responseMode).toBe('deterministic_fallback');
    expect(reply.answer.toLowerCase()).toContain("don't have current aqi");
    expect(reply.practicalSteps.length).toBeGreaterThanOrEqual(2);
  });

  it('gives context-accurate window guidance in severe demo smog', () => {
    const severe = DEMO_SCENARIOS.find((s) => s.id === 'delhi-winter-smog')!;
    const reply = buildDeterministicAssistantReply(
      'Should I open the windows this morning?',
      severe.snapshot,
      DEFAULT_FAMILY_PROFILE
    );

    expect(reply.answer.toLowerCase()).toContain('keep windows closed');
    expect(reply.dataNote.toLowerCase()).toContain('demo scenario');
  });

  it('gracefully falls back when GEMINI_API_KEY is unset', async () => {
    delete process.env.GEMINI_API_KEY;
    const hazy = DEMO_SCENARIOS.find((s) => s.id === 'hyderabad-hazy-evening')!;

    const planResult = await generatePersonalizedPlan(
      hazy.snapshot,
      DEFAULT_FAMILY_PROFILE,
      true
    );
    expect(planResult.aiStatus).toBe('fallback_used');
    expect(planResult.plan.mode).toBe('deterministic');

    const reply = await answerFamilyAirQuestion(
      'How can I make my bedroom air cleaner tonight?',
      hazy.snapshot,
      DEFAULT_FAMILY_PROFILE
    );
    expect(reply.responseMode).toBe('deterministic_fallback');
    expect(reply.fallbackReason).toContain('GEMINI_API_KEY');
  });
});