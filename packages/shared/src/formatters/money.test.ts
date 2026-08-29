import { describe, expect, it } from "vitest";
import { majorToMinorAmount } from "./money";

describe("majorToMinorAmount", () => {
  it("normalizes legacy decimal amounts to integer minor units", () => {
    expect(majorToMinorAmount(79.9, "EUR")).toBe(7_990);
    expect(majorToMinorAmount(12.345, "EUR")).toBe(1_235);
    expect(majorToMinorAmount(250, "CHF")).toBe(25_000);
  });
});
