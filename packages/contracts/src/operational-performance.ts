/**
 * Platform-wide launch objectives and runtime performance defaults.
 *
 * These values are intentionally framework-independent. Applications may
 * expose environment overrides through their validated configuration, but
 * they must use these defaults rather than redefining numeric policy locally.
 */
export const SHONGRE_PERFORMANCE_BUDGETS = {
  webVitals: {
    lcpGoodMs: 2_500,
    inpGoodMs: 200,
    clsGood: 0.1,
    ttfbGoodMs: 800,
  },
  clientBundle: {
    // Calibrated to the shape measured after recent marketplace features
    // (returns, chargebacks, support articles, search enhancements, presence)
    // (255.0 KiB gzip / 913.9 KiB raw, largest chunk 188.4 KiB), keeping ~7% headroom.
    initialExecutableRawBytes: 980_000,
    initialExecutableGzipBytes: 275_000,
    /**
     * Enforced on every chunk layout. This was previously skipped whenever the
     * build emitted webpack chunk ids — which is every production build — so a
     * chunk 2.2x the stated budget passed while the number claimed otherwise.
     */
    executableChunkGzipBytes: 205_000,
    generatedTaxonomyChunkGzipBytes: 650_000,
    routeExecutableGzipBytes: {
      home: 16_000,
      search: 13_000,
      automotive: 11_000,
      realEstate: 9_000,
      employment: 16_500,
      education: 15_000,
      listingDetail: 25_000,
    },
  },
  api: {
    monthlyAvailability: 0.999,
    p95Ms: 750,
    p99Ms: 2_000,
    minimumLoadTestSuccessRate: 0.99,
  },
  database: {
    interactiveQueryP95Ms: 100,
    slowQueryMs: 250,
    poolSaturationWarningRatio: 0.8,
  },
  cache: {
    discoveryMinimumHitRatio: 0.4,
    catalogMinimumHitRatio: 0.7,
    referenceMinimumHitRatio: 0.8,
    invalidationP95Ms: 5_000,
  },
  queues: {
    paymentWebhookAcceptedWithinMs: 30_000,
    maximumPaymentEventAgeMs: 300_000,
    maximumRequiredJobOverdueIntervals: 2,
  },
  recovery: {
    databaseRpoMs: 300_000,
    databaseRtoMs: 7_200_000,
    storageRtoMs: 14_400_000,
  },
} as const;

export const SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS = {
  worker: {
    heartbeatMinimumIntervalMs: 5_000,
    heartbeatMaximumAgeMs: 180_000,
    dependencyProbeIntervalMs: 15_000,
  },
  queues: {
    concurrency: 4,
    attempts: 3,
    backoffDelayMs: 2_000,
    lockDurationMs: 120_000,
    completedRetentionSeconds: 86_400,
    completedRetentionCount: 1_000,
    failedRetentionSeconds: 2_592_000,
    failedRetentionCount: 5_000,
  },
  realtime: {
    authenticationTimeoutMs: 5_000,
    maximumSubscriptionsPerConnection: 50,
  },
  presence: {
    heartbeatIntervalMs: 25_000,
    refreshIntervalMs: 25_000,
    awayAfterMs: 120_000,
    leaseDurationMs: 90_000,
    lastSeenRetentionMs: 2_592_000_000,
    maximumClientsPerUser: 32,
    maximumConversationsPerRead: 100,
  },
  frontend: {
    queryStaleTimeMs: 180_000,
    queryGcTimeMs: 900_000,
    queryRetryCount: 1,
    apiRequestTimeoutMs: 15_000,
  },
  http: {
    requestTimeoutMs: 30_000,
    headersTimeoutMs: 15_000,
    keepAliveTimeoutMs: 5_000,
    maxRequestsPerSocket: 1_000,
    maxRequestBodyBytes: 1_048_576,
    compressionMinimumBytes: 1_024,
    shutdownGraceMs: 15_000,
  },
  providers: {
    requestTimeoutMs: 10_000,
    aiRequestTimeoutMs: 12_000,
    gatewayRequestTimeoutMs: 15_000,
    healthCheckTimeoutMs: 5_000,
    retryBaseDelayMs: 100,
    circuitFailureThreshold: 3,
    circuitCooldownMs: 30_000,
    defaultMaxAttempts: 2,
  },
  rateLimits: {
    publicRequestsPerWindow: 180,
    authenticatedRequestsPerWindow: 600,
    windowSeconds: 60,
    lockSeconds: 60,
  },
  publicCache: {
    cacheKeyVersion: "v1",
    discovery: {
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 15,
      staleWhileRevalidateSeconds: 30,
      staleIfErrorSeconds: 120,
    },
    catalog: {
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 600,
      staleIfErrorSeconds: 3_600,
    },
    reference: {
      browserMaxAgeSeconds: 300,
      sharedMaxAgeSeconds: 3_600,
      staleWhileRevalidateSeconds: 86_400,
      staleIfErrorSeconds: 86_400,
    },
  },
  commercialCatalog: {
    freshTtlMs: 60_000,
    staleIfErrorMs: 300_000,
    ttlJitterRatio: 0.1,
  },
  providerWebhookQueue: {
    claimBatchSize: 25,
    leaseSeconds: 120,
    retryBaseSeconds: 15,
    retryMaximumSeconds: 3_600,
    retryExponentCap: 7,
    processedRetentionDays: 30,
    purgeBatchSize: 1_000,
  },
  database: {
    discoveryCandidateLimit: 500,
    requestTimeoutMs: 10_000,
    healthCheckTimeoutMs: 2_000,
    performancePlanRows: 250_000,
    performancePlanMinimumRows: 100_000,
    performancePlanMaximumRows: 2_000_000,
    performancePlanStatementTimeoutMs: 120_000,
    performancePlanLockTimeoutMs: 2_000,
  },
  loadTest: {
    requestCount: 60,
    concurrency: 6,
    requestTimeoutMs: 10_000,
  },
  operations: {
    evidenceRequestTimeoutMs: 30_000,
  },
} as const;

export type PublicCacheProfileName =
  keyof typeof SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.publicCache;
