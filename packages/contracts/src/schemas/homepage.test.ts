import { describe, expect, it } from "vitest";
import {
  createDefaultHomepageConfiguration,
  homepageConfigurationSchema,
  resolveHomepageConfiguration,
} from "./homepage";

describe("homepage configuration contract", () => {
  it("creates the controlled default order with trends after recent searches and deals next", () => {
    const configuration = createDefaultHomepageConfiguration({
      marketCode: "FR",
      locale: "fr-FR",
      now: "2026-08-29T00:00:00.000Z",
    });

    expect(configuration.sections.map((section) => section.key)).toEqual([
      "hero",
      "recent_searches",
      "trending",
      "deals",
      "recent_listings",
      "collections",
      "pro_cta",
    ]);
    expect(configuration.sections.find((item) => item.key === "trending"))
      .toMatchObject({ maxItems: 4 });
    expect(configuration.sections.find((item) => item.key === "deals"))
      .toMatchObject({ maxItems: 6 });
  });

  it("rejects duplicate sections and resolves schedules and localized copy", () => {
    const base = createDefaultHomepageConfiguration({
      marketCode: "BE",
      locale: "fr-BE",
      now: "2026-08-29T00:00:00.000Z",
    });
    expect(
      homepageConfigurationSchema.safeParse({
        ...base,
        sections: [...base.sections, base.sections[0]],
      }).success,
    ).toBe(false);

    const scheduled = {
      ...base,
      sections: base.sections.map((section) =>
        section.key === "deals"
          ? { ...section, endsAt: "2026-08-28T00:00:00.000Z" }
          : section,
      ),
    };
    const resolved = resolveHomepageConfiguration(
      homepageConfigurationSchema.parse(scheduled),
      new Date("2026-08-29T00:00:00.000Z"),
    );
    expect(resolved.marketCode).toBe("BE");
    expect(resolved.sections.some((section) => section.key === "deals")).toBe(
      false,
    );
  });
});
