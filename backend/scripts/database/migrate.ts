import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPsql } from "./psql.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const migrationsDirectory = path.resolve(
  currentDirectory,
  "../../supabase/migrations",
);

function migrationVersion(fileName: string): string {
  const match = /^(\d+)_/.exec(fileName);
  if (!match)
    throw new Error(
      `Migration file must start with a numeric version: ${fileName}`,
    );
  return match[1];
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function listMigrationFiles(): string[] {
  if (!fs.existsSync(migrationsDirectory)) {
    throw new Error(`Migrations directory not found at ${migrationsDirectory}`);
  }

  const files = fs
    .readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const versions = files.map(migrationVersion);
  if (new Set(versions).size !== versions.length)
    throw new Error("Migration versions must be unique.");
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDirectory, file), "utf8");
    if (sql.trim().length === 0) throw new Error(`Migration is empty: ${file}`);
  }
  return files;
}

async function runMigrations() {
  const files = listMigrationFiles();
  console.log(`Validated ${files.length} ordered SQL migration files.`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log(
      "DATABASE_URL is not set; validation completed without changing a database.",
    );
    return;
  }

  runPsql(
    databaseUrl,
    `CREATE SCHEMA IF NOT EXISTS supabase_migrations;
     CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
       version text PRIMARY KEY,
       statements text[],
       name text
     );
     ALTER TABLE supabase_migrations.schema_migrations
       ADD COLUMN IF NOT EXISTS statements text[],
       ADD COLUMN IF NOT EXISTS name text;`,
  );

  let appliedCount = 0;
  for (const file of files) {
    const version = migrationVersion(file);
    const alreadyApplied = runPsql(
      databaseUrl,
      `SELECT EXISTS (
         SELECT 1 FROM supabase_migrations.schema_migrations
         WHERE version = ${quoteLiteral(version)}
       );`,
    );
    if (alreadyApplied === "t") continue;

    const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
    const sql = fs.readFileSync(path.join(migrationsDirectory, file), "utf8");
    runPsql(
      databaseUrl,
      `BEGIN;
${sql}
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (${quoteLiteral(version)}, ARRAY[]::text[], ${quoteLiteral(name)});
COMMIT;`,
    );
    appliedCount += 1;
    console.log(`Applied ${file}.`);
  }

  console.log(
    `Migration complete: ${appliedCount} applied, ${files.length - appliedCount} already current.`,
  );
}

runMigrations().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown migration error.";
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
});
