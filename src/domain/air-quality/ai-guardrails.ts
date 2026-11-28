import { z } from 'zod';
import { aiPlanResponseSchema, familyProfileSchema } from '@/domain/air-quality/schemas';
import type { DailyActionItem, SafetyAssessment } from '@/domain/air-quality/types';
import { verifyNumberFirewall } from '@/domain/air-quality/number-firewall';
import {
  buildDeterministicAssistantReply,
  buildProvenanceNote,
  type AssistantReply,
  type AssistantResponseMode,
} from '@/domain/air-quality/assistant-fallback';

export {
  buildDeterministicAssistantReply,
  buildProvenanceNote,
  type AssistantReply,
  type AssistantResponseMode,
};

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