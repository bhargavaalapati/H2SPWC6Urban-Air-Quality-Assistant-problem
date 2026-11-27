import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getHealth } from '@/app/api/health/route';
import { POST as postPlan } from '@/app/api/plan/route';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import { STRATEGY_REGISTRY } from '@/domain/air-quality/strategies/registry';
import { evaluateSafety } from '@/domain/air-quality/thresholds';

const SEVERE_DEMO = DEMO_SCENARIOS[0]!;

describe('Strategy Registry (Open/Closed Modularity)', () => {
  it('registers distinct, non-empty strategies covering ventilation, outdoor, indoor, and sustainability', () => {
    const ids = STRATEGY_REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'ventilation',
      'outdoor-and-community',
      'indoor-hacks',
      'mobility-and-sustainability',
    ]);
  });

  it('produces valid actions from every strategy independently', () => {
    const safety = evaluateSafety(SEVERE_DEMO.snapshot.aqi!, DEFAULT_FAMILY_PROFILE);
    const context = {
      snapshot: SEVERE_DEMO.snapshot,
      profile: DEFAULT_FAMILY_PROFILE,
      safety,
      hours: null,
      isCommunity: false,
    };

    for (const strategy of STRATEGY_REGISTRY) {
      const actions = strategy.apply(context);
      expect(actions.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('GET /api/health & HTTP Body Guards', () => {
  it('returns service liveness and public limits without exposing secrets', async () => {
    const res = await getHealth();
    const body = (await res.json()) as {
      status: string;
      service: string;
      aiConfigured: boolean;
      limits: { maxJsonBodyBytes: number; assistantDailyQuestions: number };
    };

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.aiConfigured).toBe('boolean');
    expect(body.limits.maxJsonBodyBytes).toBe(16_384);
    expect(JSON.stringify(body)).not.toContain('AIza');
  });

  it('rejects non-JSON Content-Type with 415 Unsupported Media Type', async () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        'x-forwarded-for': '203.0.113.10',
      },
      body: 'not json',
    });

    const res = await postPlan(req);
    expect(res.status).toBe(415);
  });

  it('rejects oversized payloads (>16 KB) with 413 Payload Too Large', async () => {
    const oversizedBody = JSON.stringify({ padding: 'x'.repeat(20_000) });
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.11',
      },
      body: oversizedBody,
    });

    const res = await postPlan(req);
    expect(res.status).toBe(413);
  });
});