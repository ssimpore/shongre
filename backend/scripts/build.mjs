import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDirectory, "..");
const outputDirectory = resolve(backendRoot, "dist");
const backendPackage = JSON.parse(
  await readFile(resolve(backendRoot, "package.json"), "utf8"),
);
const externalRuntimeDependencies = Object.keys(
  backendPackage.dependencies ?? {},
)
  .filter((dependency) => !dependency.startsWith("@shongre/"))
  .flatMap((dependency) => [dependency, `${dependency}/*`]);

// The backend imports workspace packages whose development exports are
// TypeScript source files. Bundling the application produces an executable ESM
// artifact while keeping third-party runtime dependencies external and
// installable through the lockfile.
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: {
    server: resolve(backendRoot, "src/app/server/index.ts"),
    worker: resolve(backendRoot, "src/app/worker/index.ts"),
    "worker-health": resolve(backendRoot, "scripts/health/worker-health.ts"),
    migrate: resolve(backendRoot, "scripts/database/migrate.ts"),
  },
  outdir: outputDirectory,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  packages: "bundle",
  external: externalRuntimeDependencies,
  logLevel: "info",
});
