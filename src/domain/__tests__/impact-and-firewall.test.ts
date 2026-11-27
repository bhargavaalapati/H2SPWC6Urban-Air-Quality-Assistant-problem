import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarUrl } from '@/domain/air-quality/calendar';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';
import {
  computeActionImpact,
  resolveEffectivePm25,
  sumPlanImpactTotals,
} from '@/domain/air-quality/impact';
import { verifyNumberFirewall } from '@/domain/air-quality/number-firewall';
import { buildDeterministicPlan } from '@/domain/air-quality/recommendations';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import { findCleanestAndWorstHours } from '@/domain/air-quality/thresholds';

const SEVERE_DEMO = DEMO_SCENARIOS[0]!;

describe('Deterministic Direct-Impact Engine', () => {
  it('computes non-zero PM2.5 exposure avoided with cited published factors and assumptions', () => {
    const impact = computeActionImpact(
      'vent-close',
      SEVERE_DEMO.snapshot,
      DEFAULT_FAMILY_PROFILE
    );

    expect(impact.pm25AvoidedUgPerDay).toBeGreaterThan(0);
    expect(impact.formulaSummary).toContain('µg/day avoided');
    expect(impact.factors.some((f) => f.kind === 'published_factor')).toBe(true);
    expect(impact.factors.some((f) => f.kind === 'assumption')).toBe(true);
  });

  it('scales impact totals cleanly in Community / School mode using 30% participation', () => {
    const communityProfile = {
      ...DEFAULT_FAMILY_PROFILE,
      audienceMode: 'community' as const,
      communityType: 'school' as const,
      communitySize: 500,
      cookingFuel: 'mixed_or_solid' as const,
      openWasteBurningNearby: true,
    };

    const plan = buildDeterministicPlan(SEVERE_DEMO.snapshot, communityProfile);
    expect(plan.actions.some((a) => a.id === 'community-stagger-advisory')).toBe(true);
    expect(plan.actions.some((a) => a.id === 'sustain-clean-cooking')).toBe(true);
    expect(plan.actions.some((a) => a.id === 'sustain-stop-burning')).toBe(true);
    expect(plan.impactTotals.peopleCovered).toBe(150); // 30% of 500
    expect(plan.impactTotals.pm25AvoidedUgPerDay).toBeGreaterThan(1000);
    expect(plan.impactTotals.co2eSavedKgPerWeek).toBeGreaterThan(0);
    expect(plan.impactTotals.pm25EmissionsPreventedGPerWeek).toBeGreaterThan(0);

    const recomputed = sumPlanImpactTotals(plan.actions, communityProfile);
    expect(recomputed).toEqual(plan.impactTotals);
  });

  it('credits households already using clean cooking and low-emission commuting', () => {
    const cleanPlan = buildDeterministicPlan(SEVERE_DEMO.snapshot, DEFAULT_FAMILY_PROFILE);
    expect(cleanPlan.actions.some((a) => a.id === 'sustain-clean-credit')).toBe(true);
  });

  it('derives conservative PM2.5 estimate from AQI when PM2.5 reading is null', () => {
    const estimated = resolveEffectivePm25({
      ...SEVERE_DEMO.snapshot,
      pollutants: { pm25: null, pm10: null },
    });
    expect(estimated).toBeGreaterThan(150);
  });
});

describe('Server-Side Number Firewall', () => {
  const facts = {
    aqi: 268,
    pm25: 218,
    householdSize: 4,
    pm25AvoidedUgPerDay: 915.6,
  };

  it('allows numerals present in deterministic facts, user question, or chemical notation', () => {
    const result = verifyNumberFirewall(
      'At AQI 268 (PM2.5 218 µg/m³), your 4-person home can avoid 916 µg/day for your 7-year-old.',
      facts,
      'Can my 7-year-old play outside today?'
    );
    expect(result.passed).toBe(true);
    expect(result.unexpectedNumbers).toHaveLength(0);
  });

  it('blocks hallucinated percentages, AQI values, or ungrounded metrics', () => {
    const result = verifyNumberFirewall(
      'Closing doors cuts smog by 87% and AQI will drop to 112 in 45 minutes.',
      facts,
      'Should I close windows?'
    );
    expect(result.passed).toBe(false);
    expect(result.unexpectedNumbers).toEqual(expect.arrayContaining(['87', '112', '45']));
  });
});

describe('Cleanest/Worst Hours & Calendar Intent Builder', () => {
  it('identifies cleanest and worst projected hours accurately', () => {
    const extremes = findCleanestAndWorstHours(SEVERE_DEMO.snapshot.hourlyForecast);
    expect(extremes).not.toBeNull();
    expect(extremes?.cleanest.aqi).toBe(185);
    expect(extremes?.worst.aqi).toBe(290);
  });

  it('builds a valid zero-dependency Google Calendar template link', () => {
    const url = buildGoogleCalendarUrl({
      title: 'Brief midday airing',
      details: 'Open opposite windows for 15 minutes.',
      locationName: 'Hyderabad',
      targetIsoTime: '2026-11-26T14:00:00+05:30',
    });
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('location=Hyderabad');
  });
});