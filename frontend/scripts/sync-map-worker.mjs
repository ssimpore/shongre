#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
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
const vendorDirectory = resolve(frontendRoot, "public/vendor");
mkdirSync(vendorDirectory, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const from = resolve(distDirectory, file);
  if (!existsSync(from)) {
    throw new Error(
      `MapLibre's ${file} is missing at ${from}. The package layout changed; update this script and the URL in MapContainer.`,
    );
  }
  const to = resolve(vendorDirectory, file);
  const wanted = readFileSync(from);
  const current = existsSync(to) ? readFileSync(to) : null;
  if (current?.equals(wanted)) continue;
  copyFileSync(from, to);
  copied += 1;
}

console.log(
  copied
    ? `Copied ${copied} MapLibre worker file(s) to public/vendor/.`
    : "MapLibre worker files are current.",
);
