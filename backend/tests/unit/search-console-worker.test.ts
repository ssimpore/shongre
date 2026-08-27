import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../../src/app/config/index.js";
import { SearchConsoleWorker } from "../../src/workers/analytics/search-console-worker.js";

describe("SearchConsoleWorker", () => {
  const originalMode = config.analyticsMode;
  const originalProvider = { ...config.analyticsProviders.searchConsole };
  const originalInfrastructure = { ...config.marketInfrastructure };

  beforeEach(() => {
    config.analyticsMode = "test";
    config.analyticsProviders.searchConsole = {
      enabled: true,
      serviceAccountJson: JSON.stringify({
        client_email: "analytics@example.invalid",
        private_key: "not-used-by-test",
      }),
      siteUrls: ["https://shongre.fr/"],
    };
    config.marketInfrastructure = {
      franceDomain: "shongre.fr",
      globalDomain: "shongre.com",
      canonicalProtocol: "https",
    };
  });

  afterEach(() => {
    config.analyticsMode = originalMode;
    config.analyticsProviders.searchConsole = { ...originalProvider };
    config.marketInfrastructure = { ...originalInfrastructure };
  });

  it("imports finalized rows idempotently and skips pages outside known markets", async () => {
    const writes: Array<{ table: string; rows: unknown }> = [];
    const client = {
      from(table: string) {
        return {
          async upsert(rows: unknown) {
            writes.push({ table, rows });
            return { error: null };
          },
        };
      },
    };
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            rows: [
              {
                keys: [
                  "2026-08-24",
                  "annonces occasion",
                  "https://shongre.fr/annonces?q=secret",
                  "fra",
                  "MOBILE",
                ],
                clicks: 12,
                impressions: 240,
                ctr: 0.05,
                position: 4.2,
              },
              {
                keys: [
                  "2026-08-24",
                  "unknown",
                  "https://unrelated.example/page",
                  "fra",
                  "DESKTOP",
                ],
                clicks: 1,
                impressions: 3,
                ctr: 0.33,
                position: 9,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const worker = new SearchConsoleWorker({
      fetcher: fetcher as typeof fetch,
      tokenProvider: async () => "test-access-token",
      client: () => client,
    });

    await expect(worker.run()).resolves.toEqual({ sites: 1, rows: 1 });
    expect(writes[0]).toMatchObject({
      table: "analytics_seo_daily",
      rows: [{ market_code: "FR", page: "https://shongre.fr/annonces" }],
    });
    expect(writes.at(-1)).toMatchObject({
      table: "analytics_sync_state",
      rows: {
        provider: "search_console",
        scope: "https://shongre.fr/",
        last_error_code: null,
      },
    });
  });
});
