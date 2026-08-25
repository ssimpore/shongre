import type { MarketInfrastructureConfig } from "@shongre/contracts";

/**
 * Stable domain configuration shared by the proxy, metadata routes and server
 * components. Keeping this module free of `next/headers` lets the request proxy
 * import it without pulling React server-only code into its runtime bundle.
 */
export function marketInfrastructureFromEnvironment(): MarketInfrastructureConfig {
  return {
    globalDomain: process.env.SHONGRE_GLOBAL_DOMAIN || "shongre.com",
    franceDomain: process.env.SHONGRE_FR_DOMAIN || "shongre.fr",
    canonicalProtocol:
      process.env.SHONGRE_CANONICAL_PROTOCOL === "http" ? "http" : "https",
  };
}
