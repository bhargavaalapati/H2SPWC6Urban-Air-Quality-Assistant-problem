import { NextRequest, NextResponse } from 'next/server';
import { assistantRequestSchema } from '@/domain/air-quality/schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { answerFamilyAirQuestion } from '@/services/ai-assistant';

const DEFAULT_DAILY_LIMIT = 10;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

function getDailyQuestionLimit(): number {
  const raw = Number(process.env.ASSISTANT_DAILY_LIMIT);
  if (Number.isInteger(raw) && raw >= 1 && raw <= 100) {
    return raw;
  }
  return DEFAULT_DAILY_LIMIT;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'local-client';
}

export async function POST(request: NextRequest) {
  const limit = getDailyQuestionLimit();
  const rate = checkRateLimit(`assistant:${getClientIp(request)}`, limit, DAY_WINDOW_MS);

  const quota = {
    remaining: rate.remaining,
    limit: rate.limit,
    resetInSeconds: rate.retryAfterSeconds,
  };

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${rate.limit} AI assistant questions for today. Your daily checklist, indoor hacks, and air-quality guide remain unlimited.`,
        code: 'RATE_LIMITED',
        quota,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSeconds),
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload.', code: 'INVALID_JSON', quota },
      { status: 400 }
    );
  }

  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Please enter a valid question.',
        code: 'VALIDATION_ERROR',
        quota,
      },
      { status: 400 }
    );
  }

  const reply = await answerFamilyAirQuestion(
    parsed.data.question,
    parsed.data.snapshot,
    parsed.data.profile
  );

  return NextResponse.json(
    { reply, quota },
    {
      status: 200,
      headers: {
        'X-RateLimit-Limit': String(rate.limit),
        'X-RateLimit-Remaining': String(rate.remaining),
      },
    }
  );
}