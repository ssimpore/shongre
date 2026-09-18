import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const script = new URL("./e2e-triage.mjs", import.meta.url).pathname;

function report(tests) {
  return {
    suites: [
      {
        title: "sample.spec.ts",
        file: "sample.spec.ts",
        specs: tests.map(([title, projectName, status]) => ({
          title,
          file: "sample.spec.ts",
          tests: [{ projectName, status }],
        })),
      },
    ],
  };
}

function triage(tests, baseline, ...flags) {
  const dir = mkdtempSync(join(tmpdir(), "e2e-triage-"));
  const reportPath = join(dir, "report.json");
  const baselinePath = join(dir, "known-failures.json");
  writeFileSync(reportPath, JSON.stringify(report(tests)));
  if (baseline) {
    writeFileSync(
      baselinePath,
      JSON.stringify({ failing: [], flaky: [], ...baseline }),
    );
  }
  const run = spawnSync(
    process.execPath,
    [script, "--report", reportPath, "--baseline", baselinePath, ...flags],
    { encoding: "utf8" },
  );
  return {
    status: run.status,
    output: `${run.stdout}${run.stderr}`,
    record: () => JSON.parse(readFileSync(baselinePath, "utf8")),
  };
}

const id = (title, project) => `sample.spec.ts › ${title} › ${project}`;

test("a run passes when every failure it saw is recorded for its own browser", () => {
  const run = triage(
    [
      ["old", "chromium", "unexpected"],
      ["fine", "chromium", "expected"],
    ],
    { failing: [id("old", "chromium"), id("webkit-only", "webkit")] },
  );
  assert.equal(run.status, 0, run.output);
  assert.match(run.output, /No new browser-suite failures/);
  // The WebKit entry was never executed here, so it is neither fixed nor new.
  assert.doesNotMatch(run.output, /webkit-only/);
});

test("a failure missing from the record fails the run and is named", () => {
  const run = triage([["fresh", "chromium", "unexpected"]], {
    failing: [id("old", "chromium")],
  });
  assert.equal(run.status, 1);
  assert.match(run.output, /1 NEW browser-suite failures/);
  assert.match(run.output, /fresh › chromium/);
});

test("a browser with no recorded entries cannot be judged", () => {
  const run = triage([["old", "firefox", "unexpected"]], {
    failing: [id("old", "chromium")],
  });
  assert.equal(run.status, 2);
  assert.match(run.output, /No recorded baseline for firefox/);
  assert.match(run.output, /--project=firefox/);
});

test("re-recording one browser keeps the other browsers' entries", () => {
  const run = triage(
    [
      ["still", "chromium", "unexpected"],
      ["old", "chromium", "expected"],
    ],
    { failing: [id("old", "chromium"), id("webkit-only", "webkit")] },
    "--update",
  );
  assert.equal(run.status, 0, run.output);
  assert.deepEqual(run.record().failing, [
    id("still", "chromium"),
    id("webkit-only", "webkit"),
  ]);
});

test("merging absorbs a flake without dropping what was recorded", () => {
  const run = triage(
    [["flake", "chromium", "flaky"]],
    { failing: [id("old", "chromium")] },
    "--merge",
  );
  assert.equal(run.status, 0, run.output);
  assert.deepEqual(run.record(), {
    ...run.record(),
    failing: [id("old", "chromium")],
    flaky: [id("flake", "chromium")],
  });
});

test("a browser recorded with nothing left to record still counts as recorded", () => {
  const green = triage([["fine", "chromium", "expected"]], {
    projects: ["chromium"],
    failing: [],
  });
  assert.equal(green.status, 0, green.output);
  assert.match(green.output, /No new browser-suite failures/);

  const regressed = triage([["fine", "chromium", "unexpected"]], {
    projects: ["chromium"],
    failing: [],
  });
  assert.equal(regressed.status, 1, regressed.output);
  assert.match(regressed.output, /1 NEW browser-suite failures/);
});

test("re-recording writes the browsers it proved, keeping the ones it did not run", () => {
  const run = triage(
    [["fine", "chromium", "expected"]],
    { projects: ["webkit"], failing: [id("old", "webkit")] },
    "--update",
  );
  assert.equal(run.status, 0, run.output);
  assert.deepEqual(run.record().projects, ["chromium", "webkit"]);
  assert.deepEqual(run.record().failing, [id("old", "webkit")]);
});

test("a recorded failure the report never executed is neither fixed nor dropped", () => {
  // Only phase 1 ran here: the serial entry is absent from the report.
  const judged = triage(
    [
      ["old", "chromium", "expected"],
      ["fine", "chromium", "expected"],
    ],
    { failing: [id("old", "chromium"), id("serial-only", "chromium")] },
  );
  assert.equal(judged.status, 0, judged.output);
  assert.match(judged.output, /1 recorded failures are now passing/);
  assert.match(judged.output, /\+ sample\.spec\.ts › old › chromium/);
  assert.doesNotMatch(judged.output, /\+ sample\.spec\.ts › serial-only/);

  const rerecorded = triage(
    [["old", "chromium", "expected"]],
    { failing: [id("old", "chromium"), id("serial-only", "chromium")] },
    "--update",
  );
  assert.equal(rerecorded.status, 0, rerecorded.output);
  assert.match(rerecorded.output, /1 recorded entries did not run/);
  assert.deepEqual(rerecorded.record().failing, [
    id("serial-only", "chromium"),
  ]);
});
