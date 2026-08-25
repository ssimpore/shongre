import { minutesToMilliseconds } from "../utilities/time";

/** Shared client-cache behaviour for adapter-backed frontend queries. */
export const QUERY_CLIENT_CONFIG = {
  staleTimeMs: minutesToMilliseconds(3),
  retryCount: 1,
} as const;
