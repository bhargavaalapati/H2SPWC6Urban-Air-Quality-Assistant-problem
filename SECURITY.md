# Security Policy & Architecture

## Defense-in-Depth Controls
- **Transport & Content Security:** Enforces `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Schema Validation:** Validates inputs and persisted profile data via Zod (`src/domain/air-quality/schemas.ts`) before use.
- **AI Guardrails & Number Firewall:** Constrains model output structure and checks numeric claims (`src/domain/air-quality/ai-guardrails.ts`, `src/domain/air-quality/number-firewall.ts`) so ungrounded numbers do not slip through unchecked.
- **Rate Limiting & Safe Error Handling:** Applies request rate limiting (`src/lib/rate-limit.ts`) and returns sanitized errors without leaking internal stack traces or secrets.

## Secrets & Client Storage
- Keep API keys (such as Gemini API keys) strictly server-side in environment variables; never expose private keys in `NEXT_PUBLIC_*` or client components.
- Browser `localStorage` stores non-sensitive preferences, checklist completion, and habit progress (`src/lib/storage.ts`) with safe fallbacks for malformed JSON or storage quota errors.

## Reporting Vulnerabilities
Please report security issues privately to the maintainers before opening a public issue.