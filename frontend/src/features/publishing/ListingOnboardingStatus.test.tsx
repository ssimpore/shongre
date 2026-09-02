import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ListingOnboardingStatus } from "./ListingOnboardingStatus";

describe("ListingOnboardingStatus", () => {
  it.each([
    ["loading", 'role="status"', "Chargement"],
    ["empty", 'role="status"', "Aucune catégorie"],
    ["error", 'role="alert"', "Réessayer"],
  ] as const)(
    "renders the %s state without collapsing the flow",
    (state, role, text) => {
      const markup = renderToStaticMarkup(
        <ListingOnboardingStatus
          state={state}
          error={state === "error" ? "TAXONOMY_UNAVAILABLE" : undefined}
          onRetry={vi.fn()}
        />,
      );
      expect(markup).toContain(role);
      expect(markup).toContain(text);
    },
  );

  it("renders an explicit unavailable-market error and nothing when ready", () => {
    expect(
      renderToStaticMarkup(
        <ListingOnboardingStatus
          state="error"
          error="MARKET_UNAVAILABLE"
          onRetry={vi.fn()}
        />,
      ),
    ).toContain("ne permet pas encore");
    expect(
      renderToStaticMarkup(
        <ListingOnboardingStatus state="ready" onRetry={vi.fn()} />,
      ),
    ).toBe("");
  });
});
