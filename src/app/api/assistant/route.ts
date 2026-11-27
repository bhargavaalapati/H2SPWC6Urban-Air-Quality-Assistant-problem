import { NextRequest, NextResponse } from 'next/server';
import { assistantRequestSchema } from '@/domain/air-quality/schemas';
import { apiError, getClientIp, parseJsonBodyWithLimit } from '@/lib/http';
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

export async function POST(request: NextRequest) {
  const limit = getDailyQuestionLimit();
  const rate = checkRateLimit(`assistant:${getClientIp(request)}`, limit, DAY_WINDOW_MS);

  const quota = {
    remaining: rate.remaining,
    limit: rate.limit,
    resetInSeconds: rate.retryAfterSeconds,
  };

  if (!rate.allowed) {
    return apiError(
      `You've used all ${rate.limit} AI assistant questions for today. Your daily checklist, indoor hacks, and air-quality guide remain unlimited.`,
      'RATE_LIMITED',
      429,
      {
        headers: {
          'Retry-After': String(rate.retryAfterSeconds),
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': '0',
        },
        extra: { quota },
      }
    );
  }

  const bodyResult = await parseJsonBodyWithLimit(request, undefined, { quota });
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const parsed = assistantRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues[0]?.message ?? 'Please enter a valid question.',
      'VALIDATION_ERROR',
      400,
      {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || 'question',
          message: i.message,
        })),
        extra: { quota },
      }
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
        'Cache-Control': 'no-store',
        'X-RateLimit-Limit': String(rate.limit),
        'X-RateLimit-Remaining': String(rate.remaining),
      },
    }
  );
}