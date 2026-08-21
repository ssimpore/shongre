#!/usr/bin/env node
/**
 * Removes unused imports, driven by the compiler's own diagnostics.
 *
 * `tsconfig.json` does not enable `noUnusedLocals`, so unused imports accumulate
 * invisibly — 567 of them by the time this was written. Value imports are not
 * free: they keep modules in the graph and in the bundle even when nothing reads
 * them.
 *
 * The compiler decides what is unused, not a regex — that is the whole point.
 * This only edits *import* lines, never parameters or other locals: an unused
 * parameter usually exists to satisfy an interface, and deleting it changes a
 * signature rather than removing dead weight.
 *
 * It loops because removals cascade: dropping the last named binding turns the
 * statement itself into TS6192, and removing one import can leave a type-only
 * import unread.
 *
 * Run: node scripts/prune-unused-imports.mjs [--dry]
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const DRY = process.argv.includes("--dry");
const MAX_PASSES = 8;

function diagnostics() {
  try {
    execSync("npx tsc --noEmit --noUnusedLocals", {
      encoding: "utf8",
      stdio: "pipe",
    });
    return [];
  } catch (error) {
    const out = `${error.stdout || ""}${error.stderr || ""}`;
    return out
      .split("\n")
      .map((line) =>
        line.match(/^(.+?)\((\d+),(\d+)\): error TS(6133|6192): (.+)$/),
      )
      .filter(Boolean)
      .map((m) => ({
        file: m[1],
        line: Number(m[2]),
        code: m[4],
        message: m[5],
        name: (m[5].match(/'([^']+)' is declared/) || [])[1],
      }));
  }
}

/** True when `line` is part of an import statement rather than other code. */
function importRegion(lines, index) {
  // Walk back to the statement start: a named-import block spans several lines.
  for (let i = index; i >= 0 && index - i < 40; i -= 1) {
    const text = lines[i];
    if (/^\s*import\b/.test(text)) {
      let end = i;
      while (
        end < lines.length &&
        !/from\s+['"][^'"]+['"]\s*;?\s*$|^\s*import\s+['"][^'"]+['"];?\s*$/.test(
          lines[end],
        )
      ) {
        end += 1;
        if (end - i > 40) return null;
      }
      return { start: i, end };
    }
    if (text.trim() && !/^\s*[\w$*{},\s]+$/.test(text)) return null;
  }
  return null;
}

let totalRemoved = 0;

for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
  const found = diagnostics();
  if (found.length === 0) {
    console.log(`pass ${pass}: nothing left to prune`);
    break;
  }

  // Group by file, and apply from the bottom so earlier line numbers stay valid.
  const byFile = new Map();
  for (const d of found) {
    if (!d.name && d.code !== "6192") continue;
    if (!byFile.has(d.file)) byFile.set(d.file, []);
    byFile.get(d.file).push(d);
  }

  let removedThisPass = 0;

  for (const [file, items] of byFile) {
    const lines = readFileSync(file, "utf8").split("\n");
    const dropWholeStatement = new Set();
    const dropNames = new Map(); // statement start -> names

    for (const item of items) {
      const region = importRegion(lines, item.line - 1);
      if (!region) continue; // not an import: a parameter or another local — leave it

      if (item.code === "6192") {
        dropWholeStatement.add(region.start);
        continue;
      }
      if (!dropNames.has(region.start)) dropNames.set(region.start, new Set());
      dropNames.get(region.start).add(item.name);
    }

    if (dropWholeStatement.size === 0 && dropNames.size === 0) continue;

    const regions = [...new Set([...dropWholeStatement, ...dropNames.keys()])]
      .map((start) => ({ start, ...importRegion(lines, start) }))
      .filter((r) => r.end !== undefined)
      .sort((a, b) => b.start - a.start);

    for (const region of regions) {
      const statement = lines.slice(region.start, region.end + 1).join("\n");

      if (dropWholeStatement.has(region.start)) {
        lines.splice(region.start, region.end - region.start + 1);
        removedThisPass += 1;
        continue;
      }

      const names = dropNames.get(region.start) || new Set();
      let next = statement;
      for (const name of names) {
        /* Aliased bindings first. The compiler reports the *alias* ("ListIcon"
           in `List as ListIcon`), and a pattern anchored on that name alone
           deleted only the alias and left a dangling `List as` — which is a
           syntax error, not a smaller import. Match the whole pair. */
        next = next.replace(
          new RegExp(`(\\{[^}]*?)\\b\\w+\\s+as\\s+${name}\\b\\s*,?`, "s"),
          (whole, head) => head,
        );
        // Plain named binding.
        next = next.replace(
          new RegExp(`(\\{[^}]*?)\\b${name}\\b(?!\\s+as\\s)\\s*,?`, "s"),
          (whole, head) => head,
        );
        // Default import: `import Name, {…}` or `import Name from`.
        next = next.replace(
          new RegExp(`^(\\s*import\\s+)${name}\\s*,\\s*`),
          "$1",
        );
        next = next.replace(
          new RegExp(`^(\\s*import\\s+)${name}(\\s+from\\s)`),
          "$1{}$2",
        );
      }
      next = next
        .replace(/\{\s*,/g, "{")
        .replace(/,\s*,/g, ",")
        .replace(/,(\s*\})/g, "$1");

      // Nothing left to bring in: drop the statement rather than leave `import {}`.
      if (
        /import\s*(\{\s*\})?\s*from/.test(next) ||
        /^\s*import\s*\{\s*\}\s*;?\s*$/.test(next)
      ) {
        lines.splice(region.start, region.end - region.start + 1);
      } else {
        lines.splice(
          region.start,
          region.end - region.start + 1,
          ...next.split("\n"),
        );
      }
      removedThisPass += names.size;
    }

    if (!DRY) writeFileSync(file, lines.join("\n"));
  }

  totalRemoved += removedThisPass;
  console.log(`pass ${pass}: pruned ${removedThisPass} (${byFile.size} files)`);
  if (DRY || removedThisPass === 0) break;
}

console.log(`\ntotal pruned: ${totalRemoved}`);
