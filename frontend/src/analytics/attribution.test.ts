import { describe, expect, it } from "vitest";
import { parseAttribution } from "./attribution";

describe("analytics attribution", () => {
  it("centralizes bounded UTM parsing without carrying unrelated parameters", () => {
    expect(
      parseAttribution(
        "?utm_source=google&utm_medium=cpc&utm_campaign=summer&email=person%40example.com",
      ),
    ).toEqual({
      source: "google",
      medium: "cpc",
      campaign: "summer",
      term: undefined,
      content: undefined,
    });
  });
});
