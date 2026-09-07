import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function findUndeclaredOperationRemovals(
  previous,
  current,
  now = Date.now(),
) {
  const methods = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "trace",
  ];
  const removed = [];
  for (const [path, pathItem] of Object.entries(previous.paths || {})) {
    for (const method of methods) {
      if (pathItem[method] && !current.paths?.[path]?.[method]) {
        const deprecated = pathItem[method].deprecated === true;
        const sunset = pathItem[method]["x-sunset-at"];
        const sunsetAt = typeof sunset === "string" ? Date.parse(sunset) : NaN;
        if (!deprecated || !Number.isFinite(sunsetAt) || sunsetAt > now) {
          removed.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
  }
  return removed;
}

async function main() {
  const baseRef = process.env.OPENAPI_BASE_REF;
  if (!baseRef) {
    console.log(
      "OPENAPI_BASE_REF is unset; breaking-change comparison skipped locally.",
    );
    return;
  }

  let previous;
  try {
    previous = JSON.parse(
      execFileSync("git", ["show", `${baseRef}:backend/openapi/openapi.json`], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      }),
    );
  } catch {
    throw new Error(
      `Cannot read the canonical OpenAPI contract from OPENAPI_BASE_REF=${baseRef}. Refusing to certify an unverified comparison.`,
    );
  }
  const current = JSON.parse(
    await readFile("backend/openapi/openapi.json", "utf8"),
  );
  const removed = findUndeclaredOperationRemovals(previous, current);
  if (removed.length) {
    console.error(
      "Undeclared breaking OpenAPI removals:\n" + removed.join("\n"),
    );
    process.exitCode = 1;
    return;
  }
  console.log("No undeclared OpenAPI operation removals detected.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
