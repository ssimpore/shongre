import type { MarketInfrastructureConfig } from "@shongre/contracts";

/**
 * Stable domain configuration shared by the proxy, metadata routes and server
 * components. Keeping this module free of `next/headers` lets the request proxy
 * import it without pulling React server-only code into its runtime bundle.
 */
export function marketInfrastructureFromEnvironment(): MarketInfrastructureConfig {
  return {
    globalDomain:
      process.env.SHONGRE_GLOBAL_DOMAIN ||
      process.env.NEXT_PUBLIC_SHONGRE_GLOBAL_DOMAIN ||
      "shongre.com",
    franceDomain:
      process.env.SHONGRE_FR_DOMAIN ||
      process.env.NEXT_PUBLIC_SHONGRE_FR_DOMAIN ||
      "shongre.fr",
    canonicalProtocol:
      (process.env.SHONGRE_CANONICAL_PROTOCOL ||
        process.env.NEXT_PUBLIC_SHONGRE_CANONICAL_PROTOCOL) === "http"
        ? "http"
        : "https",
  };
}

/**
 * Browser-safe market routing configuration. Next.js only exposes variables
 * with the NEXT_PUBLIC_ prefix to client components, so the market switcher
 * must not rely on the server-only canonical domain variables.
 */
export function marketInfrastructureFromPublicEnvironment(): MarketInfrastructureConfig {
  return {
    globalDomain:
      process.env.NEXT_PUBLIC_SHONGRE_GLOBAL_DOMAIN || "shongre.com",
    franceDomain:
      process.env.NEXT_PUBLIC_SHONGRE_FR_DOMAIN || "shongre.fr",
    canonicalProtocol:
      process.env.NEXT_PUBLIC_SHONGRE_CANONICAL_PROTOCOL === "http"
        ? "http"
        : "https",
  };
}
