import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapLocalTaxonomy } from "../../scripts/database/bootstrap-local-taxonomy.js";

const { runPsql, spawnSync } = vi.hoisted(() => ({
  runPsql: vi.fn(),
  spawnSync: vi.fn(),
}));
vi.mock("../../scripts/database/psql.js", () => ({ runPsql }));
vi.mock("node:child_process", () => ({ spawnSync }));

const localUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("local taxonomy prerequisite for migration 00125", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("DATABASE_INFRA_MODE", "local");
    vi.stubEnv("SUPABASE_HOST", "127.0.0.1");
    vi.stubEnv("SUPABASE_DB_PORT", "54322");
    runPsql.mockReturnValue("f");
    spawnSync.mockReturnValue({ status: 0 });
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(["test", "preview", "development", "staging", "production"])(
    "never imports local data in %s",
    (environment) => {
      vi.stubEnv("APP_ENV", environment);
      bootstrapLocalTaxonomy(localUrl);
      expect(runPsql).not.toHaveBeenCalled();
      expect(spawnSync).not.toHaveBeenCalled();
    },
  );

  it("never imports into hosted infrastructure", () => {
    vi.stubEnv("DATABASE_INFRA_MODE", "hosted");
    bootstrapLocalTaxonomy(localUrl);
    expect(runPsql).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it.each([
    "postgresql://postgres:postgres@db.example.test:54322/postgres",
    "postgresql://postgres:postgres@127.0.0.1:54323/postgres",
    "postgresql://postgres:postgres@127.0.0.1:54322/another_database",
  ])("refuses an unrelated database: %s", (url) => {
    expect(() => bootstrapLocalTaxonomy(url)).toThrow("repository-owned");
    expect(runPsql).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it("preserves existing taxonomy or customer content", () => {
    runPsql.mockReturnValue("t");
    bootstrapLocalTaxonomy(localUrl);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it("reuses the guarded importer for an empty local database", () => {
    bootstrapLocalTaxonomy(localUrl);
    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      ["--import", "tsx", expect.stringContaining("/taxonomy/import-local.ts")],
      expect.objectContaining({
        env: expect.objectContaining({
          DATABASE_URL: localUrl,
          TAXONOMY_IMPORT_APPROVAL: "local",
        }),
      }),
    );
  });

  it("aborts migration when the guarded import fails", () => {
    spawnSync.mockReturnValue({ status: 1 });
    expect(() => bootstrapLocalTaxonomy(localUrl)).toThrow("import failed");
  });
});
