import type {
  AqiCategory,
  FamilyProfile,
  HourlyAqiPoint,
  SafetyAssessment,
} from './types';

export const SAFETY_DISCLAIMER =
  'AirNest provides general environmental exposure-reduction guidance, not medical advice. During severe pollution events, follow local official advisories and consult a qualified healthcare professional for health concerns.';

/**
 * Classifies a US AQI value (0-500+) into standard EPA categories.
 * Returns null if AQI is missing or invalid.
 */
export function classifyUsAqi(aqi: number | null | undefined): AqiCategory | null {
  if (typeof aqi !== 'number' || Number.isNaN(aqi) || aqi < 0) {
    return null;
  }
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy_sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very_unhealthy';
  return 'hazardous';
}

export function getCategoryLabel(category: AqiCategory): string {
  switch (category) {
    case 'good':
      return 'Good';
    case 'moderate':
      return 'Moderate';
    case 'unhealthy_sensitive':
      return 'Unhealthy for Sensitive Groups';
    case 'unhealthy':
      return 'Unhealthy';
    case 'very_unhealthy':
      return 'Very Unhealthy';
    case 'hazardous':
      return 'Hazardous';
  }
}

/**
 * Finds the lowest-AQI daytime window from hourly forecast data (06:00 - 20:00)
 * only when the best window is actually safe enough for brief ventilation or light activity (AQI <= 120).
 */
export function findSaferWindowNote(hourly?: HourlyAqiPoint[]): string | null {
  if (!hourly || hourly.length === 0) return null;

  const daytimePoints = hourly.filter((point) => {
    const date = new Date(point.isoTime);
    if (Number.isNaN(date.getTime())) return false;
    const hour = date.getHours();
    return hour >= 6 && hour <= 20 && Number.isFinite(point.aqi) && point.aqi >= 0;
  });

  if (daytimePoints.length === 0) return null;

  const best = daytimePoints.reduce((lowest, current) =>
    current.aqi < lowest.aqi ? current : lowest
  );

  if (best.aqi > 120) {
    return 'Forecast stays elevated throughout the day; keep outdoor time minimal and avoid opening windows for ventilation.';
  }

  const bestDate = new Date(best.isoTime);
  const formattedHour = bestDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `Cleaner air is projected around ${formattedHour} (estimated AQI ${Math.round(best.aqi)}), making it a better window for brief ventilation or errands.`;
}

/**
 * Deterministic safety-critical assessment.
 * AI recommendations MUST respect these guardrails (e.g., never recommend outdoor exercise
 * or opening windows when ventilation === 'keep_closed' or outdoorGeneral === 'move_indoors').
 */
export function evaluateSafety(
  aqi: number,
  profile: FamilyProfile,
  hourlyForecast?: HourlyAqiPoint[]
): SafetyAssessment {
  const category = classifyUsAqi(aqi);
  if (!category) {
    throw new RangeError(`Invalid AQI value: ${String(aqi)}`);
  }

  const hasSensitiveMembers =
    profile.hasChildren || profile.hasOlderAdults || profile.sensitivity === 'elevated';

  const saferWindowNote = findSaferWindowNote(hourlyForecast);

  switch (category) {
    case 'good':
      return {
        category,
        label: getCategoryLabel(category),
        severityLevel: 1,
        summary: 'Air quality is clean today. Normal outdoor play, walking, and natural ventilation are suitable.',
        outdoorKids: 'normal',
        outdoorGeneral: 'normal',
        ventilation: 'open_freely',
        lowEmissionMobility: 'walk_or_cycle_safe',
        recommendOfficialAdvisory: false,
        saferWindowNote: null,
      };

    case 'moderate':
      return {
        category,
        label: getCategoryLabel(category),
        severityLevel: 2,
        summary: hasSensitiveMembers
          ? 'Air quality is acceptable, though children or sensitive family members may feel mild irritation during long vigorous play.'
          : 'Air quality is acceptable for most everyday routines, including walking and brief ventilation.',
        outdoorKids: profile.sensitivity === 'elevated' ? 'prefer_light_or_shorter' : 'normal',
        outdoorGeneral: 'normal',
        ventilation: 'brief_cross_ventilation',
        lowEmissionMobility: 'walk_or_cycle_safe',
        recommendOfficialAdvisory: false,
        saferWindowNote,
      };

    case 'unhealthy_sensitive':
      return {
        category,
        label: getCategoryLabel(category),
        severityLevel: 3,
        summary: hasSensitiveMembers
          ? 'Pollution is elevated enough to affect children, older adults, and sensitive household members. Shift energetic play indoors.'
          : 'Outdoor pollution is noticeable. Shorten vigorous outdoor exercise and limit window opening to cleaner midday hours.',
        outdoorKids: 'move_indoors',
        outdoorGeneral: 'prefer_light_or_shorter',
        ventilation: 'brief_cross_ventilation',
        lowEmissionMobility: 'short_walk_or_transit',
        recommendOfficialAdvisory: false,
        saferWindowNote,
      };

    case 'unhealthy':
      return {
        category,
        label: getCategoryLabel(category),
        severityLevel: 4,
        summary:
          'Air quality is unhealthy for everyone. Move children’s play indoors, keep windows closed, and avoid outdoor exercise.',
        outdoorKids: 'move_indoors',
        outdoorGeneral: 'move_indoors',
        ventilation: 'keep_closed',
        lowEmissionMobility: 'avoid_outdoor_exertion_use_transit_or_combine_trips',
        recommendOfficialAdvisory: false,
        saferWindowNote,
      };

    case 'very_unhealthy':
      return {
        category,
        label: getCategoryLabel(category),
        severityLevel: 5,
        summary:
          'Heavy pollution levels today. Keep windows and doors closed, move all family activities indoors, and cut indoor smoke sources.',
        outdoorKids: 'move_indoors',
        outdoorGeneral: 'move_indoors',
        ventilation: 'keep_closed',
        lowEmissionMobility: 'avoid_outdoor_exertion_use_transit_or_combine_trips',
        recommendOfficialAdvisory: true,
        saferWindowNote,
      };

    case 'hazardous':
      return {
        category,
        label: getCategoryLabel(category),
        severityLevel: 6,
        summary:
          'Severe air pollution alert. Stay indoors as much as possible, seal drafts, avoid all indoor combustion, and follow local official advisories.',
        outdoorKids: 'move_indoors',
        outdoorGeneral: 'move_indoors',
        ventilation: 'keep_closed',
        lowEmissionMobility: 'avoid_outdoor_exertion_use_transit_or_combine_trips',
        recommendOfficialAdvisory: true,
        saferWindowNote,
      };
  }
}