import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const temporary = await mkdtemp(join(tmpdir(), "shongre-openapi-"));
try {
  const output = join(temporary, "openapi.yaml");
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "node_modules/.bin/redocly"),
      "bundle",
      "backend/openapi/openapi.json",
      "--output",
      output,
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error("OpenAPI YAML export failed");
  await writeFile(
    resolve(root, "backend/openapi/openapi.yaml"),
    "# AUTO-GENERATED from openapi.json. DO NOT EDIT.\n" +
      (await readFile(output, "utf8")),
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
