import {
  aiAssistantStructuredSchema,
  buildDeterministicAssistantReply,
  buildProvenanceNote,
  checkTextAgainstSafety,
  validateAndFilterAiPlan,
  type AssistantReply,
} from '@/domain/air-quality/ai-guardrails';
import { verifyNumberFirewall } from '@/domain/air-quality/number-firewall';
import { buildDeterministicPlan, type DailyPlan } from '@/domain/air-quality/recommendations';
import { evaluateSafety, SAFETY_DISCLAIMER } from '@/domain/air-quality/thresholds';
import type { AirQualitySnapshot, FamilyProfile } from '@/domain/air-quality/types';
import {
  ASSISTANT_RESPONSE_SCHEMA,
  ASSISTANT_SYSTEM_INSTRUCTION,
  buildPlanPromptPayload,
  PLAN_RESPONSE_SCHEMA,
  PLAN_SYSTEM_INSTRUCTION,
} from '@/services/ai-prompts';
import {
  callGeminiWithRotation,
  classifyProviderError,
  getConfiguredApiKeys,
  stripJsonFences,
} from '@/services/gemini-client';

export interface PlanGenerationResult {
  plan: DailyPlan;
  aiStatus: 'ai_enhanced' | 'deterministic_only' | 'fallback_used';
  aiNote: string;
}

export async function generatePersonalizedPlan(
  snapshot: AirQualitySnapshot,
  profile: FamilyProfile,
  preferAi: boolean = true
): Promise<PlanGenerationResult> {
  const deterministicPlan = buildDeterministicPlan(snapshot, profile);

  if (!preferAi) {
    return {
      plan: deterministicPlan,
      aiStatus: 'deterministic_only',
      aiNote: 'Generated using deterministic air-quality safety rules.',
    };
  }

  if (getConfiguredApiKeys().length === 0) {
    return {
      plan: deterministicPlan,
      aiStatus: 'fallback_used',
      aiNote:
        'Using built-in safety rules (GEMINI_API_KEY is not configured on the server).',
    };
  }

  const safety =
    snapshot.aqi !== null && snapshot.provenance !== 'unavailable'
      ? evaluateSafety(snapshot.aqi, profile, snapshot.hourlyForecast)
      : null;

  const promptPayload = buildPlanPromptPayload(
    snapshot,
    profile,
    safety,
    deterministicPlan.impactTotals
  );

  try {
    const { text, modelUsed } = await callGeminiWithRotation({
      tag: 'plan',
      locationName: snapshot.location.name,
      systemInstruction: PLAN_SYSTEM_INSTRUCTION,
      contents: `Create 5 tailored air-quality actions for this context:\n${JSON.stringify(promptPayload)}`,
      responseSchema: PLAN_RESPONSE_SCHEMA,
    });

    const parsedJson: unknown = JSON.parse(stripJsonFences(text));
    const validated = validateAndFilterAiPlan(parsedJson, safety, promptPayload);

    if (!validated) {
      return {
        plan: deterministicPlan,
        aiStatus: 'fallback_used',
        aiNote:
          'AI output did not pass safety/number-firewall checks; showing verified deterministic plan.',
      };
    }

    const mergedActions = validated.actions.map((aiAction, idx) => ({
      ...aiAction,
      impact: deterministicPlan.actions[idx]?.impact,
      calendarUrl: deterministicPlan.actions[idx]?.calendarUrl,
    }));

    return {
      plan: {
        ...deterministicPlan,
        dailyHeadline: validated.dailyHeadline,
        actions: mergedActions,
        mode: 'ai_enhanced',
      },
      aiStatus: 'ai_enhanced',
      aiNote: `Personalized with ${modelUsed} within deterministic safety & number-firewall boundaries.`,
    };
  } catch (error) {
    return {
      plan: deterministicPlan,
      aiStatus: 'fallback_used',
      aiNote: classifyProviderError(error),
    };
  }
}

export async function answerFamilyAirQuestion(
  question: string,
  snapshot: AirQualitySnapshot,
  profile: FamilyProfile
): Promise<AssistantReply> {
  if (getConfiguredApiKeys().length === 0) {
    return buildDeterministicAssistantReply(
      question,
      snapshot,
      profile,
      'Live LLM key (GEMINI_API_KEY) is not configured; answered via built-in deterministic air-quality guide.'
    );
  }

  const basePlan = buildDeterministicPlan(snapshot, profile);
  const safety =
    snapshot.aqi !== null && snapshot.provenance !== 'unavailable'
      ? evaluateSafety(snapshot.aqi, profile, snapshot.hourlyForecast)
      : null;

  const dataNote = buildProvenanceNote(snapshot);
  const groundedContext = {
    environmentalContext: {
      location: snapshot.location.name,
      provenance: snapshot.provenance,
      sourceLabel: snapshot.sourceLabel,
      aqi: snapshot.aqi,
      pm25: snapshot.pollutants.pm25,
      pm10: snapshot.pollutants.pm10,
      observedAt: snapshot.observedAt,
    },
    householdProfile: profile,
    computedImpactTotals: basePlan.impactTotals,
    mandatorySafetyConstraints: safety
      ? {
          category: safety.label,
          ventilation: safety.ventilation,
          outdoorKids: safety.outdoorKids,
          outdoorGeneral: safety.outdoorGeneral,
          lowEmissionMobility: safety.lowEmissionMobility,
          saferWindowNote: safety.saferWindowNote,
          recommendOfficialAdvisory: safety.recommendOfficialAdvisory,
        }
      : { status: 'unavailable' },
  };

  try {
    const { text } = await callGeminiWithRotation({
      tag: 'assistant',
      locationName: snapshot.location.name,
      systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
      contents: [
        `GROUNDED CONTEXT:\n${JSON.stringify(groundedContext)}`,
        `USER QUESTION (UNTRUSTED INPUT):\n"""${question}"""`,
      ].join('\n\n'),
      responseSchema: ASSISTANT_RESPONSE_SCHEMA,
    });

    const parsedJson: unknown = JSON.parse(stripJsonFences(text));
    const parsed = aiAssistantStructuredSchema.safeParse(parsedJson);

    if (!parsed.success) {
      return buildDeterministicAssistantReply(
        question,
        snapshot,
        profile,
        'AI output failed schema validation; answered via built-in deterministic guide.'
      );
    }

    const combinedText = `${parsed.data.answer} ${parsed.data.practicalSteps.join(' ')}`;
    const safetyViolation = checkTextAgainstSafety(combinedText, safety);
    if (safetyViolation) {
      return buildDeterministicAssistantReply(
        question,
        snapshot,
        profile,
        `AI output conflicted with safety rules (${safetyViolation}); answered via built-in deterministic guide.`
      );
    }

    const firewall = verifyNumberFirewall(combinedText, groundedContext, question);
    if (!firewall.passed) {
      return buildDeterministicAssistantReply(
        question,
        snapshot,
        profile,
        `AI output included unverified figures (${firewall.unexpectedNumbers.join(', ')}); answered via built-in deterministic guide.`
      );
    }

    return {
      answer: parsed.data.answer,
      practicalSteps: parsed.data.practicalSteps.slice(0, 4),
      dataNote: parsed.data.uncertaintyNote?.trim()
        ? `${dataNote} ${parsed.data.uncertaintyNote.trim()}`
        : dataNote,
      disclaimer: SAFETY_DISCLAIMER,
      responseMode: 'ai',
    };
  } catch (error) {
    return buildDeterministicAssistantReply(
      question,
      snapshot,
      profile,
      classifyProviderError(error)
    );
  }
}