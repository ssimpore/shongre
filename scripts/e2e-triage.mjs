#!/usr/bin/env node
/**
 * Tells a new browser-suite failure from one that was already there.
 *
 * The suite fails around a hundred tests on a clean tree. That is not a signal
 * anybody can act on: proving a change is safe means running the suite twice,
 * once with the work stashed, and diffing two lists of names by hand. It was
 * done that way three times in one session, and one of those times it caught a
 * real regression that would otherwise have been dismissed as noise.
 *
 * So the failures are recorded. This compares a run against that record and
 * fails only on a failure that is *new*, which is the only kind anyone can do
 * anything about. It also names failures that have started passing, because a
 * baseline nobody shrinks is a quarantine that becomes permanent.
 *
 *   node scripts/e2e-triage.mjs --report <playwright.json>
 *   node scripts/e2e-triage.mjs --report <playwright.json> --update
 *   node scripts/e2e-triage.mjs --report <playwright.json> --merge
 *
 * `--update` replaces the record with what this run saw, which is how the list
 * shrinks. `--merge` adds to it, which is how the list learns about a flake:
 * two clean runs of this suite disagree by roughly seven tests, so a record
 * built from a single run reports the *next* run's different flakes as
 * regressions. Absorb a second clean run with `--merge` once; after that, a
 * name that appears is genuinely new.
 *
 * The record is not a list of tests that are allowed to fail forever. Every
 * entry is a defect or a flake somebody has to own, and the file is the
 * inventory of that debt.
 *
 * Run it on an otherwise idle machine. A suite sharing a laptop with a second
 * Playwright run took 1.9 hours instead of 36 minutes and reported 575 failures
 * instead of 103 — every extra one a timeout. This tool cannot tell a starved
 * run from a broken branch, and a result it cannot trust is worse than no
 * result, because it looks like 200 regressions.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { argv, exit } from "node:process";

const BASELINE = new URL(
  "../frontend/e2e/known-failures.json",
  import.meta.url,
);

function argument(name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function collect(suite, ancestry, out) {
  const title = [...ancestry, suite.title].filter(Boolean);
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      // "expected" covers a pass and a documented skip; a test that failed and
      // then passed on retry is flaky, which is its own kind of no-signal.
      const status = test.status;
      if (status === "expected" || status === "skipped") continue;
      out.push({
        id: `${spec.file ?? suite.file ?? "?"} › ${[...title.slice(1), spec.title].join(" › ")} › ${test.projectName ?? "?"}`,
        status,
      });
    }
  }
  for (const child of suite.suites ?? []) collect(child, title, out);
}

function failuresFrom(reportPath) {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const found = [];
  for (const suite of report.suites ?? []) collect(suite, [], found);
  return found;
}

const reportPath = argument("--report");
if (!reportPath) {
  console.error(
    "Usage: node scripts/e2e-triage.mjs --report <playwright-json> [--update|--merge]",
  );
  exit(2);
}

const found = failuresFrom(reportPath);
const failing = found
  .filter((entry) => entry.status !== "flaky")
  .map((entry) => entry.id)
  .sort();
const flaky = found
  .filter((entry) => entry.status === "flaky")
  .map((entry) => entry.id)
  .sort();

const merging = argv.includes("--merge");
if (argv.includes("--update") || merging) {
  let recordedFailing = failing;
  let recordedFlaky = flaky;
  if (merging && existsSync(BASELINE)) {
    const previous = JSON.parse(readFileSync(BASELINE, "utf8"));
    recordedFailing = [...new Set([...previous.failing, ...failing])].sort();
    recordedFlaky = [...new Set([...previous.flaky, ...flaky])].sort();
  }
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        note: "Failures already present on a clean tree. Every entry is debt somebody owns; the list must only ever shrink. Regenerate with: make e2e-baseline-update",
        recordedAt: new Date().toISOString().slice(0, 10),
        failing: recordedFailing,
        flaky: recordedFlaky,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `${merging ? "Merged into" : "Recorded"} the baseline: ${recordedFailing.length} failing and ${recordedFlaky.length} flaky tests.`,
  );
  exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(
    "No recorded baseline. Run `make e2e-baseline-update` once and commit the result.",
  );
  exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const known = new Set([...baseline.failing, ...baseline.flaky]);
const introduced = failing.filter((id) => !known.has(id));
const fixed = [...known].filter(
  (id) => !failing.includes(id) && !flaky.includes(id),
);

if (fixed.length) {
  console.log(`${fixed.length} recorded failures are now passing:`);
  for (const id of fixed.slice(0, 25)) console.log(`  + ${id}`);
  if (fixed.length > 25) console.log(`  … and ${fixed.length - 25} more`);
  console.log("Shrink the record with: make e2e-baseline-update\n");
}

if (introduced.length) {
  console.error(`${introduced.length} NEW browser-suite failures:`);
  for (const id of introduced) console.error(`  ✗ ${id}`);
  exit(1);
}

console.log(
  `No new browser-suite failures (${failing.length} failing, ${flaky.length} flaky, all recorded).`,
);
