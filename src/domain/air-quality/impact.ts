import type {
  AirQualitySnapshot,
  DailyActionItem,
  FamilyProfile,
  ImpactBreakdown,
  PlanImpactTotals,
} from '@/domain/air-quality/types';
import {
  buildCommunityBaseFactors,
  getEffectivePeopleCount,
  resolveEffectivePm25,
  round1,
  type ImpactCalculator,
  type ImpactStrategyId,
} from '@/domain/air-quality/impact-constants';
import { EXPOSURE_IMPACT_CALCULATORS } from '@/domain/air-quality/impact-exposure';
import { EMISSION_IMPACT_CALCULATORS } from '@/domain/air-quality/impact-emissions';

export { getEffectivePeopleCount, resolveEffectivePm25, type ImpactStrategyId };

const IMPACT_CALCULATORS: Record<ImpactStrategyId, ImpactCalculator> = {
  ...EXPOSURE_IMPACT_CALCULATORS,
  ...EMISSION_IMPACT_CALCULATORS,
};

/**
 * Computes transparent, unit-tested exposure and emission impact figures for a strategy.
 */
export function computeActionImpact(
  strategyId: ImpactStrategyId,
  snapshot: AirQualitySnapshot,
  profile: FamilyProfile
): ImpactBreakdown {
  const pm25 = resolveEffectivePm25(snapshot);
  const { people } = getEffectivePeopleCount(profile);
  const baseFactors = buildCommunityBaseFactors(profile, people);
  const calculator = IMPACT_CALCULATORS[strategyId] ?? IMPACT_CALCULATORS['vent-open'];

  return calculator({ pm25, people, profile, baseFactors });
}

/**
 * Aggregates per-action exposure and emission impact totals across a daily plan.
 */
export function sumPlanImpactTotals(
  actions: DailyActionItem[],
  profile: FamilyProfile
): PlanImpactTotals {
  const { people, label } = getEffectivePeopleCount(profile);
  let pm25AvoidedUgPerDay = 0;
  let co2eSavedKgPerWeek = 0;
  let pm25EmissionsPreventedGPerWeek = 0;

  for (const action of actions) {
    if (!action.impact) continue;
    pm25AvoidedUgPerDay += action.impact.pm25AvoidedUgPerDay;
    co2eSavedKgPerWeek += action.impact.co2eSavedKgPerWeek;
    pm25EmissionsPreventedGPerWeek += action.impact.pm25EmissionsPreventedGPerWeek;
  }

  return {
    pm25AvoidedUgPerDay: round1(pm25AvoidedUgPerDay),
    co2eSavedKgPerWeek: round1(co2eSavedKgPerWeek),
    pm25EmissionsPreventedGPerWeek: round1(pm25EmissionsPreventedGPerWeek),
    peopleCovered: people,
    audienceLabel: label,
  };
}