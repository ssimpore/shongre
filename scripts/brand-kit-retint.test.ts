import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRgb, retintRgba } from "./brand-kit-retint";

const from = parseRgb("#FF6500");
const to = parseRgb("#A54200");
const white = parseRgb("#FFFFFF");
const ink = parseRgb("#172033");
const options = { from, to, partners: [white, ink] };

const pixels = (...values: number[][]) =>
  Buffer.from(
    values.flatMap((value) => [...value, ...(value.length === 3 ? [255] : [])]),
  );

test("replaces the orange itself at every alpha and leaves other flats alone", () => {
  const data = pixels(
    [255, 101, 0],
    [255, 101, 0, 40],
    [23, 32, 51],
    [255, 255, 255],
    [0, 0, 0, 0],
  );
  assert.equal(retintRgba(data, options), 2);
  assert.deepEqual(
    [...data],
    [
      165, 66, 0, 255, 165, 66, 0, 40, 23, 32, 51, 255, 255, 255, 255, 255, 0,
      0, 0, 0,
    ],
  );
});

test("re-applies an edge's blend weight against its partner instead of scaling channels", () => {
  // A 50/50 anti-aliased edge over white, and a 25% orange edge over ink.
  const overWhite = [255, 178, 128];
  const overInk = [81, 49, 38];
  const data = pixels(overWhite, overInk);
  assert.equal(retintRgba(data, options), 2);
  // 50% of #A54200 over white is (210, 161, 128): the fringe stays light.
  assert.deepEqual([...data.subarray(0, 3)], [210, 161, 128]);
  // 25% of #A54200 over ink: 0.25 * (165,66,0) + 0.75 * (23,32,51).
  assert.deepEqual([...data.subarray(4, 7)], [59, 41, 38]);
});

test("treats lossy noise within tolerance as the orange, and beyond it as a hue-scaled pixel", () => {
  const noisy = pixels([253, 103, 2]);
  assert.equal(retintRgba(noisy, { ...options, tolerance: 3 }), 1);
  assert.deepEqual([...noisy.subarray(0, 3)], [165, 66, 0]);
  // Too noisy for the blend model, still orange-hued: scaled, not dropped.
  const tooFar = pixels([240, 120, 30]);
  assert.equal(retintRgba(tooFar, { ...options, tolerance: 3 }), 1);
  assert.deepEqual([...tooFar.subarray(0, 3)], [155, 78, 30]);
});

test("scales a stray orange-hued overshoot pixel the way the orange itself moved", () => {
  const ringing = pixels([255, 90, 0]);
  assert.equal(retintRgba(ringing, options), 1);
  // 255 → 165 and 90 → 90 × 66/101.
  assert.deepEqual([...ringing.subarray(0, 3)], [165, 59, 0]);
  const unrelated = pixels([120, 130, 200]);
  assert.equal(retintRgba(unrelated, options), 0);
});
