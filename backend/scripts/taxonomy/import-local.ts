import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runPsql, runPsqlFile } from "../database/psql.js";

const directory = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(
  directory,
  "../../supabase/seed/taxonomy-v4.generated.sql",
);
const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.DATABASE_URL;

if (process.env.APP_ENV !== "local" || process.env.NODE_ENV === "production") {
  throw new Error("Taxonomy import is available only with APP_ENV=local.");
}
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const connection = new URL(databaseUrl);
if (
  !["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(connection.hostname)
) {
  throw new Error("Taxonomy import refuses non-loopback database targets.");
}
if (process.env.TAXONOMY_IMPORT_APPROVAL !== "local") {
  throw new Error("TAXONOMY_IMPORT_APPROVAL=local is required.");
}

const tables = [
  "categories",
  "taxonomy_attributes",
  "taxonomy_attribute_groups",
  "taxonomy_option_sets",
  "taxonomy_options",
  "taxonomy_option_parent_links",
  "taxonomy_listing_types",
  "taxonomy_attribute_bindings",
  "taxonomy_dependency_rules",
  "taxonomy_validation_rules",
  "taxonomy_market_availability",
  "taxonomy_seller_rules",
  "taxonomy_imports",
  "taxonomy_aliases",
] as const;

const source = readFileSync(seedPath, "utf8");
const statements = source
  .replace(/^([\s\S]*?\n)?BEGIN;\s*/m, (match) =>
    match.replace(/BEGIN;\s*$/, ""),
  )
  .replace(/\s*COMMIT;\s*$/, "");

function snapshotSql(target: "taxonomy_before" | "taxonomy_after"): string {
  const rows = tables
    .map(
      (table) => `SELECT '${table}'::text AS table_name,
        COUNT(*)::bigint AS row_count,
        md5(COALESCE(string_agg(payload::text, '|' ORDER BY payload::text), '')) AS checksum
      FROM (
        SELECT to_jsonb(item) - 'created_at' - 'updated_at' AS payload
        FROM public.${table} item
      ) snapshot`,
    )
    .join("\nUNION ALL\n");
  return `CREATE TEMP TABLE ${target} ON COMMIT DROP AS ${rows};`;
}

function diffSql(): string {
  return `SELECT COALESCE(json_agg(diff ORDER BY table_name)::text, '[]')
    FROM (
      SELECT prior_snapshot.table_name,
             prior_snapshot.row_count AS before_count,
             next_snapshot.row_count AS after_count,
             prior_snapshot.checksum AS before_checksum,
             next_snapshot.checksum AS after_checksum
      FROM taxonomy_before prior_snapshot
      JOIN taxonomy_after next_snapshot USING (table_name)
      WHERE prior_snapshot.row_count <> next_snapshot.row_count
         OR prior_snapshot.checksum <> next_snapshot.checksum
    ) diff;`;
}

function inspectDiff(): string {
  return runPsql(
    databaseUrl,
    `BEGIN;
     ${snapshotSql("taxonomy_before")}
     ${statements}
     ${snapshotSql("taxonomy_after")}
     ${diffSql()}
     ROLLBACK;`,
  );
}

const before = inspectDiff();
if (dryRun) {
  console.log(`Taxonomy v4 local dry-run diff: ${before}`);
} else {
  runPsqlFile(databaseUrl, seedPath);
  const secondRun = inspectDiff();
  if (secondRun !== "[]") {
    throw new Error(
      `Taxonomy import is not idempotent; second-run diff: ${secondRun}`,
    );
  }
  console.log(
    `Taxonomy v4 local import applied. Empty second-run diff: ${secondRun}`,
  );
}
