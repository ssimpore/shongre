const ANSWER_ENGINE_REFERRERS = Object.freeze([
  { source: "chatgpt.com", hosts: ["chatgpt.com"] },
  { source: "perplexity.ai", hosts: ["perplexity.ai"] },
  { source: "copilot.microsoft.com", hosts: ["copilot.microsoft.com"] },
  { source: "gemini.google.com", hosts: ["gemini.google.com"] },
] as const);

function normalizedHostname(value: string | undefined): string {
  if (!value) return "";
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifyAnswerEngineReferrer(
  value: string | undefined,
): { source: string; medium: "organic_ai" } | null {
  const hostname = normalizedHostname(value);
  const match = ANSWER_ENGINE_REFERRERS.find(({ hosts }) =>
    hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
  );
  return match ? { source: match.source, medium: "organic_ai" } : null;
}
