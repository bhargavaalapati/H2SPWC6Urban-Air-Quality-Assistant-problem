import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Schema } from '@google/genai';

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: generateContentMock,
    };
  },
}));

import { callGeminiWithRotation, classifyProviderError } from '@/services/gemini-client';

const BASE_OPTIONS = {
  tag: 'assistant' as const,
  locationName: 'Hyderabad',
  systemInstruction: 'Follow AQI safety constraints.',
  contents: 'Should we open windows?',
  responseSchema: {} as Schema,
  retryDelayMs: 0,
};

describe('services/gemini-client rotation & failover', () => {
  const savedEnv = {
    GEMINI_API_KEYS: process.env.GEMINI_API_KEYS,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_API_KEY_2: process.env.GEMINI_API_KEY_2,
    GEMINI_API_KEY_3: process.env.GEMINI_API_KEY_3,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    GEMINI_FALLBACK_MODELS: process.env.GEMINI_FALLBACK_MODELS,
  };

  beforeEach(() => {
    generateContentMock.mockReset();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('throws NO_API_KEYS when no Gemini credentials are configured', async () => {
    delete process.env.GEMINI_API_KEYS;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY_2;
    delete process.env.GEMINI_API_KEY_3;

    await expect(callGeminiWithRotation(BASE_OPTIONS)).rejects.toThrow('NO_API_KEYS');
  });

  it('rotates to the next key on 429 RESOURCE_EXHAUSTED and succeeds', async () => {
    process.env.GEMINI_API_KEYS = 'key-1,key-2';
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY_2;
    delete process.env.GEMINI_API_KEY_3;
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    delete process.env.GEMINI_FALLBACK_MODELS;

    generateContentMock
      .mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED'))
      .mockResolvedValueOnce({ text: '{"answer":"Keep windows closed."}' });

    const result = await callGeminiWithRotation(BASE_OPTIONS);
    expect(result.modelUsed).toBe('gemini-3.8-flash');
    expect(result.text).toContain('Keep windows closed');
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('falls over to the next configured model immediately on 404 NOT_FOUND', async () => {
    process.env.GEMINI_API_KEYS = 'key-1,key-2';
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_MODEL = 'gemini-missing-model';
    process.env.GEMINI_FALLBACK_MODELS = 'gemini-2.5-flash';

    generateContentMock
      .mockRejectedValueOnce(new Error('404 model not found'))
      .mockResolvedValueOnce({ text: '{"ok":true}' });

    const result = await callGeminiWithRotation(BASE_OPTIONS);
    expect(result.modelUsed).toBe('gemini-2.5-flash');
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('throws EMPTY_RESPONSE when every key returns an empty payload', async () => {
    process.env.GEMINI_API_KEYS = 'key-1';
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    delete process.env.GEMINI_FALLBACK_MODELS;

    generateContentMock.mockResolvedValueOnce({ text: '' });

    await expect(callGeminiWithRotation(BASE_OPTIONS)).rejects.toThrow('EMPTY_RESPONSE');
  });

  it('aborts with AI_TIMEOUT when provider exceeds timeoutMs', async () => {
    process.env.GEMINI_API_KEYS = 'key-1';
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    delete process.env.GEMINI_FALLBACK_MODELS;

    generateContentMock.mockImplementationOnce(() => new Promise(() => {}));

    await expect(
      callGeminiWithRotation({ ...BASE_OPTIONS, timeoutMs: 15 })
    ).rejects.toThrow('AI_TIMEOUT');
  });

  it('classifies unknown and non-Error provider failures safely', () => {
    expect(classifyProviderError('unexpected string')).toContain('temporarily unavailable');
    expect(classifyProviderError(new Error('network reset'))).toContain('temporarily unavailable');
  });
});