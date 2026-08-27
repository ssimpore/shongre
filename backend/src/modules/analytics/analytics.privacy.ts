import type { AnalyticsPropertyValue } from "@shongre/contracts/analytics";

const BLOCKED =
  /(?:^|_)(?:email|phone|telephone|address|street|postcode|postal|message|body|description|name|password|token|secret|authorization|cookie|jwt|card|iban|bic|kyc|kyb|document|birth|ip)(?:$|_)/i;
const DIRECT_IDENTIFIER =
  /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:\+?\d[\s().-]*){9,}\b|\b(?:eyJ[A-Za-z0-9_-]{10,}\.){2}[A-Za-z0-9_-]+\b|\b(?:\d[ -]*?){13,19}\b)/i;

export function sanitizeServerAnalyticsProperties(
  input: Record<string, unknown>,
): Record<string, AnalyticsPropertyValue> {
  const output: Record<string, AnalyticsPropertyValue> = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = rawKey.slice(0, 80);
    const normalizedKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
    if (!key || BLOCKED.test(normalizedKey) || rawValue === undefined) continue;
    if (rawValue === null || typeof rawValue === "boolean")
      output[key] = rawValue;
    else if (typeof rawValue === "number" && Number.isFinite(rawValue))
      output[key] = rawValue;
    else if (typeof rawValue === "string") {
      const value =
        key === "path" || key === "page" || key === "route"
          ? rawValue.split(/[?#]/, 1)[0]
          : rawValue.trim();
      if (value && !DIRECT_IDENTIFIER.test(value))
        output[key] = value.slice(0, 512);
    } else if (Array.isArray(rawValue) && rawValue.length <= 50) {
      if (
        rawValue.every(
          (value) => typeof value === "number" && Number.isFinite(value),
        )
      ) {
        output[key] = rawValue as number[];
      } else if (
        rawValue.every(
          (value) =>
            typeof value === "string" && !DIRECT_IDENTIFIER.test(value),
        )
      ) {
        output[key] = rawValue.map((value) => String(value).slice(0, 160));
      }
    }
  }
  return output;
}
