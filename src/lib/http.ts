import { NextRequest, NextResponse } from 'next/server';

export const MAX_JSON_BODY_BYTES = 16_384; // 16 KB cap for JSON POST payloads

export interface ApiFieldIssue {
  field: string;
  message: string;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'local-client';
}

export function apiError(
  error: string,
  code: string,
  status: number,
  options?: {
    headers?: Record<string, string>;
    issues?: ApiFieldIssue[];
    extra?: Record<string, unknown>;
  }
): NextResponse {
  return NextResponse.json(
    {
      error,
      code,
      ...(options?.issues ? { issues: options.issues } : {}),
      ...(options?.extra ?? {}),
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...(options?.headers ?? {}),
      },
    }
  );
}

export type ParsedJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse };

/**
 * Enforces JSON Content-Type and both declared + actual byte-size caps
 * before parsing untrusted request bodies.
 */
export async function parseJsonBodyWithLimit(
  request: NextRequest,
  maxBytes: number = MAX_JSON_BODY_BYTES,
  extraErrorPayload?: Record<string, unknown>
): Promise<ParsedJsonResult> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {
      ok: false,
      response: apiError(
        'Content-Type must be application/json.',
        'UNSUPPORTED_MEDIA_TYPE',
        415,
        { extra: extraErrorPayload }
      ),
    };
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      ok: false,
      response: apiError(
        `Request payload exceeds the ${maxBytes}-byte limit.`,
        'PAYLOAD_TOO_LARGE',
        413,
        { extra: extraErrorPayload }
      ),
    };
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return {
      ok: false,
      response: apiError('Unable to read request body.', 'INVALID_BODY', 400, {
        extra: extraErrorPayload,
      }),
    };
  }

  const actualBytes = new TextEncoder().encode(rawText).length;
  if (actualBytes > maxBytes) {
    return {
      ok: false,
      response: apiError(
        `Request payload exceeds the ${maxBytes}-byte limit.`,
        'PAYLOAD_TOO_LARGE',
        413,
        { extra: extraErrorPayload }
      ),
    };
  }

  try {
    return { ok: true, data: JSON.parse(rawText) as unknown };
  } catch {
    return {
      ok: false,
      response: apiError('Invalid JSON request payload.', 'INVALID_JSON', 400, {
        extra: extraErrorPayload,
      }),
    };
  }
}