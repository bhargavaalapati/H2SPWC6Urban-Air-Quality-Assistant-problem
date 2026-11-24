import { NextRequest, NextResponse } from 'next/server';
import { assistantRequestSchema } from '@/domain/air-quality/schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { answerFamilyAirQuestion } from '@/services/ai-assistant';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'local-client';
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`assistant:${getClientIp(request)}`, 15, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'You have asked several questions quickly. Please wait a moment and try again.',
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

  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Please enter a valid question.',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }

  const reply = await answerFamilyAirQuestion(
    parsed.data.question,
    parsed.data.snapshot,
    parsed.data.profile
  );

  return NextResponse.json({ reply }, { status: 200 });
}