import { evaluateSafety, SAFETY_DISCLAIMER } from '@/domain/air-quality/thresholds';
import type {
  AirQualitySnapshot,
  DailyActionItem,
  FamilyProfile,
  SafetyAssessment,
} from '@/domain/air-quality/types';

export interface FamilyAlternative {
  id: string;
  title: string;
  description: string;
  duration: string;
  ageNote: string;
  costNote: string;
}

export interface DailyPlan {
  dailyHeadline: string;
  safety: SafetyAssessment | null;
  actions: DailyActionItem[];
  indoorAlternatives: FamilyAlternative[];
  disclaimer: string;
  mode: 'deterministic' | 'ai_enhanced';
}

const FAMILY_INDOOR_ALTERNATIVES_WITH_KIDS: readonly FamilyAlternative[] = [
  {
    id: 'alt-indoor-movement',
    title: 'Living-Room Balance & Stretch Circuit',
    description:
      'Set up 4 quick stations (hallway tape-line balance walk, wall push-ups, animal stretches, and slow breathing) to burn energy without heavy panting.',
    duration: '20 min',
    ageNote: 'Ages 4–12 & parents',
    costNote: 'Free (masking tape or cushions)',
  },
  {
    id: 'alt-story-corner',
    title: 'Shared Story & Sketch Hour',
    description:
      'Pick a short chapter or folk tale, read aloud for 15 minutes, and have everyone draw their favorite scene on scrap paper.',
    duration: '30 min',
    ageNote: 'All ages',
    costNote: 'Free (paper & pencils)',
  },
  {
    id: 'alt-kitchen-science',
    title: 'No-Smoke Kitchen Prep Helper',
    description:
      'Involve children in washing fruit, assembling cold snacks, or sprouting lentils in a jar—avoiding smoky frying while keeping hands busy.',
    duration: '25 min',
    ageNote: 'Ages 5+',
    costNote: 'Everyday pantry items',
  },
  {
    id: 'alt-board-puzzles',
    title: 'Classic Tabletop & Word Games',
    description:
      'Rotate carrom, chess, ludo, jigsaw puzzles, or a 20-questions guessing game instead of passive screen scrolling.',
    duration: '30–45 min',
    ageNote: 'Whole family',
    costNote: 'Free / existing games',
  },
];

const GENERAL_INDOOR_ALTERNATIVES: readonly FamilyAlternative[] = [
  {
    id: 'alt-mobility-flow',
    title: 'Low-Intensity Indoor Mobility & Yoga',
    description:
      'Replace outdoor jogging with 20 minutes of gentle joint mobility and stretching indoors to keep breathing calm and exposure low.',
    duration: '20 min',
    ageNote: 'Teens & adults',
    costNote: 'Free',
  },
  {
    id: 'alt-reading-podcast',
    title: 'Evening Reading or Audio Unwind',
    description:
      'Swap an evening walk in heavy traffic haze for a book, podcast, or tabletop game night with warm herbal tea.',
    duration: '30–45 min',
    ageNote: 'Adults & teens',
    costNote: 'Free',
  },
];

function buildUnavailablePlan(profile: FamilyProfile): DailyPlan {
  const actions: DailyActionItem[] = [
    {
      id: 'unavail-check-local',
      title: 'Check local air conditions before outdoor play',
      whyItMatters:
        'Live AQI readings are currently unavailable for this location, so outdoor air conditions cannot be verified automatically.',
      howToDoIt:
        'Look for visible haze, smell for smoke, and check your municipal air-quality bulletin before scheduling vigorous outdoor activity.',
      whenLabel: 'Before heading out',
      timeSlot: 'morning',
      category: 'outdoor',
      isLowCost: true,
      source: 'deterministic',
    },
    {
      id: 'unavail-indoor-smoke',
      title: 'Keep indoor combustion sources off',
      whyItMatters:
        'Cooking fumes, incense, and candles can spike indoor PM2.5 sharply even when outdoor air is unknown.',
      howToDoIt:
        'Use a lid while cooking, switch on the kitchen exhaust fan, and skip incense or scented candles today.',
      whenLabel: 'During meals & evening',
      timeSlot: 'anytime',
      category: 'indoor_hack',
      isLowCost: true,
      source: 'deterministic',
    },
    {
      id: 'unavail-wet-clean',
      title: 'Use damp mopping instead of dry sweeping',
      whyItMatters:
        'Dry brooms and dusters kick settled fine particles back into breathing-level indoor air.',
      howToDoIt:
        'Wipe floors and tabletops with a lightly damp microfiber cloth or mop.',
      whenLabel: 'Daily tidy-up',
      timeSlot: 'midday',
      category: 'indoor_hack',
      isLowCost: true,
      source: 'deterministic',
    },
    {
      id: 'unavail-combine-errands',
      title: 'Combine short errands into one trip',
      whyItMatters:
        'Fewer vehicle trips cut neighborhood tailpipe emissions and lower your family’s roadside exposure.',
      howToDoIt:
        'Group grocery, pharmacy, and school drop-off errands together and turn off engines instead of idling.',
      whenLabel: 'Daytime errands',
      timeSlot: 'midday',
      category: 'low_emission',
      isLowCost: true,
      source: 'deterministic',
    },
  ];

  return {
    dailyHeadline:
      'Live AQI is unavailable right now—follow these low-cost indoor precautions and verify local advisories before outdoor exercise.',
    safety: null,
    actions,
    indoorAlternatives: profile.hasChildren
      ? [...FAMILY_INDOOR_ALTERNATIVES_WITH_KIDS]
      : [...GENERAL_INDOOR_ALTERNATIVES],
    disclaimer: SAFETY_DISCLAIMER,
    mode: 'deterministic',
  };
}

/**
 * Generates a deterministic, safety-compliant daily action plan grounded in
 * current AQI thresholds and household context.
 */
export function buildDeterministicPlan(
  snapshot: AirQualitySnapshot,
  profile: FamilyProfile
): DailyPlan {
  if (snapshot.aqi === null || snapshot.provenance === 'unavailable') {
    return buildUnavailablePlan(profile);
  }

  const safety = evaluateSafety(snapshot.aqi, profile, snapshot.hourlyForecast);
  const actions: DailyActionItem[] = [];

  // 1. Ventilation action (strictly context-aware — never blindly open windows)
  if (safety.ventilation === 'open_freely') {
    actions.push({
      id: 'vent-open',
      title: 'Refresh indoor rooms with cross-ventilation',
      whyItMatters:
        'Outdoor air is clean today, so opening opposite windows flushes out trapped indoor CO₂ and cooking particles.',
      howToDoIt:
        'Open windows on two opposite sides of the home for 20–30 minutes in the morning.',
      whenLabel: 'Morning (8–10 AM)',
      timeSlot: 'morning',
      category: 'indoor_hack',
      isLowCost: true,
      source: 'deterministic',
    });
  } else if (safety.ventilation === 'brief_cross_ventilation') {
    actions.push({
      id: 'vent-brief',
      title: 'Limit ventilation to a brief midday window',
      whyItMatters:
        'Winter pollution usually peaks in early morning and late evening due to cooler stagnant air near the ground.',
      howToDoIt:
        safety.saferWindowNote ??
        'Keep windows closed during rush hours; open briefly for 10–15 minutes only during cleaner midday hours.',
      whenLabel: 'Midday only',
      timeSlot: 'midday',
      category: 'indoor_hack',
      isLowCost: true,
      source: 'deterministic',
    });
  } else {
    actions.push({
      id: 'vent-close',
      title: 'Keep exterior windows and balcony doors closed',
      whyItMatters:
        'Opening windows while outdoor AQI is unhealthy pulls fine PM2.5 particles directly into living areas and bedrooms.',
      howToDoIt:
        'Shut road-facing windows tightly and place a damp or rolled towel along leaky door gaps if haze is heavy.',
      whenLabel: 'All day (especially morning & night)',
      timeSlot: 'morning',
      category: 'indoor_hack',
      isLowCost: true,
      source: 'deterministic',
    });
  }

  // 2. Outdoor activity guidance tailored to children and outdoor routine
  if (safety.outdoorKids === 'move_indoors') {
    actions.push({
      id: 'outdoor-shift-indoors',
      title: profile.hasChildren
        ? 'Swap outdoor park play for low-energy indoor activities'
        : 'Move outdoor exercise indoors today',
      whyItMatters:
        'Running and active play increase breathing rate, drawing deeper volumes of polluted air into lungs—especially for children.',
      howToDoIt:
        profile.hasChildren
          ? 'Pick one activity from the Indoor Alternatives below (like a living-room stretch circuit or story hour) during usual park time.'
          : 'Switch outdoor jogging or cycling to gentle indoor stretching or mobility exercises.',
      whenLabel:
        profile.typicalOutdoorTime === 'morning'
          ? 'Morning routine'
          : profile.typicalOutdoorTime === 'evening'
            ? 'Evening routine'
            : 'Usual outdoor time',
      timeSlot:
        profile.typicalOutdoorTime === 'morning'
          ? 'morning'
          : profile.typicalOutdoorTime === 'afternoon'
            ? 'midday'
            : 'evening',
      category: 'family_alternative',
      isLowCost: true,
      source: 'deterministic',
    });
  } else if (safety.outdoorKids === 'prefer_light_or_shorter') {
    actions.push({
      id: 'outdoor-shorten',
      title: 'Keep outdoor play shorter and away from busy roads',
      whyItMatters:
        'Sensitive family members can experience throat or eye irritation during extended vigorous activity at moderate-to-elevated AQI.',
      howToDoIt:
        'Cap active outdoor time to 20–30 minutes in a tree-lined park or courtyard rather than sidewalks next to idling traffic.',
      whenLabel: 'Midday / early afternoon',
      timeSlot: 'midday',
      category: 'outdoor',
      isLowCost: true,
      source: 'deterministic',
    });
  } else {
    actions.push({
      id: 'outdoor-enjoy',
      title: profile.hasChildren
        ? 'Make time for outdoor park play while air is clear'
        : 'Take advantage of clean air for outdoor movement',
      whyItMatters:
        'Clean winter air days are ideal for sunlight, active play, and safe outdoor exercise.',
      howToDoIt:
        'Head to a local park or quiet residential street away from main arterial traffic.',
      whenLabel: 'Morning or afternoon',
      timeSlot: profile.typicalOutdoorTime === 'morning' ? 'morning' : 'midday',
      category: 'outdoor',
      isLowCost: true,
      source: 'deterministic',
    });
  }

  // 3. Indoor air hacks (affordable first; optional purifier advice if available)
  actions.push({
    id: 'indoor-no-smoke',
    title: 'Pause incense, candles, and smoky indoor cooking',
    whyItMatters:
      'Burning incense sticks, mosquito coils, or high-smoke frying adds concentrated indoor PM2.5 right where your family breathes.',
    howToDoIt:
      'Use pot lids, switch on the kitchen exhaust hood while cooking, and choose steaming or simmering over deep-frying today.',
    whenLabel: 'Meal times & evening',
    timeSlot: 'evening',
    category: 'indoor_hack',
    isLowCost: true,
    source: 'deterministic',
  });

  if (safety.severityLevel >= 3) {
    actions.push({
      id: 'indoor-damp-clean',
      title: 'Damp-mop floors instead of dry sweeping',
      whyItMatters:
        'Dry brooms stir settled soot and dust back into the air for hours, especially at child height.',
      howToDoIt:
        'Use a wrung-out damp mop on floors and a damp cloth on bedroom surfaces; leave outdoor shoes near the entrance.',
      whenLabel: 'Afternoon tidy-up',
      timeSlot: 'midday',
      category: 'indoor_hack',
      isLowCost: true,
      source: 'deterministic',
    });
  }

  if (profile.hasAirPurifier && safety.severityLevel >= 3) {
    actions.push({
      id: 'indoor-purifier-bedroom',
      title: 'Pre-clean the bedroom with your air purifier before bedtime',
      whyItMatters:
        'Running filtration in a closed sleeping room gives your family 7–9 hours of lower-exposure recovery overnight.',
      howToDoIt:
        'Close bedroom doors and windows 60 minutes before bed, run the purifier on medium/high, and verify the pre-filter is free of dust.',
      whenLabel: '1 hour before bedtime',
      timeSlot: 'evening',
      category: 'indoor_hack',
      isLowCost: false,
      source: 'deterministic',
    });
  } else if (!profile.hasAirPurifier && safety.severityLevel >= 4) {
    actions.push({
      id: 'indoor-clean-room',
      title: 'Create a low-dust "clean bedroom" without extra gear',
      whyItMatters:
        'You do not need an expensive purifier to lower overnight exposure—reducing infiltration and indoor particles makes a real difference.',
      howToDoIt:
        'Keep one bedroom closed all afternoon, skip room sprays or agarbatti, wipe dust with a damp cloth, and change out of outdoor clothes upon returning home.',
      whenLabel: 'Before evening',
      timeSlot: 'evening',
      category: 'indoor_hack',
      isLowCost: true,
      source: 'deterministic',
    });
  }

  // 4. Low-emission routine (balanced strictly with health safety)
  if (safety.lowEmissionMobility === 'walk_or_cycle_safe') {
    actions.push({
      id: 'low-emission-walk',
      title: 'Walk or cycle for short neighborhood errands',
      whyItMatters:
        'Short car or scooter trips produce disproportionately high cold-engine emissions; today’s clean air makes active travel safe.',
      howToDoIt:
        'Pick side streets over main roads for errands under 2 km and carry a reusable bag.',
      whenLabel: 'Daytime errands',
      timeSlot: 'midday',
      category: 'low_emission',
      isLowCost: true,
      source: 'deterministic',
    });
  } else if (safety.lowEmissionMobility === 'short_walk_or_transit') {
    actions.push({
      id: 'low-emission-transit',
      title: 'Choose public transit or bundle errands off-peak',
      whyItMatters:
        'Combining trips cuts local exhaust emissions while limiting how long you spend beside heavy traffic.',
      howToDoIt:
        profile.primaryCommute === 'car_two_wheeler'
          ? 'Group errands into one midday loop, keep car ventilation on recirculate in traffic, and switch off your engine at long signals.'
          : 'Use metro/bus for longer trips and avoid walking alongside congested main roads during rush hour.',
      whenLabel: 'Commute & errands',
      timeSlot: 'midday',
      category: 'low_emission',
      isLowCost: true,
      source: 'deterministic',
    });
  } else {
    actions.push({
      id: 'low-emission-consolidate',
      title: 'Skip non-essential trips and avoid vehicle idling',
      whyItMatters:
        'Outdoor walking or cycling is unsafe in heavy pollution, so the healthiest low-emission move today is reducing trips altogether.',
      howToDoIt:
        'Postpone optional errands, carpool or use closed-window transit only when necessary, and never idle parked vehicles near school gates or homes.',
      whenLabel: 'Throughout the day',
      timeSlot: 'anytime',
      category: 'low_emission',
      isLowCost: true,
      source: 'deterministic',
    });
  }

  const indoorAlternatives =
    safety.outdoorKids === 'move_indoors' || safety.outdoorGeneral === 'move_indoors'
      ? profile.hasChildren
        ? [...FAMILY_INDOOR_ALTERNATIVES_WITH_KIDS]
        : [...GENERAL_INDOOR_ALTERNATIVES]
      : [];

  return {
    dailyHeadline: safety.summary,
    safety,
    actions,
    indoorAlternatives,
    disclaimer: SAFETY_DISCLAIMER,
    mode: 'deterministic',
  };
}