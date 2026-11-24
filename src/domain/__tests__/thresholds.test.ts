import { describe, expect, it } from 'vitest';
import {
  classifyUsAqi,
  evaluateSafety,
  findSaferWindowNote,
} from '../air-quality/thresholds';
import {
  DEFAULT_FAMILY_PROFILE,
  familyProfileSchema,
  locationQuerySchema,
} from '../air-quality/schemas';
import { DEMO_SCENARIOS } from '../air-quality/demo-scenarios';

describe('classifyUsAqi', () => {
  it('handles EPA boundary values accurately', () => {
    expect(classifyUsAqi(0)).toBe('good');
    expect(classifyUsAqi(50)).toBe('good');
    expect(classifyUsAqi(51)).toBe('moderate');
    expect(classifyUsAqi(100)).toBe('moderate');
    expect(classifyUsAqi(101)).toBe('unhealthy_sensitive');
    expect(classifyUsAqi(150)).toBe('unhealthy_sensitive');
    expect(classifyUsAqi(151)).toBe('unhealthy');
    expect(classifyUsAqi(200)).toBe('unhealthy');
    expect(classifyUsAqi(201)).toBe('very_unhealthy');
    expect(classifyUsAqi(300)).toBe('very_unhealthy');
    expect(classifyUsAqi(301)).toBe('hazardous');
    expect(classifyUsAqi(450)).toBe('hazardous');
  });

  it('returns null for missing or invalid AQI values', () => {
    expect(classifyUsAqi(null)).toBeNull();
    expect(classifyUsAqi(undefined)).toBeNull();
    expect(classifyUsAqi(-5)).toBeNull();
    expect(classifyUsAqi(Number.NaN)).toBeNull();
  });
});

describe('evaluateSafety', () => {
  it('enforces keep_closed ventilation and move_indoors at AQI >= 151', () => {
    const assessment = evaluateSafety(185, DEFAULT_FAMILY_PROFILE);
    expect(assessment.ventilation).toBe('keep_closed');
    expect(assessment.outdoorKids).toBe('move_indoors');
    expect(assessment.outdoorGeneral).toBe('move_indoors');
    expect(assessment.lowEmissionMobility).toBe(
      'avoid_outdoor_exertion_use_transit_or_combine_trips'
    );
  });

  it('flags official advisories at Very Unhealthy and Hazardous levels', () => {
    expect(evaluateSafety(210, DEFAULT_FAMILY_PROFILE).recommendOfficialAdvisory).toBe(true);
    expect(evaluateSafety(340, DEFAULT_FAMILY_PROFILE).recommendOfficialAdvisory).toBe(true);
    expect(evaluateSafety(140, DEFAULT_FAMILY_PROFILE).recommendOfficialAdvisory).toBe(false);
  });

  it('adjusts moderate-AQI kids guidance when household sensitivity is elevated', () => {
    const elevatedProfile = { ...DEFAULT_FAMILY_PROFILE, sensitivity: 'elevated' as const };
    const standard = evaluateSafety(75, DEFAULT_FAMILY_PROFILE);
    const elevated = evaluateSafety(75, elevatedProfile);

    expect(standard.outdoorKids).toBe('normal');
    expect(elevated.outdoorKids).toBe('prefer_light_or_shorter');
  });

  it('throws on invalid negative AQI', () => {
    expect(() => evaluateSafety(-10, DEFAULT_FAMILY_PROFILE)).toThrow(RangeError);
  });
});

describe('findSaferWindowNote', () => {
  it('identifies the cleanest daytime hour when AQI drops to <= 120', () => {
    const note = findSaferWindowNote([
      { isoTime: '2026-11-23T08:00:00+05:30', aqi: 135 },
      { isoTime: '2026-11-23T14:00:00+05:30', aqi: 82 },
      { isoTime: '2026-11-23T20:00:00+05:30', aqi: 150 },
    ]);
    expect(note).toContain('82');
  });

  it('warns against ventilation when all daytime hours remain > 120', () => {
    const note = findSaferWindowNote([
      { isoTime: '2026-11-23T08:00:00+05:30', aqi: 240 },
      { isoTime: '2026-11-23T14:00:00+05:30', aqi: 175 },
    ]);
    expect(note).toContain('avoid opening windows');
  });
});

describe('Validation schemas & Demo scenarios', () => {
  it('rejects invalid household sizes and overly short city names', () => {
    expect(
      familyProfileSchema.safeParse({ ...DEFAULT_FAMILY_PROFILE, householdSize: 0 }).success
    ).toBe(false);
    expect(locationQuerySchema.safeParse({ city: 'A' }).success).toBe(false);
    expect(locationQuerySchema.safeParse({ city: 'Hyderabad' }).success).toBe(true);
  });

  it('marks every demo scenario with provenance="demo"', () => {
    expect(DEMO_SCENARIOS.length).toBeGreaterThanOrEqual(3);
    for (const scenario of DEMO_SCENARIOS) {
      expect(scenario.snapshot.provenance).toBe('demo');
      expect(scenario.snapshot.sourceLabel.toLowerCase()).toContain('demo');
    }
  });
});