import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";

/** Shared client-cache behaviour for adapter-backed frontend queries. */
export const QUERY_CLIENT_CONFIG = {
  staleTimeMs: SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.frontend.queryStaleTimeMs,
  gcTimeMs: SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.frontend.queryGcTimeMs,
  retryCount: SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.frontend.queryRetryCount,
} as const;
