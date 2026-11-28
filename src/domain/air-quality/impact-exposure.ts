import type { ImpactBreakdown } from '@/domain/air-quality/types';
import {
  BREATHING_RATE_ACTIVE_M3_HR,
  BREATHING_RATE_REST_M3_HR,
  round1,
  round2,
  type ImpactCalculator,
  type ImpactContext,
} from '@/domain/air-quality/impact-constants';

function calcVentilationClosed(ctx: ImpactContext, hours: number, drop: number): ImpactBreakdown {
  const avoided = round1(ctx.pm25 * drop * BREATHING_RATE_REST_M3_HR * hours * ctx.people);
  return {
    pm25AvoidedUgPerDay: avoided,
    co2eSavedKgPerWeek: 0,
    pm25EmissionsPreventedGPerWeek: 0,
    formulaSummary: `${ctx.pm25} µg/m³ × ${Math.round(drop * 100)}% indoor infiltration cut × ${BREATHING_RATE_REST_M3_HR} m³/hr × ${hours} hrs × ${ctx.people} ${ctx.people === 1 ? 'person' : 'people'} = ${avoided} µg/day avoided`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Closed-window PM2.5 infiltration reduction',
        value: `${Math.round(drop * 100)}%`,
        kind: 'published_factor',
        source: 'US EPA Indoor Particulate Infiltration Guidance (typical closed-window I/O ratio)',
      },
      {
        label: 'Sedentary indoor breathing rate',
        value: `${BREATHING_RATE_REST_M3_HR} m³/hr`,
        kind: 'published_factor',
        source: 'US EPA Exposure Factors Handbook',
      },
      {
        label: 'Peak smog hours kept closed',
        value: `${hours} hrs/day`,
        kind: 'assumption',
        source: 'Typical winter morning & evening inversion window',
      },
    ],
  };
}

function calcOutdoorReduction(ctx: ImpactContext, hours: number, factor: number): ImpactBreakdown {
  const avoided = round1(ctx.pm25 * factor * BREATHING_RATE_ACTIVE_M3_HR * hours * ctx.people);
  return {
    pm25AvoidedUgPerDay: avoided,
    co2eSavedKgPerWeek: 0,
    pm25EmissionsPreventedGPerWeek: 0,
    formulaSummary: `${ctx.pm25} µg/m³ × ${Math.round(factor * 100)}% exposure cut × ${BREATHING_RATE_ACTIVE_M3_HR} m³/hr active breathing × ${hours} hr × ${ctx.people} = ${avoided} µg/day avoided`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Moderate outdoor activity ventilation rate',
        value: `${BREATHING_RATE_ACTIVE_M3_HR} m³/hr`,
        kind: 'published_factor',
        source: 'US EPA Exposure Factors Handbook (active play / brisk walk)',
      },
      {
        label: 'Indoor vs. street-level dose reduction',
        value: `${Math.round(factor * 100)}%`,
        kind: 'assumption',
        source: 'Moving from active outdoor play to low-exertion indoor space',
      },
    ],
  };
}

function calcIndoorNoSmoke(ctx: ImpactContext): ImpactBreakdown {
  const spikeUgM3 = 45;
  const hours = 2;
  const avoided = round1(spikeUgM3 * BREATHING_RATE_REST_M3_HR * hours * ctx.people);
  return {
    pm25AvoidedUgPerDay: avoided,
    co2eSavedKgPerWeek: 0,
    pm25EmissionsPreventedGPerWeek: round2(0.8 * Math.max(1, Math.ceil(ctx.people / 4))),
    formulaSummary: `${spikeUgM3} µg/m³ indoor smoke peak avoided × ${BREATHING_RATE_REST_M3_HR} m³/hr × ${hours} hrs × ${ctx.people} = ${avoided} µg/day avoided`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Indoor incense/frying PM2.5 spike avoided',
        value: `${spikeUgM3} µg/m³`,
        kind: 'published_factor',
        source: 'WHO Indoor Air Quality Guidelines (unvented combustion spikes)',
      },
      {
        label: 'Duration of post-smoke indoor lingering',
        value: `${hours} hrs/day`,
        kind: 'assumption',
        source: 'Closed-room winter decay window',
      },
    ],
  };
}

function calcIndoorDampClean(ctx: ImpactContext): ImpactBreakdown {
  const dustUgM3 = 18;
  const hours = 2;
  const avoided = round1(dustUgM3 * BREATHING_RATE_REST_M3_HR * hours * ctx.people);
  return {
    pm25AvoidedUgPerDay: avoided,
    co2eSavedKgPerWeek: 0,
    pm25EmissionsPreventedGPerWeek: 0,
    formulaSummary: `${dustUgM3} µg/m³ resuspended dust avoided × ${BREATHING_RATE_REST_M3_HR} m³/hr × ${hours} hrs × ${ctx.people} = ${avoided} µg/day avoided`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Dry-sweeping resuspension avoided',
        value: `${dustUgM3} µg/m³`,
        kind: 'assumption',
        source: 'Typical indoor particulate reduction switching broom to damp mop',
      },
    ],
  };
}

function calcOvernightBedroom(ctx: ImpactContext, usePurifier: boolean): ImpactBreakdown {
  const filtrationCut = usePurifier ? 0.55 : 0.25;
  const sleepHours = 8;
  const avoided = round1(
    ctx.pm25 * filtrationCut * BREATHING_RATE_REST_M3_HR * sleepHours * ctx.people
  );
  return {
    pm25AvoidedUgPerDay: avoided,
    co2eSavedKgPerWeek: 0,
    pm25EmissionsPreventedGPerWeek: 0,
    formulaSummary: `${ctx.pm25} µg/m³ × ${Math.round(filtrationCut * 100)}% overnight reduction × ${BREATHING_RATE_REST_M3_HR} m³/hr × ${sleepHours} hrs × ${ctx.people} = ${avoided} µg/day avoided`,
    factors: [
      ...ctx.baseFactors,
      {
        label: usePurifier ? 'HEPA clean-bedroom PM2.5 reduction' : 'Sealed low-dust bedroom reduction',
        value: `${Math.round(filtrationCut * 100)}%`,
        kind: usePurifier ? 'published_factor' : 'assumption',
        source: usePurifier
          ? 'US EPA Guide to Air Cleaners in the Home (50–65% closed-room CADR drop)'
          : 'Closed door/window + zero indoor combustion overnight assumption',
      },
    ],
  };
}

function calcCommunityStagger(ctx: ImpactContext): ImpactBreakdown {
  const avoided = round1(ctx.pm25 * 0.4 * BREATHING_RATE_ACTIVE_M3_HR * 0.75 * ctx.people);
  return {
    pm25AvoidedUgPerDay: avoided,
    co2eSavedKgPerWeek: round1(ctx.people * 0.4),
    pm25EmissionsPreventedGPerWeek: round2(ctx.people * 0.08),
    formulaSummary: `Moving ${ctx.people} participants indoors during peak smog + gate no-idling cuts ${avoided} µg/day combined PM2.5 dose`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Active breathing rate during outdoor assembly/sports',
        value: `${BREATHING_RATE_ACTIVE_M3_HR} m³/hr`,
        kind: 'published_factor',
        source: 'US EPA Exposure Factors Handbook',
      },
    ],
  };
}

function calcVentilationOpen(ctx: ImpactContext): ImpactBreakdown {
  const indoorBuildupFlushed = 12;
  const avoided = round1(indoorBuildupFlushed * BREATHING_RATE_REST_M3_HR * 2 * ctx.people);
  return {
    pm25AvoidedUgPerDay: avoided,
    co2eSavedKgPerWeek: 0,
    pm25EmissionsPreventedGPerWeek: 0,
    formulaSummary: `Flushing ~${indoorBuildupFlushed} µg/m³ trapped indoor particles via 20–30 min clean-air airing saves ~${avoided} µg/day across ${ctx.people}`,
    factors: [
      ...ctx.baseFactors,
      {
        label: 'Indoor particle buildup cleared on clean-air day',
        value: `${indoorBuildupFlushed} µg/m³`,
        kind: 'assumption',
        source: 'Typical occupied urban home indoor-outdoor dilution on Good AQI days',
      },
    ],
  };
}

export const EXPOSURE_IMPACT_CALCULATORS = {
  'vent-close': (ctx) => calcVentilationClosed(ctx, 6, 0.35),
  'vent-brief': (ctx) => calcVentilationClosed(ctx, 3, 0.25),
  'vent-open': calcVentilationOpen,
  'outdoor-shift-indoors': (ctx) => calcOutdoorReduction(ctx, 1, 0.5),
  'outdoor-shorten': (ctx) => calcOutdoorReduction(ctx, 0.5, 0.3),
  'indoor-no-smoke': calcIndoorNoSmoke,
  'indoor-damp-clean': calcIndoorDampClean,
  'indoor-purifier-bedroom': (ctx) => calcOvernightBedroom(ctx, true),
  'indoor-clean-room': (ctx) => calcOvernightBedroom(ctx, false),
  'community-stagger-advisory': calcCommunityStagger,
} satisfies Record<string, ImpactCalculator>;