import { describe, expect, it } from "vitest";
import { majorToMinorAmount, parseMajorAmountInput } from "./money";

describe("majorToMinorAmount", () => {
  it("normalizes legacy decimal amounts to integer minor units", () => {
    expect(majorToMinorAmount(79.9, "EUR")).toBe(7_990);
    expect(majorToMinorAmount(12.345, "EUR")).toBe(1_235);
    expect(majorToMinorAmount(250, "CHF")).toBe(25_000);
  });
});

describe("localized amount input", () => {
  it("accepts exact and localized values without losing precision", () => {
    expect(parseMajorAmountInput("195", "fr-FR")).toBe(195);
    expect(parseMajorAmountInput("1 234,56", "fr-FR")).toBe(1234.56);
    expect(parseMajorAmountInput("1,234.56", "en-US")).toBe(1234.56);
    expect(parseMajorAmountInput("", "fr-FR")).toBeUndefined();
    expect(majorToMinorAmount(195, "XOF")).toBe(195);
  });
  it("rejects malformed, negative and non-numeric values", () => {
    for (const input of [
      "abc",
      "-1",
      "1,2,3",
      ",123",
      "1,234.5,67",
      "Infinity",
    ]) {
      expect(parseMajorAmountInput(input, "en-US")).toBeNaN();
    }
  });
});
