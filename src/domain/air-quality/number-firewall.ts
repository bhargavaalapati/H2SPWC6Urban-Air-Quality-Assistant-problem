const NUMBER_TOKEN_REGEX = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;

// Small structural numbers, chemical subscripts (PM2.5, PM10, CO2, NO2, O3),
// and standard US EPA AQI band boundaries that are valid contextual references.
const ALWAYS_ALLOWED_NUMERALS = new Set<string>([
  '0',
  '1',
  '2',
  '2.5',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '15',
  '20',
  '24',
  '30',
  '50',
  '60',
  '100',
  '150',
  '200',
  '300',
  '500',
]);

function normalizeToken(token: string): string {
  const cleaned = token.replace(/,/g, '');
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return cleaned;
  return String(numeric);
}

/**
 * Extracts normalized numeric tokens from arbitrary strings or JSON-serializable values.
 */
export function extractNormalizedNumbers(input: unknown): Set<string> {
  const text = typeof input === 'string' ? input : JSON.stringify(input ?? '');
  const matches = text.match(NUMBER_TOKEN_REGEX) ?? [];
  const result = new Set<string>();

  for (const raw of matches) {
    const norm = normalizeToken(raw);
    result.add(norm);
    const asNum = Number(norm);
    if (Number.isFinite(asNum)) {
      result.add(String(Math.round(asNum)));
    }
  }

  return result;
}

export interface NumberFirewallResult {
  passed: boolean;
  unexpectedNumbers: string[];
}

/**
 * Verifies that every numeral written by an LLM already exists in the
 * deterministic facts object, the user's own input, or the safe chemical/AQI reference set.
 */
export function verifyNumberFirewall(
  llmText: string,
  allowedFacts: unknown,
  userInputText: string = ''
): NumberFirewallResult {
  const allowed = new Set<string>(ALWAYS_ALLOWED_NUMERALS);

  for (const n of extractNormalizedNumbers(allowedFacts)) {
    allowed.add(n);
  }
  for (const n of extractNormalizedNumbers(userInputText)) {
    allowed.add(n);
  }

  const foundInOutput = llmText.match(NUMBER_TOKEN_REGEX) ?? [];
  const unexpected = new Set<string>();

  for (const raw of foundInOutput) {
    const norm = normalizeToken(raw);
    if (!allowed.has(norm)) {
      unexpected.add(raw);
    }
  }

  return {
    passed: unexpected.size === 0,
    unexpectedNumbers: Array.from(unexpected),
  };
}