import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPsqlFile } from "../database/psql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedSqlPath = path.resolve(__dirname, "../../supabase/seed/seed.sql");

async function runSeed() {
  console.log("Validating Shongre canonical reference data...");
  if (!fs.existsSync(seedSqlPath)) {
    throw new Error(`Seed SQL not found at ${seedSqlPath}`);
  }

  const sql = fs.readFileSync(seedSqlPath, "utf8");
  if (sql.trim().length === 0) throw new Error("Canonical seed SQL is empty.");
  console.log(`Validated canonical seed entrypoint (${sql.length} bytes).`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log(
      "DATABASE_URL is not set; validation completed without changing a database.",
    );
    return;
  }

  if (
    process.env.APP_ENV !== "local" ||
    process.env.NODE_ENV === "production"
  ) {
    throw new Error(
      "Demo seed execution is allowed only in APP_ENV=local. Apply migration-driven reference data elsewhere.",
    );
  }
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Refusing to mutate a database without ALLOW_DEMO_SEED=true. Use the guarded root db-seed target for local development.",
    );
  }

  runPsqlFile(databaseUrl, seedSqlPath);
  console.log("Canonical reference data applied in one transaction.");
}

runSeed().catch((err) => {
  const message = err instanceof Error ? err.message : "Unknown seed error.";
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
