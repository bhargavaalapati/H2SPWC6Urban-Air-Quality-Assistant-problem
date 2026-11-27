import { NextResponse } from 'next/server';
import { MAX_JSON_BODY_BYTES } from '@/lib/http';
import { getConfiguredApiKeys } from '@/services/gemini-client';

export async function GET() {
  const rawDailyLimit = Number(process.env.ASSISTANT_DAILY_LIMIT);
  const assistantDailyLimit =
    Number.isInteger(rawDailyLimit) && rawDailyLimit >= 1 && rawDailyLimit <= 100
      ? rawDailyLimit
      : 10;

  return NextResponse.json(
    {
      status: 'ok',
      service: 'airnest-urban-air-quality-assistant',
      aiConfigured: getConfiguredApiKeys().length > 0,
      limits: {
        maxJsonBodyBytes: MAX_JSON_BODY_BYTES,
        assistantDailyQuestions: assistantDailyLimit,
        airQualityRequestsPerMinute: 60,
        planRequestsPerMinute: 20,
      },
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}