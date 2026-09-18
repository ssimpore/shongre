/**
 * Merges the JSON reports of several Playwright invocations into one.
 *
 * The isolated runner drives one browser through a regular phase and a
 * serial phase (and non-Blink engines through shards); each invocation writes
 * its own report, and the triage must read the whole run. Suites and errors
 * are concatenated; the stats are summed; the config of the first part is
 * kept for the fields readers expect.
 *
 * Usage: node scripts/lib/merge-playwright-reports.mjs <output.json> <part.json>…
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function mergeReports(reports) {
  const merged = {
    config: reports[0]?.config ?? {},
    suites: [],
    errors: [],
    stats: {
      startTime: reports[0]?.stats?.startTime,
      duration: 0,
      expected: 0,
      skipped: 0,
      unexpected: 0,
      flaky: 0,
    },
  };
  for (const report of reports) {
    merged.suites.push(...(report.suites ?? []));
    merged.errors.push(...(report.errors ?? []));
    for (const key of [
      "duration",
      "expected",
      "skipped",
      "unexpected",
      "flaky",
    ]) {
      merged.stats[key] += Number(report.stats?.[key] ?? 0);
    }
  }
  return merged;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [output, ...parts] = process.argv.slice(2);
  if (!output) {
    console.error(
      "Usage: node scripts/lib/merge-playwright-reports.mjs <output.json> <part.json>…",
    );
    process.exit(2);
  }
  const reports = parts
    .filter((part) => existsSync(part))
    .map((part) => JSON.parse(readFileSync(part, "utf8")));
  writeFileSync(output, `${JSON.stringify(mergeReports(reports), null, 2)}\n`);
  console.log(
    `Merged ${reports.length} Playwright report part(s) into ${output} (${reports.reduce(
      (total, report) => total + (report.suites ?? []).length,
      0,
    )} suites).`,
  );
}
