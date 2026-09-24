/**
 * Visitor-identity headers set by the controlled edge. The API keys rate
 * limits and security events on them, so every Web-server hop that calls the
 * API for a visitor — the browser relay and server rendering — forwards them,
 * and only when the deployment trusts its edge.
 */
const EDGE_IDENTITY_HEADERS = ["cf-connecting-ip", "cf-ipcountry"] as const;

export function edgeIdentityHeaders(
  source: Pick<Headers, "get">,
): Record<string, string> {
  if (process.env.SHONGRE_TRUST_PROXY_IP !== "true") return {};
  const forwarded: Record<string, string> = {};
  for (const name of EDGE_IDENTITY_HEADERS) {
    const value = source.get(name);
    if (value) forwarded[name] = value;
  }
  return forwarded;
}
