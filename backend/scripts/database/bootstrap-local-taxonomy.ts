import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runPsql } from "./psql.js";

/** Fresh local databases need the reviewed taxonomy before reference conversion. */
export function bootstrapLocalTaxonomy(databaseUrl: string): void {
  // Hosted databases require their own reviewed import; local fixture authority
  // must never extend to them, including a caller-supplied loopback connection.
  if (
    process.env.APP_ENV !== "local" ||
    process.env.DATABASE_INFRA_MODE !== "local"
  ) {
    return;
  }
  const connection = new URL(databaseUrl);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(connection.hostname) ||
    connection.hostname !== process.env.SUPABASE_HOST ||
    connection.port !== process.env.SUPABASE_DB_PORT ||
    connection.pathname !== "/postgres"
  ) {
    throw new Error(
      "Local taxonomy migration bootstrap requires the configured repository-owned Supabase database.",
    );
  }
  if (
    runPsql(
      databaseUrl,
      `SELECT EXISTS (SELECT 1 FROM public.taxonomy_configuration)
         OR EXISTS (SELECT 1 FROM public.taxonomy_publications)
         OR EXISTS (SELECT 1 FROM public.taxonomy_imports)
         OR EXISTS (SELECT 1 FROM public.categories WHERE source_key IS NOT NULL)
         OR EXISTS (SELECT 1 FROM public.profiles)
         OR EXISTS (SELECT 1 FROM public.listings)`,
    ) === "t"
  ) {
    return;
  }
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(new URL("../taxonomy/import-local.ts", import.meta.url)),
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        TAXONOMY_IMPORT_APPROVAL: "local",
      },
      stdio: "inherit",
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      "Guarded local taxonomy import failed before migration 00125.",
    );
  }
}
