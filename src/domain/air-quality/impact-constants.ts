import type {
  AirQualitySnapshot,
  FamilyProfile,
  ImpactBreakdown,
  ImpactFactorCitation,
} from '@/domain/air-quality/types';

// Published reference constants & transparent planning assumptions
export const BREATHING_RATE_REST_M3_HR = 0.5; // US EPA Exposure Factors Handbook (sedentary indoor)
export const BREATHING_RATE_ACTIVE_M3_HR = 1.6; // US EPA Exposure Factors Handbook (moderate outdoor)
export const CAR_CO2E_KG_PER_KM = 0.17; // UK DESNZ 2024 average passenger car conversion factor
export const TRANSIT_CO2E_KG_PER_KM = 0.04; // UK DESNZ 2024 urban rail/bus average per passenger-km
export const CAR_PM25_G_PER_KM = 0.025; // Exhaust + non-exhaust brake/tyre urban PM2.5 estimate
export const COMMUNITY_PARTICIPATION_RATE = 0.3; // Conservative 30% community adoption rate

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

export interface ImpactContext {
  pm25: number;
  people: number;
  profile: FamilyProfile;
  baseFactors: ImpactFactorCitation[];
}

export type ImpactCalculator = (ctx: ImpactContext) => ImpactBreakdown;

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round2(value: number): number {
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

export function buildCommunityBaseFactors(
  profile: FamilyProfile,
  people: number
): ImpactFactorCitation[] {
  if (profile.audienceMode !== 'community') {
    return [];
  }
  return [
    {
      label: 'Community participation rate',
      value: `30% of ${profile.communitySize} (${people} people)`,
      kind: 'assumption',
      source: 'Conservative neighbourhood adoption assumption',
    },
  ];
}