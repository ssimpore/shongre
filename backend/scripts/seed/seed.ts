import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPsqlFile } from "../database/psql.js";
import { seedLocalDevelopmentData } from "./local-development-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedSqlPath = path.resolve(__dirname, "../../supabase/seed/seed.sql");
const taxonomySeedSqlPath = path.resolve(
  __dirname,
  "../../supabase/seed/taxonomy-v4.generated.sql",
);

async function runSeed() {
  console.log("Validating Shongre canonical reference data...");
  if (!fs.existsSync(seedSqlPath)) {
    throw new Error(`Seed SQL not found at ${seedSqlPath}`);
  }
  if (!fs.existsSync(taxonomySeedSqlPath)) {
    throw new Error(`Taxonomy seed SQL not found at ${taxonomySeedSqlPath}`);
  }

  const sql = fs.readFileSync(seedSqlPath, "utf8");
  const taxonomySql = fs.readFileSync(taxonomySeedSqlPath, "utf8");
  if (sql.trim().length === 0) throw new Error("Canonical seed SQL is empty.");
  if (taxonomySql.trim().length === 0) {
    throw new Error("Canonical taxonomy seed SQL is empty.");
  }
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

  runPsqlFile(databaseUrl, taxonomySeedSqlPath, {
    singleTransaction: false,
  });
  console.log("Canonical taxonomy v4 applied to local Supabase.");
  runPsqlFile(databaseUrl, seedSqlPath);
  console.log("Canonical reference data applied in one transaction.");
  const summary = await seedLocalDevelopmentData();
  console.log(
    `Local development scenario applied: ${summary.profiles} profiles, ${summary.genericListings} marketplace listings, ${summary.vehicles} vehicles, ${summary.properties} properties, ${summary.tutors} tutors, ${summary.courseOffers} course offers, ${summary.jobs} jobs, ${summary.conversations} conversations, ${summary.messages} messages, ${summary.transactions} transactions, ${summary.notifications} notifications, ${summary.savedSearches} saved searches, ${summary.reviews} reviews, ${summary.trendingTopics} trending topics, and ${summary.publicStorageObjects} public Storage objects.`,
  );
}

runSeed().catch((err) => {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String(err.message)
        : JSON.stringify(err);
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
