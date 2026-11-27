import { computeActionImpact, sumPlanImpactTotals } from '@/domain/air-quality/impact';
import { STRATEGY_REGISTRY } from '@/domain/air-quality/strategies/registry';
import {
  evaluateSafety,
  findCleanestAndWorstHours,
  SAFETY_DISCLAIMER,
} from '@/domain/air-quality/thresholds';
import type {
  AirQualitySnapshot,
  DailyActionItem,
  FamilyProfile,
  PlanImpactTotals,
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
  impactTotals: PlanImpactTotals;
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

function buildUnavailablePlan(
  snapshot: AirQualitySnapshot,
  profile: FamilyProfile
): DailyPlan {
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
      impact: computeActionImpact('indoor-no-smoke', snapshot, profile),
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
      impact: computeActionImpact('indoor-damp-clean', snapshot, profile),
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
      impact: computeActionImpact('low-emission-consolidate', snapshot, profile),
    },
  ];

  return {
    dailyHeadline:
      'Live AQI is unavailable right now—follow these low-cost indoor precautions and verify local advisories before outdoor exercise.',
    safety: null,
    actions,
    impactTotals: sumPlanImpactTotals(actions, profile),
    indoorAlternatives: profile.hasChildren
      ? [...FAMILY_INDOOR_ALTERNATIVES_WITH_KIDS]
      : [...GENERAL_INDOOR_ALTERNATIVES],
    disclaimer: SAFETY_DISCLAIMER,
    mode: 'deterministic',
  };
}

/**
 * Generates a deterministic, safety-compliant daily plan by evaluating every
 * registered strategy against verified AQI safety thresholds and household context.
 */
export function buildDeterministicPlan(
  snapshot: AirQualitySnapshot,
  profile: FamilyProfile
): DailyPlan {
  if (snapshot.aqi === null || snapshot.provenance === 'unavailable') {
    return buildUnavailablePlan(snapshot, profile);
  }

  const safety = evaluateSafety(snapshot.aqi, profile, snapshot.hourlyForecast);
  const hours = findCleanestAndWorstHours(snapshot.hourlyForecast);
  const context = {
    snapshot,
    profile,
    safety,
    hours,
    isCommunity: profile.audienceMode === 'community',
  };

  const actions = STRATEGY_REGISTRY.flatMap((strategy) => strategy.apply(context));

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
    impactTotals: sumPlanImpactTotals(actions, profile),
    indoorAlternatives,
    disclaimer: SAFETY_DISCLAIMER,
    mode: 'deterministic',
  };
}