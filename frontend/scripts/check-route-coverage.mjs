#!/usr/bin/env node
/**
 * Every routed screen must appear in the end-to-end route matrix.
 *
 * The responsive and accessibility suites do not enumerate the router: they
 * iterate `e2e/routes.ts`. That indirection is deliberate — a route needs a
 * persona and, when it is dynamic, a real fixture id — but it meant the two
 * lists silently drifted apart. At the point this check was written the router
 * declared 160 routes and the matrix exercised 69 of them, so 57% of the
 * product had never been checked for horizontal overflow, axe violations or
 * accessible names at any viewport. The gap was invisible because both suites
 * were green: they were green over the half of the app that was listed.
 *
 * A dynamic route counts as covered when some tested path matches its pattern,
 * so `/annonce/:id` is satisfied by `/annonce/list-117`.
 *
 * Run: node scripts/check-route-coverage.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { collectStaticRoutes } from "./lib/route-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routerFile = path.join(root, "src/app/router/index.tsx");
const matrixFile = path.join(root, "e2e/routes.ts");

/**
 * Routes that cannot be rendered in isolation, with the reason. Anything added
 * here should name why a browser cannot simply visit it.
 */
const UNTESTABLE = new Map([
  [
    "/auth/callback",
    "consumes a one-time OAuth code and redirects; it has no standing render",
  ],
  [
    "/auth/domain-handoff",
    "exchanges a cross-domain session token and redirects immediately",
  ],
]);

const routerSource = fs.readFileSync(routerFile, "utf8");
const ast = ts.createSourceFile(
  routerFile,
  routerSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

const routes = collectStaticRoutes(ast);

const matrixSource = fs.readFileSync(matrixFile, "utf8");
const tested = [...matrixSource.matchAll(/path:\s*[`"']([^`"']+)[`"']/g)].map(
  (match) => match[1].split("?")[0],
);

const toPattern = (route) =>
  new RegExp(
    `^${route
      .split("/")
      .map((segment) =>
        segment.startsWith(":")
          ? "[^/]+"
          : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      )
      .join("/")}$`,
  );

const uncovered = [...routes]
  .filter((route) => !UNTESTABLE.has(route))
  .filter((route) => {
    const pattern = toPattern(route);
    return !tested.some((candidate) => pattern.test(candidate));
  })
  .sort();

const stale = [...UNTESTABLE.keys()].filter((route) => !routes.has(route));

if (stale.length > 0) {
  console.error(
    `\n✘ route coverage: ${stale.length} exemption(s) name a route that no longer exists.\n`,
  );
  for (const route of stale) console.error(`  ${route}`);
  console.error("");
}

if (uncovered.length > 0) {
  console.error(
    `\n✘ route coverage: ${uncovered.length} routed screen(s) are absent from e2e/routes.ts.\n`,
  );
  console.error(
    "  The responsive and accessibility suites iterate that file, so an unlisted",
  );
  console.error(
    "  route is never checked for overflow, axe violations or accessible names.",
  );
  console.error(
    "  Add it with a persona (and a real fixture id if it is dynamic), or record",
  );
  console.error("  it in UNTESTABLE here with the reason it cannot render.\n");
  for (const route of uncovered) console.error(`  ${route}`);
  console.error("");
}

if (uncovered.length > 0 || stale.length > 0) process.exit(1);

console.log(
  `✔ route coverage: all ${routes.size - UNTESTABLE.size} routed screens are in the end-to-end matrix`,
);
