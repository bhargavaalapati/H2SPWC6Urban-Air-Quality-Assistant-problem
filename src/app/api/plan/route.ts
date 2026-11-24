import { NextRequest, NextResponse } from 'next/server';
import { planRequestSchema } from '@/domain/air-quality/ai-guardrails';
import { checkRateLimit } from '@/lib/rate-limit';
import { generatePersonalizedPlan } from '@/services/ai-assistant';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'local-client';
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`plan:${getClientIp(request)}`, 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'Too many plan requests. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload.', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid plan request data.',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }

  const result = await generatePersonalizedPlan(
    parsed.data.snapshot,
    parsed.data.profile,
    parsed.data.preferAi
  );

  return NextResponse.json(result, { status: 200 });
}