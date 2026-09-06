import { describe, expect, it } from "vitest";
import {
  createDefaultHomepageConfiguration,
  homepageConfigurationSchema,
  resolveHomepageConfiguration,
} from "./homepage";

describe("homepage configuration contract", () => {
  it("creates the controlled default order with recent listings before trends and deals", () => {
    const configuration = createDefaultHomepageConfiguration({
      marketCode: "FR",
      locale: "fr-FR",
      now: "2026-08-29T00:00:00.000Z",
    });

    expect(configuration.sections.map((section) => section.key)).toEqual([
      "hero",
      "recent_searches",
      "recent_listings",
      "trending",
      "deals",
      "universe_explorer",
      "collections",
      "pro_cta",
    ]);
    expect(
      configuration.sections.find((item) => item.key === "trending"),
    ).toMatchObject({
      maxItems: 4,
      titleByLocale: { "fr-FR": "En tendence" },
    });
    expect(
      configuration.sections.find((item) => item.key === "deals"),
    ).toMatchObject({ maxItems: 6 });
    expect(
      configuration.sections.find((item) => item.key === "universe_explorer"),
    ).toMatchObject({
      minimumListingCount: 1,
      settings: {
        universeSubsections: [
          expect.objectContaining({ categoryId: "home_garden", order: 0 }),
          expect.objectContaining({ categoryId: "vehicles", order: 1 }),
          expect.objectContaining({ categoryId: "fashion", order: 2 }),
        ],
      },
    });
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

  it("rejects duplicate universe category rails and invalid thresholds", () => {
    const base = createDefaultHomepageConfiguration({
      marketCode: "FR",
      locale: "fr-FR",
    });
    const invalid = {
      ...base,
      sections: base.sections.map((section) =>
        section.type === "universe_explorer"
          ? {
              ...section,
              minimumListingCount: -1,
              settings: {
                ...section.settings,
                universeSubsections: [
                  section.settings.universeSubsections![0]!,
                  {
                    ...section.settings.universeSubsections![0]!,
                    order: 1,
                  },
                ],
              },
            }
          : section,
      ),
    };

    expect(homepageConfigurationSchema.safeParse(invalid).success).toBe(false);
    expect(
      homepageConfigurationSchema.safeParse({
        ...base,
        sections: base.sections.map((section, index) =>
          index === 1
            ? { ...section, order: base.sections[0]!.order }
            : section,
        ),
      }).success,
    ).toBe(false);
    expect(
      homepageConfigurationSchema.safeParse({
        ...base,
        sections: base.sections.map((section) =>
          section.type === "universe_explorer"
            ? {
                ...section,
                settings: {
                  ...section.settings,
                  universeSubsections:
                    section.settings.universeSubsections!.map(
                      (subsection, index) =>
                        index === 0
                          ? { ...subsection, marketCodes: ["FR", "FR"] }
                          : subsection,
                    ),
                },
              }
            : section,
        ),
      }).success,
    ).toBe(false);
  });
});
