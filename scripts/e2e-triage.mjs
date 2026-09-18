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
 * `--baseline <file>` points at another record; the test suite uses it.
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

function argument(name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

const BASELINE =
  argument("--baseline") ??
  new URL("../frontend/e2e/known-failures.json", import.meta.url);

function collect(suite, ancestry, out, projects, executed) {
  const title = [...ancestry, suite.title].filter(Boolean);
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const project = test.projectName ?? "?";
      projects.add(project);
      const id = `${spec.file ?? suite.file ?? "?"} › ${[...title.slice(1), spec.title].join(" › ")} › ${project}`;
      // "expected" covers a pass and a documented skip; a test that failed and
      // then passed on retry is flaky, which is its own kind of no-signal.
      const status = test.status;
      if (status === "skipped") continue;
      executed.add(id);
      if (status === "expected") continue;
      out.push({ id, status });
    }
  }
  for (const child of suite.suites ?? [])
    collect(child, title, out, projects, executed);
}

/**
 * The failures of a run, plus every browser project the run exercised.
 *
 * Ids end with the project name, so the record can hold Chromium, Firefox and
 * WebKit entries side by side. A run judges only the projects it actually
 * ran: a `--project=chromium` run must neither be blamed for a WebKit-only
 * failure nor congratulated for "fixing" one it never executed.
 */
function failuresFrom(reportPath) {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const found = [];
  const projects = new Set();
  // Every test the run actually executed. A recorded failure is only "fixed"
  // when it ran and passed: a phase that never started, or a spec filtered
  // out of the invocation, is no evidence at all.
  const executed = new Set();
  for (const suite of report.suites ?? [])
    collect(suite, [], found, projects, executed);
  return { found, projects, executed };
}

function projectOf(id) {
  return id.slice(id.lastIndexOf(" › ") + 3);
}

const reportPath = argument("--report");
if (!reportPath) {
  console.error(
    "Usage: node scripts/e2e-triage.mjs --report <playwright-json> [--update|--merge] [--baseline <file>]",
  );
  exit(2);
}

const { found, projects, executed } = failuresFrom(reportPath);
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
  // The browsers a record has been proven on are written explicitly: a
  // browser with nothing left to record must still count as recorded, or a
  // clean run could never be told apart from a run nobody baselined.
  let recordedProjects = [...projects].sort();
  if (existsSync(BASELINE)) {
    // Entries for projects this run did not execute are kept as they are:
    // re-recording after a Chromium-only run must not erase the WebKit record.
    const previous = JSON.parse(readFileSync(BASELINE, "utf8"));
    // …and so are entries this report never executed (a phase that did not
    // run, a spec outside the invocation): the run has no opinion on them.
    const untouched = (ids) =>
      ids.filter((id) => !projects.has(projectOf(id)) || !executed.has(id));
    const unexecuted = [...previous.failing, ...previous.flaky].filter(
      (id) => projects.has(projectOf(id)) && !executed.has(id),
    );
    if (unexecuted.length) {
      console.log(
        `${unexecuted.length} recorded entries did not run in this report and are kept as they were:`,
      );
      for (const id of unexecuted.slice(0, 25)) console.log(`  = ${id}`);
      if (unexecuted.length > 25)
        console.log(`  … and ${unexecuted.length - 25} more`);
    }
    const carried = merging ? previous : { failing: [], flaky: [] };
    recordedProjects = [
      ...new Set([...(previous.projects ?? []), ...projects]),
    ].sort();
    recordedFailing = [
      ...new Set([
        ...untouched(previous.failing),
        ...carried.failing,
        ...failing,
      ]),
    ].sort();
    recordedFlaky = [
      ...new Set([...untouched(previous.flaky), ...carried.flaky, ...flaky]),
    ].sort();
  }
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        note: `Failures already present on a clean tree. Every entry is debt somebody owns; the list must only ever shrink. Regenerate with: make e2e-baseline-update${String(BASELINE).includes(".database.") ? "-database" : ""}`,
        recordedAt: new Date().toISOString().slice(0, 10),
        projects: recordedProjects,
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
const recordedProjects = new Set([
  ...(baseline.projects ?? []),
  ...[...known].map(projectOf),
]);
const unrecorded = [...projects].filter(
  (project) => !recordedProjects.has(project),
);
if (unrecorded.length) {
  // A project with no entries at all has never been recorded; judging it
  // against an empty list would report every pre-existing failure as new.
  console.error(
    `No recorded baseline for ${unrecorded.join(", ")}. Record one on a proven host with: make e2e-baseline-update E2E_ARGS=--project=${unrecorded[0]}`,
  );
  exit(2);
}
const introduced = failing.filter((id) => !known.has(id));
const fixed = [...known].filter(
  (id) => executed.has(id) && !failing.includes(id) && !flaky.includes(id),
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
