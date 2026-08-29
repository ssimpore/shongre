import { afterEach, describe, expect, it } from "vitest";
import { createDefaultHomepageConfiguration } from "@shongre/contracts/homepage";
import { storageService } from "../../../services/storage.service";
import { demoHomepageService } from "./demo-homepage.service";

const previousKey = storageService.getCurrentUserKey();
const previousRole = storageService.getCurrentRole();

afterEach(() => {
  storageService.setCurrentRole(previousRole);
  storageService.setCurrentUserKey(previousKey);
});

describe("DemoHomepageService authorization and market isolation", () => {
  it("rejects an unauthenticated configuration mutation", async () => {
    storageService.setCurrentRole("guest");
    const configuration = createDefaultHomepageConfiguration({
      marketCode: "FR",
      locale: "fr-FR",
      state: "draft",
    });

    await expect(
      demoHomepageService.saveHomepageDraft({
        configuration,
        changeReason: "Tentative non autorisée",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not reuse the previous market response after a market change", async () => {
    const france = await demoHomepageService.getHomepage({
      marketCode: "FR",
      locale: "fr-FR",
    });
    const belgium = await demoHomepageService.getHomepage({
      marketCode: "BE",
      locale: "fr-BE",
    });

    expect(france.marketCode).toBe("FR");
    expect(belgium.marketCode).toBe("BE");
    for (const section of belgium.sections) {
      expect(
        section.listings?.every((listing) =>
          listing.marketCodes?.includes("BE"),
        ) ?? true,
      ).toBe(true);
      expect(
        section.deals?.every((deal) =>
          deal.listing.marketCodes?.includes("BE"),
        ) ?? true,
      ).toBe(true);
    }
  });
});
