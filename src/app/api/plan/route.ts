import { NextRequest, NextResponse } from 'next/server';
import { planRequestSchema } from '@/domain/air-quality/ai-guardrails';
import { apiError, getClientIp, parseJsonBodyWithLimit } from '@/lib/http';
import { checkRateLimit } from '@/lib/rate-limit';
import { generatePersonalizedPlan } from '@/services/ai-assistant';

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`plan:${getClientIp(request)}`, 20, 60_000);
  if (!rate.allowed) {
    return apiError(
      'Too many plan requests. Please wait a moment and try again.',
      'RATE_LIMITED',
      429,
      { headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  const bodyResult = await parseJsonBodyWithLimit(request);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const parsed = planRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues[0]?.message ?? 'Invalid plan request data.',
      'VALIDATION_ERROR',
      400,
      {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || 'body',
          message: i.message,
        })),
      }
    );
  }

  const result = await generatePersonalizedPlan(
    parsed.data.snapshot,
    parsed.data.profile,
    parsed.data.preferAi
  );

  return NextResponse.json(result, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}