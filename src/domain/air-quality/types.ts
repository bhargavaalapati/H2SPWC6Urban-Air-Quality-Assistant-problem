export type DataProvenance = 'live' | 'delayed' | 'demo' | 'unavailable';

export type AqiCategory =
  | 'good'
  | 'moderate'
  | 'unhealthy_sensitive'
  | 'unhealthy'
  | 'very_unhealthy'
  | 'hazardous';

export type SensitivityLevel = 'standard' | 'elevated';

export type AudienceMode = 'household' | 'community';

export type CommunityType = 'rwa' | 'school' | 'neighbourhood';

export type CookingFuelType = 'lpg_induction' | 'mixed_or_solid';

export type VentilationGuidance =
  | 'open_freely'
  | 'brief_cross_ventilation'
  | 'keep_closed';

export type OutdoorActivityGuidance =
  | 'normal'
  | 'prefer_light_or_shorter'
  | 'move_indoors';

export type LowEmissionMobilityGuidance =
  | 'walk_or_cycle_safe'
  | 'short_walk_or_transit'
  | 'avoid_outdoor_exertion_use_transit_or_combine_trips';

export interface LocationInfo {
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface PollutantReadings {
  pm25: number | null; // µg/m³
  pm10: number | null; // µg/m³
  no2?: number | null; // µg/m³
  o3?: number | null; // µg/m³
}

export interface HourlyAqiPoint {
  isoTime: string;
  aqi: number;
}

export interface AirQualitySnapshot {
  location: LocationInfo;
  aqi: number | null; // US AQI 0-500
  category: AqiCategory | null;
  pollutants: PollutantReadings;
  observedAt: string | null; // ISO-8601 timestamp
  provenance: DataProvenance;
  sourceLabel: string;
  hourlyForecast?: HourlyAqiPoint[];
  demoScenarioId?: string;
}

export interface FamilyProfile {
  audienceMode: AudienceMode;
  householdSize: number;
  communityType: CommunityType;
  communitySize: number;
  hasChildren: boolean;
  hasOlderAdults: boolean;
  sensitivity: SensitivityLevel;
  hasAirPurifier: boolean;
  cookingFuel: CookingFuelType;
  openWasteBurningNearby: boolean;
  typicalOutdoorTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
  primaryCommute: 'walk_cycle' | 'public_transit' | 'car_two_wheeler' | 'work_from_home';
}

export interface ImpactFactorCitation {
  label: string;
  value: string;
  kind: 'published_factor' | 'assumption';
  source: string;
}

export interface ImpactBreakdown {
  pm25AvoidedUgPerDay: number;
  co2eSavedKgPerWeek: number;
  pm25EmissionsPreventedGPerWeek: number;
  formulaSummary: string;
  factors: ImpactFactorCitation[];
}

export interface PlanImpactTotals {
  pm25AvoidedUgPerDay: number;
  co2eSavedKgPerWeek: number;
  pm25EmissionsPreventedGPerWeek: number;
  peopleCovered: number;
  audienceLabel: string;
}

export interface SafetyAssessment {
  category: AqiCategory;
  label: string;
  severityLevel: 1 | 2 | 3 | 4 | 5 | 6;
  summary: string;
  outdoorKids: OutdoorActivityGuidance;
  outdoorGeneral: OutdoorActivityGuidance;
  ventilation: VentilationGuidance;
  lowEmissionMobility: LowEmissionMobilityGuidance;
  recommendOfficialAdvisory: boolean;
  saferWindowNote: string | null;
}

export type ActionTimeSlot = 'morning' | 'midday' | 'evening' | 'anytime';

export type ActionCategory =
  | 'outdoor'
  | 'indoor_hack'
  | 'low_emission'
  | 'sustainable_alternative'
  | 'family_alternative';

export interface DailyActionItem {
  id: string;
  title: string;
  whyItMatters: string;
  howToDoIt: string;
  whenLabel: string;
  timeSlot: ActionTimeSlot;
  category: ActionCategory;
  isLowCost: boolean;
  source: 'deterministic' | 'ai_personalized';
  impact?: ImpactBreakdown;
  calendarUrl?: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  subtitle: string;
  snapshot: AirQualitySnapshot;
}