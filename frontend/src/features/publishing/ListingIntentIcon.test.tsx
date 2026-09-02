import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { taxonomyV4ListingIntentSchema } from "@shongre/contracts";
import {
  LISTING_INTENT_ICON_MAP,
  ListingIntentIcon,
} from "./ListingIntentIcon";

describe("ListingIntentIcon", () => {
  it("allocates one dedicated icon to every supported listing intent", () => {
    const intents = taxonomyV4ListingIntentSchema.options;
    const icons = intents.map((intent) => LISTING_INTENT_ICON_MAP[intent]);

    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(intents.length);
  });

  it("renders the intent icon as decorative metadata", () => {
    const markup = renderToStaticMarkup(
      <ListingIntentIcon intent="BUSINESS_SALE" className="h-icon-sm" />,
    );

    expect(markup).toContain('data-listing-intent-icon="BUSINESS_SALE"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("lucide-store");
  });
});
