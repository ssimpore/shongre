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

  runPsqlFile(databaseUrl, seedSqlPath);
  console.log("Canonical reference data applied in one transaction.");
}

runSeed().catch((err) => {
  const message = err instanceof Error ? err.message : "Unknown seed error.";
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
