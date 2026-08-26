import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { runPsql } from "./psql.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const migrationDirectoryCandidates = [
  process.env.MIGRATIONS_DIRECTORY,
  path.resolve(currentDirectory, "../supabase/migrations"),
  path.resolve(currentDirectory, "../../supabase/migrations"),
  path.resolve(process.cwd(), "supabase/migrations"),
].filter((candidate): candidate is string => Boolean(candidate));

const migrationsDirectory = migrationDirectoryCandidates.find((candidate) =>
  fs.existsSync(candidate),
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

function migrationChecksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

function listMigrationFiles(): string[] {
  if (!migrationsDirectory) {
    throw new Error(
      `Migrations directory not found. Checked: ${migrationDirectoryCandidates.join(", ")}`,
    );
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

  const environmentId = process.env.ENVIRONMENT_ID;
  const databaseEnvironmentId = process.env.DATABASE_ENVIRONMENT_ID;
  if (!environmentId || !databaseEnvironmentId) {
    throw new Error(
      "ENVIRONMENT_ID and DATABASE_ENVIRONMENT_ID are required before changing a database.",
    );
  }
  if (environmentId !== databaseEnvironmentId) {
    throw new Error(
      `Database target mismatch: DATABASE_ENVIRONMENT_ID=${databaseEnvironmentId} does not match ENVIRONMENT_ID=${environmentId}.`,
    );
  }
  if (process.env.MIGRATION_APPROVAL !== environmentId) {
    throw new Error(
      `Set MIGRATION_APPROVAL=${environmentId} for this dedicated migration invocation.`,
    );
  }

  runPsql(
    databaseUrl,
    `CREATE SCHEMA IF NOT EXISTS supabase_migrations;
     CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
       version text PRIMARY KEY,
       statements text[],
       name text,
       checksum text
     );
     ALTER TABLE supabase_migrations.schema_migrations
       ADD COLUMN IF NOT EXISTS statements text[],
       ADD COLUMN IF NOT EXISTS name text,
       ADD COLUMN IF NOT EXISTS checksum text;`,
  );

  let appliedCount = 0;
  let adoptedChecksumCount = 0;
  for (const file of files) {
    const version = migrationVersion(file);
    const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
    const sql = fs.readFileSync(path.join(migrationsDirectory, file), "utf8");
    const checksum = migrationChecksum(sql);
    const existingChecksum = runPsql(
      databaseUrl,
      `SELECT COALESCE(checksum, '')
       FROM supabase_migrations.schema_migrations
       WHERE version = ${quoteLiteral(version)};`,
    );
    const alreadyApplied = runPsql(
      databaseUrl,
      `SELECT EXISTS (
        SELECT 1 FROM supabase_migrations.schema_migrations
        WHERE version = ${quoteLiteral(version)}
      );`,
    );
    if (alreadyApplied === "t") {
      if (existingChecksum && existingChecksum !== checksum) {
        throw new Error(
          `Migration drift detected for ${file}: the applied checksum does not match the repository. Create a new forward migration instead of editing history.`,
        );
      }
      if (!existingChecksum) {
        runPsql(
          databaseUrl,
          `UPDATE supabase_migrations.schema_migrations
           SET checksum = ${quoteLiteral(checksum)}, name = COALESCE(name, ${quoteLiteral(name)})
           WHERE version = ${quoteLiteral(version)};`,
        );
        adoptedChecksumCount += 1;
        console.log(`Recorded baseline checksum for ${file}.`);
      }
      continue;
    }

    runPsql(
      databaseUrl,
      `BEGIN;
${sql}
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, checksum)
VALUES (${quoteLiteral(version)}, ARRAY[]::text[], ${quoteLiteral(name)}, ${quoteLiteral(checksum)});
COMMIT;`,
    );
    appliedCount += 1;
    console.log(`Applied ${file}.`);
  }

  console.log(
    `Migration complete: ${appliedCount} applied, ${files.length - appliedCount} already current, ${adoptedChecksumCount} legacy checksums baselined.`,
  );
}

runMigrations().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown migration error.";
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
});
