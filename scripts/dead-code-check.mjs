#!/usr/bin/env node
/**
 * Rejects source files no entry point can reach.
 *
 * `make lint` ran `mobile-dead-code` and nothing equivalent for the Web client
 * or the backend, so those two trees — by far the larger ones — had no guard
 * against a module surviving after its last consumer was migrated away. That is
 * the gap this closes, using the same reachability walk the mobile check has
 * always used rather than adding a dependency for it.
 *
 * Reachability is by static and dynamic `import`, plus `export … from`. A file
 * loaded another way (a framework convention, a runtime string path) must be
 * named in its workspace's `alwaysReachable` list with the reason it is there.
 *
 * Run: node scripts/dead-code-check.mjs [workspace…]
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

const WORKSPACES = {
  frontend: {
    root: "frontend",
    sourceRoot: "src",
    /** Next's App Router, the browser suite, and the edge proxy. */
    entries: ["app", "e2e", "proxy.ts", "next.config.ts"],
    aliases: { "@/": "" },
    alwaysReachable: [
      // Rendered by the App Router through the route table, which resolves
      // component modules lazily by string identity rather than by import.
      "src/App.tsx",
    ],
    retained: [],
  },
  backend: {
    root: "backend",
    sourceRoot: "src",
    /**
     * The API entry, the worker process entry (bundled by scripts/build.mjs and
     * run by `dev:worker`), the job implementations, and everything that tests
     * or tools them.
     */
    entries: [
      "src/index.ts",
      "src/app/worker/index.ts",
      "src/workers",
      "tests",
      "scripts",
    ],
    aliases: { "@/": "src/" },
    alwaysReachable: [],
    retained: [],
  },
};

function walk(directory, files = []) {
  if (!existsSync(directory)) return files;
  if (statSync(directory).isFile()) {
    if (EXTENSIONS.includes(extname(directory))) files.push(directory);
    return files;
  }
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (EXTENSIONS.includes(extname(path))) files.push(path);
  }
  return files;
}

function resolveModule(specifier, importer, workspace) {
  let candidate;
  const alias = Object.entries(workspace.aliases).find(([prefix]) =>
    specifier.startsWith(prefix),
  );
  if (alias) {
    candidate = join(
      workspace.absoluteRoot,
      alias[1],
      specifier.slice(alias[0].length),
    );
  } else if (specifier.startsWith(".")) {
    candidate = resolve(dirname(importer), specifier);
  } else {
    // A bare specifier is a package, not a file in this workspace.
    return null;
  }
  // TypeScript ESM imports name the emitted `.js`; resolve back to the source.
  const withoutJs = candidate.replace(/\.js$/, "");
  const candidates = [
    candidate,
    ...EXTENSIONS.map((extension) => `${candidate}${extension}`),
    ...EXTENSIONS.map((extension) => `${withoutJs}${extension}`),
    ...EXTENSIONS.map((extension) => join(candidate, `index${extension}`)),
  ];
  return (
    candidates.find((path) => existsSync(path) && statSync(path).isFile()) ||
    null
  );
}

function importsOf(file, workspace) {
  const source = readFileSync(file, "utf8");
  const matches = source.matchAll(
    /(?:\bimport\s+(?:[^"']+?\s+from\s+)?|\bexport\s+[^"']+?\s+from\s+|\bimport\s*\()\s*["']([^"']+)["']/g,
  );
  return [...matches]
    .map((match) => resolveModule(match[1], file, workspace))
    .filter(Boolean);
}

function checkWorkspace(name) {
  const workspace = WORKSPACES[name];
  if (!workspace) throw new Error(`Unknown workspace: ${name}`);
  workspace.absoluteRoot = join(repositoryRoot, workspace.root);
  const sourceRoot = join(workspace.absoluteRoot, workspace.sourceRoot);

  const sources = walk(sourceRoot);
  const reachable = new Set();
  const queue = [
    ...workspace.alwaysReachable.map((path) =>
      join(workspace.absoluteRoot, path),
    ),
    ...workspace.entries.flatMap((entry) =>
      walk(join(workspace.absoluteRoot, entry)),
    ),
    // Co-located test files are entry points: the runner discovers them by
    // pattern, so nothing imports them, and what they import is exercised.
    ...sources.filter((file) => /\.(test|spec)\.[tj]sx?$/.test(file)),
  ];
  while (queue.length) {
    const file = queue.pop();
    if (!file || reachable.has(file)) continue;
    reachable.add(file);
    queue.push(...importsOf(file, workspace));
  }

  // Unreferenced on purpose. Each needs a reason recorded above; the point of
  // listing them is that removing the reason removes the exemption.
  const retained = new Set(
    (workspace.retained ?? []).map((path) =>
      join(workspace.absoluteRoot, path),
    ),
  );
  const dead = sources.filter(
    (file) => !reachable.has(file) && !retained.has(file),
  );
  if (dead.length) {
    console.error(`\nUnreachable ${name} source files (${dead.length}):`);
    for (const file of dead)
      console.error(`  - ${relative(repositoryRoot, file)}`);
    return false;
  }
  const retainedNote = retained.size
    ? `, ${retained.size} retained with a recorded reason`
    : "";
  console.log(
    `${name} source graph is clean: ${sources.length - retained.size} files reachable from its entry points${retainedNote}.`,
  );
  return true;
}

const requested = process.argv.slice(2);
const targets = requested.length ? requested : Object.keys(WORKSPACES);
const results = targets.map(checkWorkspace);
if (results.some((passed) => !passed)) {
  console.error(
    "\nMigrate or delete these, or record why an entry point reaches them.\n",
  );
  process.exit(1);
}
