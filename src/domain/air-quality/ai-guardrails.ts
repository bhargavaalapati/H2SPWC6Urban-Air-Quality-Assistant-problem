import { z } from 'zod';
import { aiPlanResponseSchema, familyProfileSchema } from '@/domain/air-quality/schemas';
import { evaluateSafety, SAFETY_DISCLAIMER } from '@/domain/air-quality/thresholds';
import type {
  AirQualitySnapshot,
  DailyActionItem,
  FamilyProfile,
  SafetyAssessment,
} from '@/domain/air-quality/types';
import { verifyNumberFirewall } from '@/domain/air-quality/number-firewall';

export const snapshotPayloadSchema = z.object({
  location: z.object({
    name: z.string().min(1).max(120),
    region: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  aqi: z.number().min(0).max(500).nullable(),
  category: z
    .enum([
      'good',
      'moderate',
      'unhealthy_sensitive',
      'unhealthy',
      'very_unhealthy',
      'hazardous',
    ])
    .nullable(),
  pollutants: z.object({
    pm25: z.number().min(0).nullable(),
    pm10: z.number().min(0).nullable(),
    no2: z.number().min(0).nullable().optional(),
    o3: z.number().min(0).nullable().optional(),
  }),
  observedAt: z.string().nullable(),
  provenance: z.enum(['live', 'delayed', 'demo', 'unavailable']),
  sourceLabel: z.string().min(1).max(160),
  hourlyForecast: z
    .array(
      z.object({
        isoTime: z.string(),
        aqi: z.number().min(0).max(500),
      })
    )
    .max(48)
    .optional(),
  demoScenarioId: z.string().max(80).optional(),
});

export const planRequestSchema = z.object({
  snapshot: snapshotPayloadSchema,
  profile: familyProfileSchema,
  preferAi: z.boolean().optional().default(true),
});

export const aiAssistantStructuredSchema = z.object({
  answer: z.string().min(10).max(1600),
  practicalSteps: z.array(z.string().min(4).max(350)).min(1).max(6),
  uncertaintyNote: z.string().max(400).nullish(),
});

export type AssistantResponseMode = 'ai' | 'deterministic_fallback';

export interface AssistantReply {
  answer: string;
  practicalSteps: string[];
  dataNote: string;
  disclaimer: string;
  responseMode: AssistantResponseMode;
  fallbackReason?: string;
}

const UNSAFE_OPEN_WINDOW_PATTERNS = [
  /\bopen\s+(?:the\s+|your\s+)?windows?\b/i,
  /\bair\s+out\s+(?:the\s+|your\s+)?(?:house|home|room|bedroom)\b/i,
  /\bcross[- ]?ventilat(?:e|ion)\b/i,
];

const UNSAFE_OUTDOOR_EXERTION_PATTERNS = [
  /\b(?:go\s+for\s+a\s+)?(?:jog|run|running|cycling|bike\s+ride)\s+outdoors?\b/i,
  /\blet\s+(?:the\s+)?(?:kids|children)\s+play\s+outside\b/i,
  /\bhead\s+to\s+the\s+park\b/i,
  /\bwalk\s+or\s+cycle\b/i,
];

const NEGATION_PREFIX_PATTERNS = [
  /\b(?:do\s+not|don't|avoid|skip|never|instead\s+of|rather\s+than|unsafe\s+to|shouldn't|should\s+not)\b/i,
  /\bif\s+you\s+open\b/i,
  /\bopening\s+(?:the\s+|your\s+)?windows?\s+(?:pulls|lets|brings|allows|can\s+let|will\s+let)\b/i,
];

function containsUnsafeAffirmativeAdvice(text: string, patterns: RegExp[]): boolean {
  const sentences = text.split(/[.!?;]+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    const matchesUnsafe = patterns.some((pattern) => pattern.test(trimmed));
    if (!matchesUnsafe) continue;
    const isNegated = NEGATION_PREFIX_PATTERNS.some((neg) => neg.test(trimmed));
    if (!isNegated) {
      return true;
    }
  }
  return false;
}

/**
 * Verifies a single AI-generated text or action against deterministic safety rules.
 * Returns a rejection reason string if unsafe, or null if compliant.
 */
export function checkTextAgainstSafety(
  text: string,
  safety: SafetyAssessment | null
): string | null {
  if (!safety) return null;

  if (
    safety.ventilation === 'keep_closed' &&
    containsUnsafeAffirmativeAdvice(text, UNSAFE_OPEN_WINDOW_PATTERNS)
  ) {
    return 'Suggested opening windows while deterministic rules require keeping windows closed.';
  }

  if (
    safety.outdoorGeneral === 'move_indoors' &&
    containsUnsafeAffirmativeAdvice(text, UNSAFE_OUTDOOR_EXERTION_PATTERNS)
  ) {
    return 'Suggested outdoor exercise/play while deterministic rules require moving activities indoors.';
  }

  return null;
}

/**
 * Validates raw JSON from the LLM for daily plan enhancement, enforces the
 * server-side number firewall against computed facts, and strips any action
 * that violates deterministic safety constraints.
 */
export function validateAndFilterAiPlan(
  rawJson: unknown,
  safety: SafetyAssessment | null,
  allowedFacts?: unknown
): { dailyHeadline: string; actions: DailyActionItem[] } | null {
  const parsed = aiPlanResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    return null;
  }

  if (checkTextAgainstSafety(parsed.data.dailyHeadline, safety)) {
    return null;
  }

  if (allowedFacts !== undefined) {
    const headlineCheck = verifyNumberFirewall(parsed.data.dailyHeadline, allowedFacts);
    if (!headlineCheck.passed) {
      return null;
    }
  }

  const safeActions: DailyActionItem[] = [];
  for (const item of parsed.data.actions) {
    const combined = `${item.title}. ${item.whyItMatters}. ${item.howToDoIt}`;
    if (checkTextAgainstSafety(combined, safety)) {
      continue;
    }
    if (allowedFacts !== undefined && !verifyNumberFirewall(combined, allowedFacts).passed) {
      continue;
    }
    safeActions.push({
      ...item,
      source: 'ai_personalized',
    });
  }

  if (safeActions.length < 3) {
    return null;
  }

  return {
    dailyHeadline: parsed.data.dailyHeadline,
    actions: safeActions,
  };
}

export function buildProvenanceNote(snapshot: AirQualitySnapshot): string {
  if (snapshot.provenance === 'unavailable' || snapshot.aqi === null) {
    return `Live air-quality readings for ${snapshot.location.name} are currently unavailable. This guidance is general exposure-reduction advice, not a live measurement.`;
  }
  if (snapshot.provenance === 'demo') {
    return `Based on a clearly labeled Demo Scenario for ${snapshot.location.name} (Simulated AQI ${snapshot.aqi}, PM2.5 ${snapshot.pollutants.pm25 ?? 'N/A'} µg/m³)—not live sensor data.`;
  }
  if (snapshot.provenance === 'delayed') {
    return `Based on delayed Open-Meteo data for ${snapshot.location.name} (AQI ${snapshot.aqi}, recorded ${snapshot.observedAt ?? 'earlier'}). Check local updates if conditions look hazier.`;
  }
  return `Based on current Open-Meteo data for ${snapshot.location.name} (AQI ${snapshot.aqi}, PM2.5 ${snapshot.pollutants.pm25 ?? 'N/A'} µg/m³).`;
}

/**
 * Deterministic, honest fallback for the conversational assistant when Gemini
 * is not configured, times out, or returns an unsafe/unparseable response.
 */
export function buildDeterministicAssistantReply(
  question: string,
  snapshot: AirQualitySnapshot,
  profile: FamilyProfile,
  fallbackReason?: string
): AssistantReply {
  const q = question.toLowerCase();
  const dataNote = buildProvenanceNote(snapshot);

  if (snapshot.aqi === null || snapshot.provenance === 'unavailable') {
    return {
      answer: `I don't have current AQI readings for ${snapshot.location.name} right now, so I can't confirm whether outdoor air is safe. Until you verify a local official bulletin, treat hazy or smoky air cautiously and focus on keeping indoor air clean.`,
      practicalSteps: [
        'Check your local city pollution board or look for visible haze/smoke before sending children out to play.',
        'Avoid indoor smoke sources such as incense, candles, and smoky frying, and switch on the kitchen exhaust fan.',
        'Damp-mop floors instead of dry sweeping so settled dust does not circulate indoors.',
      ],
      dataNote,
      disclaimer: SAFETY_DISCLAIMER,
      responseMode: 'deterministic_fallback',
      fallbackReason,
    };
  }

  const safety = evaluateSafety(snapshot.aqi, profile, snapshot.hourlyForecast);

  if (q.includes('window') || q.includes('ventilat') || q.includes('fresh air')) {
    if (safety.ventilation === 'keep_closed') {
      return {
        answer: `Keep windows closed right now. At AQI ${snapshot.aqi} (${safety.label}), opening windows pulls fine particles indoors faster than it clears stale room air.`,
        practicalSteps: [
          'Keep road-facing windows and balcony doors shut, especially during morning and evening inversion hours.',
          'Run your kitchen exhaust fan only while cooking with lids on, and pause incense or candles.',
          profile.hasAirPurifier
            ? 'Run your air purifier in the main living room or bedroom with doors closed.'
            : 'Seal noticeable door drafts with a rolled towel and damp-wipe dusty sills.',
        ],
        dataNote,
        disclaimer: SAFETY_DISCLAIMER,
        responseMode: 'deterministic_fallback',
        fallbackReason,
      };
    }

    if (safety.ventilation === 'brief_cross_ventilation') {
      return {
        answer: `Avoid opening windows during early morning or evening traffic peaks. At AQI ${snapshot.aqi} (${safety.label}), limit ventilation to a brief midday cross-breeze when air is cleaner.`,
        practicalSteps: [
          safety.saferWindowNote ??
            'Open opposite windows briefly for 10–15 minutes around midday, then close them before dusk.',
          'Keep windows facing busy roads shut during rush hours.',
          'Reduce indoor smoke from cooking or incense so you need less outdoor air exchange.',
        ],
        dataNote,
        disclaimer: SAFETY_DISCLAIMER,
        responseMode: 'deterministic_fallback',
        fallbackReason,
      };
    }

    return {
      answer: `Yes—it is a good time to ventilate. At AQI ${snapshot.aqi} (${safety.label}), outdoor air is clean enough to flush out indoor buildup.`,
      practicalSteps: [
        'Open windows on opposite sides of your home for 20–30 minutes to create cross-ventilation.',
        'Ventilate right after cooking or morning showers to clear indoor humidity and particles.',
      ],
      dataNote,
      disclaimer: SAFETY_DISCLAIMER,
      responseMode: 'deterministic_fallback',
      fallbackReason,
    };
  }

  if (
    q.includes('kid') ||
    q.includes('child') ||
    q.includes('play') ||
    q.includes('park') ||
    q.includes('outside') ||
    q.includes('outdoor')
  ) {
    if (safety.outdoorKids === 'move_indoors') {
      return {
        answer: `Skip outdoor park play right now. At AQI ${snapshot.aqi} (${safety.label}), active running increases how much polluted air children breathe in.`,
        practicalSteps: [
          'Shift park time indoors—try a 20-minute living-room balance/stretch circuit, story-and-sketch hour, or tabletop games.',
          'Keep windows closed and wipe indoor floors with a damp mop rather than a dry broom.',
          safety.recommendOfficialAdvisory
            ? 'Follow local school and municipal air-quality advisories today.'
            : 'If you must step outside briefly, keep trips short and away from idling traffic.',
        ],
        dataNote,
        disclaimer: SAFETY_DISCLAIMER,
        responseMode: 'deterministic_fallback',
        fallbackReason,
      };
    }

    if (safety.outdoorKids === 'prefer_light_or_shorter') {
      return {
        answer: `Light, shorter outdoor play is reasonable, but skip intense running beside busy roads. At AQI ${snapshot.aqi} (${safety.label}), sensitive family members benefit from shorter sessions.`,
        practicalSteps: [
          'Limit active outdoor play to 20–30 minutes in a park or courtyard away from traffic.',
          'Take indoor water breaks and watch for throat or eye irritation.',
          'Have a low-key indoor backup activity ready if haze thickens toward evening.',
        ],
        dataNote,
        disclaimer: SAFETY_DISCLAIMER,
        responseMode: 'deterministic_fallback',
        fallbackReason,
      };
    }

    return {
      answer: `Yes, outdoor play is suitable today. At AQI ${snapshot.aqi} (${safety.label}), air conditions are comfortable for children and family walks.`,
      practicalSteps: [
        'Enjoy parks, walking, or cycling away from heavy road intersections.',
        'Take advantage of clean air to air out living areas while you are home.',
      ],
      dataNote,
      disclaimer: SAFETY_DISCLAIMER,
      responseMode: 'deterministic_fallback',
      fallbackReason,
    };
  }

  if (q.includes('bedroom') || q.includes('sleep') || q.includes('tonight') || q.includes('cheap') || q.includes('expensive')) {
    return {
      answer: `You can make your bedroom noticeably cleaner tonight using zero-cost habits—even without buying an air purifier. At AQI ${snapshot.aqi} (${safety.label}), reducing infiltration and indoor dust makes the biggest impact overnight.`,
      practicalSteps: [
        safety.ventilation === 'keep_closed'
          ? 'Keep bedroom windows and doors closed from late afternoon onward.'
          : 'Briefly air out the bedroom during cleaner midday hours, then close windows before evening haze settles.',
        'Skip incense, mosquito coils, candles, and aerosol room sprays inside the bedroom.',
        'Damp-wipe nightstands and floors (no dry dusting), and leave outdoor clothes and shoes outside the bedroom.',
        profile.hasAirPurifier
          ? 'Run your purifier on medium for 60 minutes before bedtime with the bedroom door shut.'
          : 'Wash pillowcases regularly and place a folded towel along wide gaps under exterior doors on hazy nights.',
      ],
      dataNote,
      disclaimer: SAFETY_DISCLAIMER,
      responseMode: 'deterministic_fallback',
      fallbackReason,
    };
  }

  return {
    answer: `For ${snapshot.location.name} at AQI ${snapshot.aqi} (${safety.label}): ${safety.summary}`,
    practicalSteps: [
      safety.ventilation === 'keep_closed'
        ? 'Keep windows closed today and focus on eliminating indoor smoke (incense, candles, smoky frying).'
        : 'Use natural ventilation only during cleaner daytime hours and keep indoor cooking well-exhausted.',
      safety.outdoorGeneral === 'move_indoors'
        ? 'Replace outdoor exercise and park trips with low-intensity indoor activities.'
        : 'Prefer parks or quiet side streets over high-traffic roads for outdoor routines.',
      safety.lowEmissionMobility === 'walk_or_cycle_safe'
        ? 'Walk or cycle for short neighborhood errands today.'
        : 'Consolidate vehicle trips and switch off engines instead of idling.',
    ],
    dataNote,
    disclaimer: SAFETY_DISCLAIMER,
    responseMode: 'deterministic_fallback',
    fallbackReason,
  };
}