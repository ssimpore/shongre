import type { AnalyticsPropertyValue } from "@shongre/contracts/analytics";

const BLOCKED_KEY =
  /(?:^|_)(?:email|phone|telephone|address|street|postcode|postal|message|body|description|name|password|token|secret|authorization|cookie|jwt|card|iban|bic|kyc|kyb|document|birth|ip)(?:$|_)/i;
const SENSITIVE_VALUE =
  /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:\+?\d[\s().-]*){9,}\b|\b(?:eyJ[A-Za-z0-9_-]{10,}\.){2}[A-Za-z0-9_-]+\b|\b(?:\d[ -]*?){13,19}\b)/i;

export function safePath(value: string): string {
  try {
    const url = new URL(value, "https://shongre.invalid");
    return url.pathname || "/";
  } catch {
    return value.split(/[?#]/, 1)[0] || "/";
  }
}

function cleanString(key: string, value: string): string | undefined {
  const clean =
    key === "path" || key === "page" || key === "route"
      ? safePath(value)
      : value.trim();
  if (SENSITIVE_VALUE.test(clean)) return undefined;
  return clean.slice(0, 512) || undefined;
}

/**
 * Last-line privacy boundary shared by every browser provider.
 * Unknown structured data, secrets and likely direct identifiers are dropped,
 * never merely renamed or hashed.
 */
export function sanitizeAnalyticsProperties(
  input: Record<string, unknown>,
): Record<string, AnalyticsPropertyValue> {
  const output: Record<string, AnalyticsPropertyValue> = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = rawKey.slice(0, 80);
    const normalizedKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
    if (!key || BLOCKED_KEY.test(normalizedKey) || rawValue === undefined)
      continue;
    if (rawValue === null || typeof rawValue === "boolean") {
      output[key] = rawValue;
      continue;
    }
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      output[key] = rawValue;
      continue;
    }
    if (typeof rawValue === "string") {
      const clean = cleanString(key, rawValue);
      if (clean !== undefined) output[key] = clean;
      continue;
    }
    if (Array.isArray(rawValue)) {
      const strings = rawValue
        .filter((value): value is string => typeof value === "string")
        .map((value) => cleanString(key, value))
        .filter((value): value is string => Boolean(value))
        .slice(0, 50);
      if (strings.length === rawValue.length) output[key] = strings;
      else {
        const numbers = rawValue
          .filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value),
          )
          .slice(0, 50);
        if (numbers.length === rawValue.length) output[key] = numbers;
      }
    }
  }
  return output;
}

export function sanitizeErrorPayload(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: "Application error" };
  }
  if (typeof value === "string") return "Application error";
  return undefined;
}
