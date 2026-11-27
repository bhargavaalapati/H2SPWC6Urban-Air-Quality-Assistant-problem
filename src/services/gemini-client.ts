import { GoogleGenAI, type Schema } from '@google/genai';

const DEFAULT_MODEL = 'gemini-3.8-flash';
const AI_TIMEOUT_MS = 18_000;

let roundRobinCursor = 0;

export function getConfiguredApiKeys(): string[] {
  const candidates: string[] = [];

  const csvKeys = process.env.GEMINI_API_KEYS;
  if (csvKeys) {
    for (const part of csvKeys.split(',')) {
      const trimmed = part.trim();
      if (trimmed) candidates.push(trimmed);
    }
  }

  for (const envName of ['GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3'] as const) {
    const val = process.env[envName]?.trim();
    if (val) candidates.push(val);
  }

  return Array.from(new Set(candidates));
}

export function getConfiguredModels(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  return Array.from(new Set([primary, ...fallbacks]));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

function isRetryableStatus(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg === 'AI_TIMEOUT' ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('401') ||
    msg.includes('403')
  );
}

export function classifyProviderError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg === 'AI_TIMEOUT') {
      return 'AI provider timed out; answered via built-in deterministic guide.';
    }
    if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
      return 'Gemini is experiencing temporary high demand (503); answered via built-in deterministic guide.';
    }
    if (
      msg.includes('429') ||
      msg.toLowerCase().includes('quota') ||
      msg.includes('RESOURCE_EXHAUSTED')
    ) {
      return 'Gemini API quota limit reached across configured keys (429); answered via built-in deterministic guide.';
    }
    if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('api key')) {
      return 'Gemini API rejected the configured key (401/403); answered via built-in deterministic guide.';
    }
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return 'Configured Gemini model was not found (404); answered via built-in deterministic guide.';
    }
  }
  return 'AI provider was temporarily unavailable; answered via built-in deterministic guide.';
}

export interface GeminiJsonCallOptions {
  tag: 'plan' | 'assistant';
  locationName: string;
  systemInstruction: string;
  contents: string;
  responseSchema: Schema;
}

/**
 * Executes a structured JSON Gemini call with round-robin API key rotation
 * and failover across configured keys and fallback models.
 */
export async function callGeminiWithRotation(
  options: GeminiJsonCallOptions
): Promise<{ text: string; modelUsed: string }> {
  const keys = getConfiguredApiKeys();
  const models = getConfiguredModels();

  if (keys.length === 0) {
    throw new Error('NO_API_KEYS');
  }

  const startIdx = roundRobinCursor % keys.length;
  roundRobinCursor = (roundRobinCursor + 1) % keys.length;

  let lastError: unknown = new Error('AI call failed');

  for (const model of models) {
    for (let offset = 0; offset < keys.length; offset += 1) {
      const keyIdx = (startIdx + offset) % keys.length;
      const apiKey = keys[keyIdx]!;
      const client = new GoogleGenAI({ apiKey });

      try {
        console.info(
          `[AirNest AI][${options.tag}] Calling ${model} (key #${keyIdx + 1}/${keys.length}) for ${options.locationName}...`
        );

        const response = await withTimeout(
          client.models.generateContent({
            model,
            contents: options.contents,
            config: {
              systemInstruction: options.systemInstruction,
              temperature: 0.3,
              responseMimeType: 'application/json',
              responseSchema: options.responseSchema,
            },
          }),
          AI_TIMEOUT_MS
        );

        if (response.text) {
          return { text: response.text, modelUsed: model };
        }
        lastError = new Error('EMPTY_RESPONSE');
      } catch (error) {
        lastError = error;
        console.warn(
          `[AirNest AI][${options.tag}] Attempt failed on ${model} (key #${keyIdx + 1}/${keys.length}):`,
          error instanceof Error ? error.message.slice(0, 220) : error
        );

        if (error instanceof Error && error.message.includes('404')) {
          break;
        }

        if (offset < keys.length - 1 && isRetryableStatus(error)) {
          await sleep(350);
          continue;
        }
      }
    }
  }

  throw lastError;
}