const AUTH_PATHS = [
  "/connexion",
  "/inscription",
  "/auth",
  "/mot-de-passe",
  "/reinitialisation-mot-de-passe",
];

/** Resolves an attacker-controlled post-auth target to a same-origin app path. */
export function resolveSafeReturn(
  candidate: string | null | undefined,
  fallback = "/",
): string {
  if (!candidate) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(candidate.trim());
  } catch {
    return fallback;
  }
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  ) {
    return fallback;
  }
  let parsed: URL;
  try {
    parsed = new URL(decoded, "https://shongre.invalid");
  } catch {
    return fallback;
  }
  if (parsed.origin !== "https://shongre.invalid") return fallback;
  const lowerPath = parsed.pathname.toLowerCase();
  if (
    AUTH_PATHS.some(
      (path) => lowerPath === path || lowerPath.startsWith(`${path}/`),
    )
  )
    return fallback;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
