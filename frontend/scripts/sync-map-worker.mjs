#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

/**
 * Puts MapLibre's worker somewhere the browser can actually fetch it.
 *
 * MapLibre resolves its own worker with `new URL("./maplibre-gl-worker.mjs",
 * import.meta.url)`. Webpack evaluates `import.meta.url` at build time and
 * substitutes the module's path on the build machine, so the URL that reaches
 * the browser is
 *
 *   file:///.../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs
 *
 * which is cross-origin to the page and unfetchable. MapLibre's cross-origin
 * fallback then tries to `import` that same `file:` URL from a blob worker,
 * which fails just as quietly.
 *
 * The symptom is the reason this is a script and not a comment: the map looks
 * like it works. It is interactive, its controls respond, and the raster
 * fallback layer paints — because images are not fetched by the worker. What
 * never arrives is a single vector tile, so the style never finishes loading
 * and nothing any surface adds to it is ever drawn.
 *
 * Copying the worker under `public/` gives it a same-origin URL, which
 * `setWorkerUrl` in the map primitive points at. The copy is generated rather
 * than committed so it cannot drift from the installed package.
 *
 * The copy lives in a directory named after the installed version, and the
 * primitive builds the URL from `getVersion()` of the very module it loaded.
 * That makes the URL change exactly when the bytes change, so the files can be
 * cached as immutable — the shared runtime is half a megabyte, and it was
 * being revalidated on every listing view. Anything else under the vendor
 * directory is removed: `public/` ships wholesale in the Web image, and a
 * stale copy would ship with it.
 */

const require = createRequire(import.meta.url);
const frontendRoot = resolve(import.meta.dirname, "..");
/* The package exports only its entry point and `./dist/*`, so the manifest is
   what resolves — the worker sits beside it in `dist/`. */
const manifest = require.resolve("maplibre-gl/package.json", {
  paths: [frontendRoot],
});
const distDirectory = resolve(dirname(manifest), "dist");

/*
 * The worker is a module that imports its shared runtime from beside itself, so
 * copying it alone produces a worker that starts, fails its first import and
 * terminates — leaving the same silent no-vector-tiles symptom the copy exists
 * to fix. Both files travel together.
 */
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
const { version } = JSON.parse(readFileSync(manifest, "utf8"));
const vendorDirectory = resolve(frontendRoot, "public/vendor");
const packageDirectory = resolve(vendorDirectory, "maplibre-gl");
const versionDirectory = resolve(packageDirectory, version);
mkdirSync(versionDirectory, { recursive: true });

let removed = 0;
for (const entry of readdirSync(vendorDirectory)) {
  if (entry === "maplibre-gl") continue;
  rmSync(resolve(vendorDirectory, entry), { recursive: true, force: true });
  removed += 1;
}
for (const entry of readdirSync(packageDirectory)) {
  if (entry === version) continue;
  rmSync(resolve(packageDirectory, entry), { recursive: true, force: true });
  removed += 1;
}

let copied = 0;
for (const file of FILES) {
  const from = resolve(distDirectory, file);
  if (!existsSync(from)) {
    throw new Error(
      `MapLibre's ${file} is missing at ${from}. The package layout changed; update this script and the URL in MapContainer.`,
    );
  }
  const to = resolve(versionDirectory, file);
  const wanted = readFileSync(from);
  const current = existsSync(to) ? readFileSync(to) : null;
  if (current?.equals(wanted)) continue;
  copyFileSync(from, to);
  copied += 1;
}

console.log(
  copied || removed
    ? `Synchronized MapLibre ${version} worker files under public/vendor/maplibre-gl/ (${copied} copied, ${removed} stale entries removed).`
    : `MapLibre ${version} worker files are current.`,
);
