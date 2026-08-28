import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const typesOutputPath = path.resolve(
  currentDirectory,
  "../../src/generated/database.types.ts",
);
const checkOnly = process.argv.includes("--check");

function generateTypes(): void {
  const databaseUrl = process.env.DATABASE_URL;
  const projectReference = process.env.SUPABASE_PROJECT_REF;
  const args = ["gen", "types", "typescript"];

  if (databaseUrl) args.push("--db-url", databaseUrl);
  else if (projectReference) args.push("--project-id", projectReference);
  else
    throw new Error(
      "DATABASE_URL or SUPABASE_PROJECT_REF is required to generate database types.",
    );

  const result = spawnSync("supabase", args, {
    encoding: "utf8",
    env: process.env,
  });
  if (result.error)
    throw new Error(
      `Unable to start the Supabase CLI: ${result.error.message}`,
    );
  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        `Supabase CLI exited with status ${result.status ?? "unknown"}.`,
    );
  }
  if (!result.stdout.includes("export type Database")) {
    throw new Error(
      "Supabase CLI did not return a valid Database type definition.",
    );
  }

  if (checkOnly) {
    const current = fs.readFileSync(typesOutputPath, "utf8");
    if (current !== result.stdout) {
      throw new Error(
        "Generated database types are stale. Run npm run db:types --workspace=backend against the migrated schema.",
      );
    }
    console.log(`Database types are current at ${typesOutputPath}.`);
    return;
  }

  fs.mkdirSync(path.dirname(typesOutputPath), { recursive: true });
  fs.writeFileSync(typesOutputPath, result.stdout, "utf8");
  console.log(`Generated database types at ${typesOutputPath}.`);
}

try {
  generateTypes();
} catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown type generation error.";
  console.error(`Database type generation failed: ${message}`);
  process.exitCode = 1;
}
