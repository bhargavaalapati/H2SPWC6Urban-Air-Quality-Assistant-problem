import { describe, expect, it } from 'vitest';
import { buildDeterministicPlan } from '@/domain/air-quality/recommendations';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import type { AirQualitySnapshot } from '@/domain/air-quality/types';

describe('buildDeterministicPlan', () => {
  it('never recommends opening windows or outdoor exercise during severe smog', () => {
    const severe = DEMO_SCENARIOS.find((s) => s.id === 'delhi-winter-smog')!;
    const plan = buildDeterministicPlan(severe.snapshot, DEFAULT_FAMILY_PROFILE);

    expect(plan.safety?.ventilation).toBe('keep_closed');
    expect(plan.actions.some((a) => a.id === 'vent-close')).toBe(true);
    expect(plan.actions.some((a) => a.id === 'vent-open')).toBe(false);
    expect(plan.actions.some((a) => a.id === 'low-emission-walk')).toBe(false);
    expect(plan.actions.some((a) => a.id === 'low-emission-consolidate')).toBe(true);
    expect(plan.indoorAlternatives.length).toBeGreaterThan(0);
  });

  it('includes affordable clean-room guidance when household has no air purifier', () => {
    const severe = DEMO_SCENARIOS.find((s) => s.id === 'delhi-winter-smog')!;
    const noPurifierPlan = buildDeterministicPlan(severe.snapshot, {
      ...DEFAULT_FAMILY_PROFILE,
      hasAirPurifier: false,
    });
    const withPurifierPlan = buildDeterministicPlan(severe.snapshot, {
      ...DEFAULT_FAMILY_PROFILE,
      hasAirPurifier: true,
    });

    expect(noPurifierPlan.actions.some((a) => a.id === 'indoor-clean-room')).toBe(true);
    expect(withPurifierPlan.actions.some((a) => a.id === 'indoor-purifier-bedroom')).toBe(true);
  });

  it('allows natural ventilation and walking routines on clean-air days', () => {
    const clean = DEMO_SCENARIOS.find((s) => s.id === 'bengaluru-crisp-morning')!;
    const plan = buildDeterministicPlan(clean.snapshot, DEFAULT_FAMILY_PROFILE);

    expect(plan.safety?.ventilation).toBe('open_freely');
    expect(plan.actions.some((a) => a.id === 'vent-open')).toBe(true);
    expect(plan.actions.some((a) => a.id === 'low-emission-walk')).toBe(true);
    expect(plan.indoorAlternatives).toHaveLength(0);
  });

  it('handles unavailable environmental data honestly without inventing AQI', () => {
    const unavailableSnapshot: AirQualitySnapshot = {
      location: { name: 'Unknown Town', latitude: 0, longitude: 0 },
      aqi: null,
      category: null,
      pollutants: { pm25: null, pm10: null },
      observedAt: null,
      provenance: 'unavailable',
      sourceLabel: 'Open-Meteo Air Quality (Reading Currently Unavailable)',
    };

    const plan = buildDeterministicPlan(unavailableSnapshot, DEFAULT_FAMILY_PROFILE);
    expect(plan.safety).toBeNull();
    expect(plan.dailyHeadline.toLowerCase()).toContain('unavailable');
    expect(plan.actions.length).toBeGreaterThanOrEqual(3);
  });
});