import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getAirQuality } from '@/app/api/air-quality/route';
import { POST as postAssistant } from '@/app/api/assistant/route';
import { POST as postPlan } from '@/app/api/plan/route';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';

const SEVERE_DEMO = DEMO_SCENARIOS[0]!;

describe('API route handlers', () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY_2; 
    delete process.env.GEMINI_API_KEY_3;
  });

  afterEach(() => {
    if (originalGeminiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
  });

  describe('GET /api/air-quality', () => {
    it('returns a labeled demo scenario when ?demo= is valid', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/air-quality?demo=delhi-winter-smog',
        { headers: { 'x-forwarded-for': '198.51.100.1' } }
      );
      const res = await getAirQuality(req);
      const body = (await res.json()) as {
        snapshot?: { provenance: string; aqi: number };
      };

      expect(res.status).toBe(200);
      expect(body.snapshot?.provenance).toBe('demo');
      expect(body.snapshot?.aqi).toBe(268);
    });

    it('returns 400 for an unknown demo scenario', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/air-quality?demo=not-a-real-demo',
        { headers: { 'x-forwarded-for': '198.51.100.2' } }
      );
      const res = await getAirQuality(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for out-of-range coordinates', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/air-quality?lat=999&lon=78',
        { headers: { 'x-forwarded-for': '198.51.100.3' } }
      );
      const res = await getAirQuality(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when city query is missing or too short', async () => {
      const req = new NextRequest('http://localhost:3000/api/air-quality?city=a', {
        headers: { 'x-forwarded-for': '198.51.100.4' },
      });
      const res = await getAirQuality(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/plan', () => {
    it('returns 400 on malformed JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.5',
        },
        body: '{bad-json',
      });
      const res = await postPlan(req);
      expect(res.status).toBe(400);
    });

    it('returns a safety-verified plan and transparent fallback status when AI key is absent', async () => {
      const req = new NextRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.6',
        },
        body: JSON.stringify({
          snapshot: SEVERE_DEMO.snapshot,
          profile: DEFAULT_FAMILY_PROFILE,
          preferAi: true,
        }),
      });
      const res = await postPlan(req);
      const body = (await res.json()) as {
        aiStatus?: string;
        plan?: { safety: { ventilation: string }; actions: unknown[] };
      };

      expect(res.status).toBe(200);
      expect(body.aiStatus).toBe('fallback_used');
      expect(body.plan?.safety.ventilation).toBe('keep_closed');
      expect(body.plan?.actions.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('POST /api/assistant', () => {
    it('rejects overly short questions with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/assistant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.7',
        },
        body: JSON.stringify({
          question: '?',
          snapshot: SEVERE_DEMO.snapshot,
          profile: DEFAULT_FAMILY_PROFILE,
        }),
      });
      const res = await postAssistant(req);
      expect(res.status).toBe(400);
    });

    it('returns a grounded safety-compliant reply and enforces rate limits', async () => {
      const ip = '198.51.100.8';
      const payload = JSON.stringify({
        question: 'Should I open the windows this morning?',
        snapshot: SEVERE_DEMO.snapshot,
        profile: DEFAULT_FAMILY_PROFILE,
      });

      const firstRes = await postAssistant(
        new NextRequest('http://localhost:3000/api/assistant', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
          body: payload,
        })
      );
      const firstBody = (await firstRes.json()) as {
        reply?: { answer: string; responseMode: string };
      };

      expect(firstRes.status).toBe(200);
      expect(firstBody.reply?.responseMode).toBe('deterministic_fallback');
      expect(firstBody.reply?.answer.toLowerCase()).toContain('keep windows closed');

      // Exhaust the 10 req/min limit (1 already used + 9 more = 10)
      for (let i = 0; i < 9; i += 1) {
        const res = await postAssistant(
          new NextRequest('http://localhost:3000/api/assistant', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
            body: payload,
          })
        );
        expect(res.status).toBe(200);
      }

      const limitedRes = await postAssistant(
        new NextRequest('http://localhost:3000/api/assistant', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
          body: payload,
        })
      );
      expect(limitedRes.status).toBe(429);
      expect(limitedRes.headers.get('retry-after')).toBeTruthy();
    });
  });
});