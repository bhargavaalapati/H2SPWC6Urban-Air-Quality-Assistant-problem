# Testing Strategy & Verification

## Automated Checks

Run the full verification suite before building or pushing:


npm run check && npm run build

---

- **npm run check runs**:

1. npm run typecheck (tsc --noEmit)

2. npm run lint (eslint . --max-warnings=0)

3. npm run test:coverage (vitest run --coverage)

---


- ***Test Suites (src/domain/__tests__/)***
accessibility-and-components.test.tsx — Component interactions and axe-core accessibility checks.

1. ai-guardrails.test.ts & number-firewall.test.ts — AI output validation and numeric consistency checks.

2. impact.test.ts (impact-and-firewall.test.ts) & recommendations.test.ts — Deterministic plan generation and exposure/impact calculations.

3. thresholds.test.ts & strategies-and-health.test.ts — Air quality thresholds, health sensitivity rules, and strategy selection.

4. open-meteo.test.ts, lib-and-gemini.test.ts, routes.test.ts, gamification.test.ts, storage.test.ts — Data fetching, API routes, streaks/XP, and storage resilience.
