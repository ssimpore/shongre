import assert from "node:assert/strict";
import { test } from "node:test";
import { e2eFilter } from "./lib/e2e-filter.mjs";

test("browser phases partition a targeted selection without repeating serial tests", () => {
  const names = ["checkout", "checkout @serial", "login", "login @serial"];
  for (const include of ["", "checkout", "checkout|login", "^checkout$"]) {
    for (const exclude of ["", "login", "checkout"]) {
      const expected = names.filter(
        (name) =>
          new RegExp(include).test(name) &&
          (!exclude || !new RegExp(exclude).test(name)),
      );
      const regular = names.filter((name) =>
        new RegExp(e2eFilter("regular", include, exclude)).test(name),
      );
      const serial = names.filter((name) =>
        new RegExp(e2eFilter("serial", include, exclude)).test(name),
      );
      assert.deepEqual([...regular, ...serial].sort(), expected.sort());
      assert.ok(regular.every((name) => !serial.includes(name)));
    }
  }
});

test("invalid browser filters and phases fail before running a selection", () => {
  assert.throws(() => e2eFilter("other"));
  assert.throws(() => e2eFilter("regular", "["));
});
