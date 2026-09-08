import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importBaselineCommercialCatalog } from "../../scripts/monetization/import-baseline.js";

const database = vi.hoisted(() => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  };
  return { query, from: vi.fn(() => query), rpc: vi.fn() };
});
vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: () => database,
}));

const seed = readFileSync(
  new URL("../../supabase/seed/seed.sql", import.meta.url),
  "utf8",
);
const runner = readFileSync(
  new URL("../../scripts/seed/seed.ts", import.meta.url),
  "utf8",
);

describe("local database seed entrypoint", () => {
  it("seeds current-schema catalogues without replaying historical migrations", () => {
    expect(seed).not.toMatch(/migrations\//);
    expect(seed).toContain("\\ir courses.sql");
    expect(seed).toContain("\\ir auto.sql");
    expect(seed).toContain("\\ir real-estate.sql");
    expect(seed).not.toContain("\\ir taxonomy-v1.generated.sql");
    expect(runner).toContain("taxonomy-v1.generated.sql");
    expect(
      runner.indexOf("runPsqlFile(databaseUrl, taxonomySeedSqlPath"),
    ).toBeLessThan(runner.indexOf("runPsqlFile(databaseUrl, seedSqlPath)"));
  });

  it("adds the synthetic database and Storage scenario after reference data", () => {
    expect(runner).toContain("seedLocalDevelopmentData");
    expect(runner.indexOf("runPsqlFile")).toBeLessThan(
      runner.indexOf("await seedLocalDevelopmentData"),
    );
  });
});

describe("commercial catalogue bootstrap during local seeding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.query.limit.mockResolvedValue({ data: [], error: null });
    database.rpc.mockResolvedValue({ error: null });
  });

  it("preserves an existing catalogue without reinstalling or activating a release", async () => {
    database.query.limit.mockResolvedValue({
      data: [{ id: "editorial-release" }],
      error: null,
    });
    await importBaselineCommercialCatalog({ onlyIfMissing: true });
    expect(database.from).toHaveBeenCalledWith(
      "commercial_configuration_versions",
    );
    expect(database.query.eq).toHaveBeenCalledWith(
      "rule_set_id",
      "commercial-core",
    );
    expect(database.query.eq).toHaveBeenCalledWith("market_code", "FR");
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it("installs the baseline when the market has no catalogue", async () => {
    await importBaselineCommercialCatalog({ onlyIfMissing: true });
    expect(database.rpc).toHaveBeenCalledWith(
      "install_commercial_catalog_release",
      expect.objectContaining({
        p_catalog: expect.objectContaining({ marketCode: "FR" }),
      }),
    );
  });

  it("fails on a database read error instead of assuming a missing catalogue", async () => {
    const error = new Error("database unavailable");
    database.query.limit.mockResolvedValue({ data: null, error });
    await expect(
      importBaselineCommercialCatalog({ onlyIfMissing: true }),
    ).rejects.toBe(error);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it("retains conflict checks for an explicitly requested import", async () => {
    const error = new Error("commercial catalog release id already exists");
    database.rpc.mockResolvedValue({ error });
    await expect(importBaselineCommercialCatalog()).rejects.toBe(error);
    expect(database.from).not.toHaveBeenCalled();
  });
});
