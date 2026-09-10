import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const typesOutputPath = path.resolve(
  currentDirectory,
  "../../src/generated/database.types.ts",
);
const checkOnly = process.argv.includes("--check");

async function generateTypes(): Promise<void> {
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
    maxBuffer: 20 * 1024 * 1024,
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
  const generated = await format(result.stdout, { parser: "typescript" });

  if (
    fs.existsSync(typesOutputPath) &&
    fs.readFileSync(typesOutputPath, "utf8") === generated
  ) {
    console.log(`Database types are current at ${typesOutputPath}.`);
    return;
  }
  if (checkOnly) {
    throw new Error(
      "Generated database types are stale. Run make db-types against the migrated schema.",
    );
  }

  fs.mkdirSync(path.dirname(typesOutputPath), { recursive: true });
  fs.writeFileSync(typesOutputPath, generated, "utf8");
  console.log(`Generated database types at ${typesOutputPath}.`);
}

try {
  await generateTypes();
} catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown type generation error.";
  console.error(`Database type generation failed: ${message}`);
  process.exitCode = 1;
}
