import { describe, expect, it } from "vitest";
import { parseAnswerEngineAttribution, parseAttribution } from "./attribution";

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

  it("records recognized answer-engine referrals without inventing a campaign", () => {
    expect(
      parseAnswerEngineAttribution("https://chatgpt.com/c/answer"),
    ).toEqual({ source: "chatgpt.com", medium: "organic_ai" });
    expect(parseAnswerEngineAttribution("https://example.com/article")).toEqual(
      {},
    );
  });
});
