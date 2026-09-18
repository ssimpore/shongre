import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeReports } from "./merge-playwright-reports.mjs";

const part = (title, status, stats) => ({
  config: { version: "1" },
  suites: [
    { title, file: title, specs: [{ title: "t", tests: [{ status }] }] },
  ],
  errors: status === "unexpected" ? [{ message: `${title} failed` }] : [],
  stats: { startTime: "2026-09-18T00:00:00.000Z", duration: 10, ...stats },
});

test("keeps every phase's suites, errors and totals in one report", () => {
  const merged = mergeReports([
    part("regular.spec.ts", "unexpected", { expected: 3, unexpected: 1 }),
    part("serial.spec.ts", "expected", { expected: 2, flaky: 1, skipped: 4 }),
  ]);
  assert.deepEqual(
    merged.suites.map((suite) => suite.title),
    ["regular.spec.ts", "serial.spec.ts"],
  );
  assert.equal(merged.errors.length, 1);
  assert.deepEqual(merged.stats, {
    startTime: "2026-09-18T00:00:00.000Z",
    duration: 20,
    expected: 5,
    skipped: 4,
    unexpected: 1,
    flaky: 1,
  });
  assert.deepEqual(merged.config, { version: "1" });
});

test("an empty run merges to an empty report rather than failing", () => {
  const merged = mergeReports([]);
  assert.deepEqual(merged.suites, []);
  assert.equal(merged.stats.expected, 0);
});
