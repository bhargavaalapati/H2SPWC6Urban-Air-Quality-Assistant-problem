import type {
  AirQualitySnapshot,
  DailyActionItem,
  FamilyProfile,
  ImpactBreakdown,
  ImpactFactorCitation,
  PlanImpactTotals,
} from '@/domain/air-quality/types';

// Published reference constants & transparent planning assumptions
const BREATHING_RATE_REST_M3_HR = 0.5; // US EPA Exposure Factors Handbook (light indoor/sedentary average)
const BREATHING_RATE_ACTIVE_M3_HR = 1.6; // US EPA Exposure Factors Handbook (moderate outdoor activity)
const CAR_CO2E_KG_PER_KM = 0.17; // UK DESNZ 2024 average petrol/hybrid passenger car conversion factor
const TRANSIT_CO2E_KG_PER_KM = 0.04; // UK DESNZ 2024 urban rail/bus average per passenger-km
const CAR_PM25_G_PER_KM = 0.025; // Exhaust + non-exhaust brake/tyre urban PM2.5 estimate
const COMMUNITY_PARTICIPATION_RATE = 0.3; // Conservative 30% participation rate for RWA/school/neighbourhood programs

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Estimates effective ambient PM2.5 (µg/m³) from sensor/model PM2.5,
 * or conservatively from US AQI if PM2.5 is missing.
 */
export function resolveEffectivePm25(snapshot: AirQualitySnapshot): number {
  if (typeof snapshot.pollutants.pm25 === 'number' && snapshot.pollutants.pm25 >= 0) {
    return snapshot.pollutants.pm25;
  }
  if (typeof snapshot.aqi === 'number' && snapshot.aqi >= 0) {
    if (snapshot.aqi <= 50) return round1((snapshot.aqi / 50) * 12);
    if (snapshot.aqi <= 100) return round1(12 + ((snapshot.aqi - 50) / 50) * 23.4);
    if (snapshot.aqi <= 150) return round1(35.5 + ((snapshot.aqi - 100) / 50) * 19.9);
    if (snapshot.aqi <= 200) return round1(55.5 + ((snapshot.aqi - 150) / 50) * 94.9);
    return round1(150.5 + ((snapshot.aqi - 200) / 100) * 100);
  }
  return 0;
}

export function getEffectivePeopleCount(profile: FamilyProfile): {
  people: number;
  label: string;
} {
  if (profile.audienceMode === 'community') {
    const activeParticipants = Math.max(
      2,
      Math.round(profile.communitySize * COMMUNITY_PARTICIPATION_RATE)
    );
    const groupTitle =
      profile.communityType === 'school'
        ? 'school community'
        : profile.communityType === 'rwa'
          ? 'RWA residents'
          : 'neighbourhood group';
    return {
      people: activeParticipants,
      label: `${activeParticipants} active participants (30% of ${profile.communitySize.toLocaleString()} ${groupTitle})`,
    };
  }
  return {
    people: profile.householdSize,
    label: `${profile.householdSize} household ${profile.householdSize === 1 ? 'member' : 'members'}`,
  };
}

export type ImpactStrategyId =
  | 'vent-close'
  | 'vent-brief'
  | 'vent-open'
  | 'outdoor-shift-indoors'
  | 'outdoor-shorten'
  | 'indoor-no-smoke'
  | 'indoor-damp-clean'
  | 'indoor-purifier-bedroom'
  | 'indoor-clean-room'
  | 'low-emission-walk'
  | 'low-emission-transit'
  | 'low-emission-consolidate'
  | 'sustain-clean-cooking'
  | 'sustain-stop-burning'
  | 'sustain-clean-credit'
  | 'community-stagger-advisory';

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
  const factors: ImpactFactorCitation[] = [];

  if (profile.audienceMode === 'community') {
    factors.push({
      label: 'Community participation rate',
      value: `30% of ${profile.communitySize} (${people} people)`,
      kind: 'assumption',
      source: 'Conservative neighbourhood adoption assumption',
    });
  }

  switch (strategyId) {
    case 'vent-close':
    case 'vent-brief': {
      const hours = strategyId === 'vent-close' ? 6 : 3;
      const infiltrationDrop = strategyId === 'vent-close' ? 0.35 : 0.25;
      const avoided = round1(pm25 * infiltrationDrop * BREATHING_RATE_REST_M3_HR * hours * people);
      return {
        pm25AvoidedUgPerDay: avoided,
        co2eSavedKgPerWeek: 0,
        pm25EmissionsPreventedGPerWeek: 0,
        formulaSummary: `${pm25} µg/m³ × ${Math.round(infiltrationDrop * 100)}% indoor infiltration cut × ${BREATHING_RATE_REST_M3_HR} m³/hr × ${hours} hrs × ${people} ${people === 1 ? 'person' : 'people'} = ${avoided} µg/day avoided`,
        factors: [
          ...factors,
          {
            label: 'Closed-window PM2.5 infiltration reduction',
            value: `${Math.round(infiltrationDrop * 100)}%`,
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

    case 'outdoor-shift-indoors':
    case 'outdoor-shorten': {
      const hours = strategyId === 'outdoor-shift-indoors' ? 1 : 0.5;
      const reductionFactor = strategyId === 'outdoor-shift-indoors' ? 0.5 : 0.3;
      const avoided = round1(
        pm25 * reductionFactor * BREATHING_RATE_ACTIVE_M3_HR * hours * people
      );
      return {
        pm25AvoidedUgPerDay: avoided,
        co2eSavedKgPerWeek: 0,
        pm25EmissionsPreventedGPerWeek: 0,
        formulaSummary: `${pm25} µg/m³ × ${Math.round(reductionFactor * 100)}% exposure cut × ${BREATHING_RATE_ACTIVE_M3_HR} m³/hr active breathing × ${hours} hr × ${people} = ${avoided} µg/day avoided`,
        factors: [
          ...factors,
          {
            label: 'Moderate outdoor activity ventilation rate',
            value: `${BREATHING_RATE_ACTIVE_M3_HR} m³/hr`,
            kind: 'published_factor',
            source: 'US EPA Exposure Factors Handbook (active play / brisk walk)',
          },
          {
            label: 'Indoor vs. street-level dose reduction',
            value: `${Math.round(reductionFactor * 100)}%`,
            kind: 'assumption',
            source: 'Moving from active outdoor play to low-exertion indoor space',
          },
        ],
      };
    }

    case 'indoor-no-smoke': {
      const indoorSpikeAvoidedUgM3 = 45;
      const hours = 2;
      const avoided = round1(
        indoorSpikeAvoidedUgM3 * BREATHING_RATE_REST_M3_HR * hours * people
      );
      return {
        pm25AvoidedUgPerDay: avoided,
        co2eSavedKgPerWeek: 0,
        pm25EmissionsPreventedGPerWeek: round2(0.8 * Math.max(1, Math.ceil(people / 4))),
        formulaSummary: `${indoorSpikeAvoidedUgM3} µg/m³ indoor smoke peak avoided × ${BREATHING_RATE_REST_M3_HR} m³/hr × ${hours} hrs × ${people} = ${avoided} µg/day avoided`,
        factors: [
          ...factors,
          {
            label: 'Indoor incense/frying PM2.5 spike avoided',
            value: `${indoorSpikeAvoidedUgM3} µg/m³`,
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

    case 'indoor-damp-clean': {
      const dustAvoidedUgM3 = 18;
      const hours = 2;
      const avoided = round1(dustAvoidedUgM3 * BREATHING_RATE_REST_M3_HR * hours * people);
      return {
        pm25AvoidedUgPerDay: avoided,
        co2eSavedKgPerWeek: 0,
        pm25EmissionsPreventedGPerWeek: 0,
        formulaSummary: `${dustAvoidedUgM3} µg/m³ resuspended dust avoided × ${BREATHING_RATE_REST_M3_HR} m³/hr × ${hours} hrs × ${people} = ${avoided} µg/day avoided`,
        factors: [
          ...factors,
          {
            label: 'Dry-sweeping resuspension avoided',
            value: `${dustAvoidedUgM3} µg/m³`,
            kind: 'assumption',
            source: 'Typical indoor particulate reduction switching broom to damp mop',
          },
        ],
      };
    }

    case 'indoor-purifier-bedroom':
    case 'indoor-clean-room': {
      const filtrationCut = strategyId === 'indoor-purifier-bedroom' ? 0.55 : 0.25;
      const sleepHours = 8;
      const avoided = round1(
        pm25 * filtrationCut * BREATHING_RATE_REST_M3_HR * sleepHours * people
      );
      return {
        pm25AvoidedUgPerDay: avoided,
        co2eSavedKgPerWeek: 0,
        pm25EmissionsPreventedGPerWeek: 0,
        formulaSummary: `${pm25} µg/m³ × ${Math.round(filtrationCut * 100)}% overnight reduction × ${BREATHING_RATE_REST_M3_HR} m³/hr × ${sleepHours} hrs × ${people} = ${avoided} µg/day avoided`,
        factors: [
          ...factors,
          {
            label:
              strategyId === 'indoor-purifier-bedroom'
                ? 'HEPA clean-bedroom PM2.5 reduction'
                : 'Sealed low-dust bedroom reduction',
            value: `${Math.round(filtrationCut * 100)}%`,
            kind: strategyId === 'indoor-purifier-bedroom' ? 'published_factor' : 'assumption',
            source:
              strategyId === 'indoor-purifier-bedroom'
                ? 'US EPA Guide to Air Cleaners in the Home (50–65% closed-room CADR drop)'
                : 'Closed door/window + zero indoor combustion overnight assumption',
          },
        ],
      };
    }

    case 'low-emission-walk':
    case 'low-emission-transit':
    case 'low-emission-consolidate': {
      const weeklyKmReplacedPerPerson =
        strategyId === 'low-emission-transit'
          ? 25
          : strategyId === 'low-emission-walk'
            ? 10
            : 12;
      const co2DeltaPerKm =
        strategyId === 'low-emission-transit'
          ? CAR_CO2E_KG_PER_KM - TRANSIT_CO2E_KG_PER_KM
          : CAR_CO2E_KG_PER_KM;
      const commuterCount = Math.max(1, Math.round(people * 0.5));
      const co2Saved = round1(weeklyKmReplacedPerPerson * co2DeltaPerKm * commuterCount);
      const pmEmittedCut = round2(weeklyKmReplacedPerPerson * CAR_PM25_G_PER_KM * commuterCount);
      return {
        pm25AvoidedUgPerDay: 0,
        co2eSavedKgPerWeek: co2Saved,
        pm25EmissionsPreventedGPerWeek: pmEmittedCut,
        formulaSummary: `${weeklyKmReplacedPerPerson} km/wk × ${round2(co2DeltaPerKm)} kg CO₂e/km × ${commuterCount} ${commuterCount === 1 ? 'commuter' : 'commuters'} = ${co2Saved} kg CO₂e & ${pmEmittedCut} g PM2.5 saved/week`,
        factors: [
          ...factors,
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
            value: `${weeklyKmReplacedPerPerson} km/week per commuter`,
            kind: 'assumption',
            source: 'Typical urban short-trip consolidation estimate',
          },
        ],
      };
    }

    case 'sustain-clean-cooking': {
      const households = Math.max(1, Math.ceil(people / 4));
      const avoided = round1(110 * BREATHING_RATE_REST_M3_HR * 2 * people);
      const co2Saved = round1(14 * households);
      const pmCut = round1(18 * households);
      return {
        pm25AvoidedUgPerDay: avoided,
        co2eSavedKgPerWeek: co2Saved,
        pm25EmissionsPreventedGPerWeek: pmCut,
        formulaSummary: `Switching from solid fuel to LPG/induction avoids ~110 µg/m³ cooking exposure (${avoided} µg/day) and cuts ${pmCut} g PM2.5 + ${co2Saved} kg CO₂e/week across ${households} ${households === 1 ? 'kitchen' : 'kitchens'}`,
        factors: [
          ...factors,
          {
            label: 'Solid-fuel to clean-fuel kitchen PM2.5 reduction',
            value: '110 µg/m³ peak cut / 18 g/wk emitted',
            kind: 'published_factor',
            source: 'WHO Household Air Pollution & Clean Cooking Energy Guidelines',
          },
        ],
      };
    }

    case 'sustain-stop-burning': {
      const burnPilesAvoidedPerWeek = profile.audienceMode === 'community' ? 4 : 1;
      const co2Saved = round1(9.5 * burnPilesAvoidedPerWeek);
      const pmCut = round1(85 * burnPilesAvoidedPerWeek);
      return {
        pm25AvoidedUgPerDay: round1(35 * BREATHING_RATE_REST_M3_HR * 1.5 * people),
        co2eSavedKgPerWeek: co2Saved,
        pm25EmissionsPreventedGPerWeek: pmCut,
        formulaSummary: `Replacing ${burnPilesAvoidedPerWeek} open leaf/waste burn(s)/week with composting prevents ${pmCut} g local PM2.5 & ${co2Saved} kg CO₂e/week`,
        factors: [
          ...factors,
          {
            label: 'Open municipal/leaf waste PM2.5 emission factor',
            value: '~8.5 g PM2.5 per kg dry waste (~10 kg pile)',
            kind: 'published_factor',
            source: 'UNEP / IPCC Open Waste Burning Emission Factors',
          },
        ],
      };
    }

    case 'sustain-clean-credit': {
      const households = Math.max(1, Math.ceil(people / 4));
      const co2Saved = round1(8.5 * households);
      const pmCut = round1(1.2 * households);
      return {
        pm25AvoidedUgPerDay: 0,
        co2eSavedKgPerWeek: co2Saved,
        pm25EmissionsPreventedGPerWeek: pmCut,
        formulaSummary: `Maintaining clean LPG/induction cooking & low-emission travel already saves ~${co2Saved} kg CO₂e & ${pmCut} g PM2.5/week`,
        factors: [
          ...factors,
          {
            label: 'Baseline clean-routine credit',
            value: '8.5 kg CO₂e/wk per household',
            kind: 'assumption',
            source: 'Comparison against mixed private-vehicle & smoky-fuel urban baseline',
          },
        ],
      };
    }

    case 'community-stagger-advisory': {
      const avoided = round1(pm25 * 0.4 * BREATHING_RATE_ACTIVE_M3_HR * 0.75 * people);
      return {
        pm25AvoidedUgPerDay: avoided,
        co2eSavedKgPerWeek: round1(people * 0.4),
        pm25EmissionsPreventedGPerWeek: round2(people * 0.08),
        formulaSummary: `Moving ${people} participants indoors during peak smog + gate no-idling cuts ${avoided} µg/day combined PM2.5 dose`,
        factors: [
          ...factors,
          {
            label: 'Active breathing rate during outdoor assembly/sports',
            value: `${BREATHING_RATE_ACTIVE_M3_HR} m³/hr`,
            kind: 'published_factor',
            source: 'US EPA Exposure Factors Handbook',
          },
        ],
      };
    }

    case 'vent-open':
    default: {
      const indoorBuildupFlushed = 12;
      const avoided = round1(indoorBuildupFlushed * BREATHING_RATE_REST_M3_HR * 2 * people);
      return {
        pm25AvoidedUgPerDay: avoided,
        co2eSavedKgPerWeek: 0,
        pm25EmissionsPreventedGPerWeek: 0,
        formulaSummary: `Flushing ~${indoorBuildupFlushed} µg/m³ trapped indoor particles via 20–30 min clean-air airing saves ~${avoided} µg/day across ${people}`,
        factors: [
          ...factors,
          {
            label: 'Indoor particle buildup cleared on clean-air day',
            value: `${indoorBuildupFlushed} µg/m³`,
            kind: 'assumption',
            source: 'Typical occupied urban home indoor-outdoor dilution on Good AQI days',
          },
        ],
      };
    }
  }
}

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