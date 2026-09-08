/** Intersect the caller's selection with the runner's regular/serial phase. */
export function e2eFilter(phase, include = "", exclude = "") {
  if (phase !== "regular" && phase !== "serial") {
    throw new Error(`Unknown browser phase: ${phase}`);
  }
  for (const pattern of [include, exclude]) new RegExp(pattern);
  return (
    (phase === "serial" ? "^(?=.*@serial)" : "^(?!.*@serial)") +
    (include ? `(?=.*(?:${include}))` : "") +
    (exclude ? `(?!.*(?:${exclude}))` : "") +
    ".*"
  );
}
