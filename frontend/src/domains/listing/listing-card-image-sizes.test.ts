import { describe, expect, it } from "vitest";
import { themeSpacing } from "@shongre/design-tokens";
import { IMAGE_SIZES } from "@shongre/shared/responsive-image";

/**
 * The phone `sizes` rule for standard cards must agree with the stylesheet's
 * mobile cap (`.listing-card-standard` uses `listing-card-mobile-max`), or
 * the browser fetches a source sized for the viewport into a 220px slot.
 * `@shongre/shared` cannot depend on the token package, so the agreement is
 * proven here, where both are available.
 */
describe("listing card image sizes", () => {
  it("caps the phone slot at the mobile card width token", () => {
    expect(IMAGE_SIZES.card).toContain(
      `(max-width: 639px) ${themeSpacing["listing-card-mobile-max"]}`,
    );
  });
});
