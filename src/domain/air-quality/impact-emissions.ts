import type { ImpactBreakdown } from '@/domain/air-quality/types';
import {
  BREATHING_RATE_REST_M3_HR,
  CAR_CO2E_KG_PER_KM,
  CAR_PM25_G_PER_KM,
  round1,
  round2,
  TRANSIT_CO2E_KG_PER_KM,
  type ImpactCalculator,
  type ImpactContext,
} from '@/domain/air-quality/impact-constants';

function calcLowEmissionMobility(
  ctx: ImpactContext,
  weeklyKmPerCommuter: number,
  co2DeltaPerKm: number
): ImpactBreakdown {
  const commuterCount = Math.max(1, Math.round(ctx.people * 0.5));
  const co2Saved = round1(weeklyKmPerCommuter * co2DeltaPerKm * commuterCount);
  const pmEmittedCut = round2(weeklyKmPerCommuter * CAR_PM25_G_PER_KM * commuterCount);

  return {
    pm25AvoidedUgPerDay: 0,
    co2eSavedKgPerWeek: co2Saved,
    pm25EmissionsPreventedGPerWeek: pmEmittedCut,
    formulaSummary: `${weeklyKmPerCommuter} km/wk × ${round2(co2DeltaPerKm)} kg CO₂e/km × ${commuterCount} ${commuterCount === 1 ? 'commuter' : 'commuters'} = ${co2Saved} kg CO₂e & ${pmEmittedCut} g PM2.5 saved/week`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Passenger car vs. transit/walk CO₂e delta',
        value: `${round2(co2DeltaPerKm)} kg CO₂e/km`,
        kind: 'published_factor',
        source: 'UK DESNZ 2024 Greenhouse Gas Conversion Factors',
      },
      {
        label: 'Urban tailpipe + tyre/brake PM2.5 factor',
        value: `${CAR_PM25_G_PER_KM} g PM2.5/km`,
        kind: 'published_factor',
        source: 'EMEP/EEA urban passenger vehicle emission inventory',
      },
      {
        label: 'Weekly errand/commute distance shifted',
        value: `${weeklyKmPerCommuter} km/week per commuter`,
        kind: 'assumption',
        source: 'Typical urban short-trip consolidation estimate',
      },
    ],
  };
}

function calcCleanCooking(ctx: ImpactContext): ImpactBreakdown {
  const households = Math.max(1, Math.ceil(ctx.people / 4));
  const avoided = round1(110 * BREATHING_RATE_REST_M3_HR * 2 * ctx.people);
  const co2Saved = round1(14 * households);
  const pmCut = round1(18 * households);
  return {
    pm25AvoidedUgPerDay: avoided,
    co2eSavedKgPerWeek: co2Saved,
    pm25EmissionsPreventedGPerWeek: pmCut,
    formulaSummary: `Switching from solid fuel to LPG/induction avoids ~110 µg/m³ cooking exposure (${avoided} µg/day) and cuts ${pmCut} g PM2.5 + ${co2Saved} kg CO₂e/week across ${households} ${households === 1 ? 'kitchen' : 'kitchens'}`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Solid-fuel to clean-fuel kitchen PM2.5 reduction',
        value: '110 µg/m³ peak cut / 18 g/wk emitted',
        kind: 'published_factor',
        source: 'WHO Household Air Pollution & Clean Cooking Energy Guidelines',
      },
    ],
  };
}

function calcStopBurning(ctx: ImpactContext): ImpactBreakdown {
  const burnPilesAvoidedPerWeek = ctx.profile.audienceMode === 'community' ? 4 : 1;
  const co2Saved = round1(9.5 * burnPilesAvoidedPerWeek);
  const pmCut = round1(85 * burnPilesAvoidedPerWeek);
  return {
    pm25AvoidedUgPerDay: round1(35 * BREATHING_RATE_REST_M3_HR * 1.5 * ctx.people),
    co2eSavedKgPerWeek: co2Saved,
    pm25EmissionsPreventedGPerWeek: pmCut,
    formulaSummary: `Replacing ${burnPilesAvoidedPerWeek} open leaf/waste burn(s)/week with composting prevents ${pmCut} g local PM2.5 & ${co2Saved} kg CO₂e/week`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Open municipal/leaf waste PM2.5 emission factor',
        value: '~8.5 g PM2.5 per kg dry waste (~10 kg pile)',
        kind: 'published_factor',
        source: 'UNEP / IPCC Open Waste Burning Emission Factors',
      },
    ],
  };
}

function calcCleanCredit(ctx: ImpactContext): ImpactBreakdown {
  const households = Math.max(1, Math.ceil(ctx.people / 4));
  const co2Saved = round1(8.5 * households);
  const pmCut = round1(1.2 * households);
  return {
    pm25AvoidedUgPerDay: 0,
    co2eSavedKgPerWeek: co2Saved,
    pm25EmissionsPreventedGPerWeek: pmCut,
    formulaSummary: `Maintaining clean LPG/induction cooking & low-emission travel already saves ~${co2Saved} kg CO₂e & ${pmCut} g PM2.5/week`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Baseline clean-routine credit',
        value: '8.5 kg CO₂e/wk per household',
        kind: 'assumption',
        source: 'Comparison against mixed private-vehicle & smoky-fuel urban baseline',
      },
    ],
  };
}

export const EMISSION_IMPACT_CALCULATORS = {
  'low-emission-walk': (ctx) => calcLowEmissionMobility(ctx, 10, CAR_CO2E_KG_PER_KM),
  'low-emission-transit': (ctx) =>
    calcLowEmissionMobility(ctx, 25, CAR_CO2E_KG_PER_KM - TRANSIT_CO2E_KG_PER_KM),
  'low-emission-consolidate': (ctx) => calcLowEmissionMobility(ctx, 12, CAR_CO2E_KG_PER_KM),
  'sustain-clean-cooking': calcCleanCooking,
  'sustain-stop-burning': calcStopBurning,
  'sustain-clean-credit': calcCleanCredit,
} satisfies Record<string, ImpactCalculator>;