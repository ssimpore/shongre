import { describe, expect, it, vi } from "vitest";
import { ProspectingService } from "../../src/modules/crm/prospecting/prospecting.service.js";
import { DemoProspectingRepository } from "../../src/infrastructure/database/repositories/prospecting.repository.js";
import { DemoCrmRepository } from "../../src/infrastructure/database/repositories/crm.repository.js";
import { taxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.runtime.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const principal: Principal = {
  userId: "10000000-0000-4000-8000-000000000004",
  email: "lea@example.test",
  role: "buyer",
  accountType: "individual",
  staffStatus: "active",
  staffRole: "admin",
  mfaVerified: true,
  capabilities: ["crm.prospecting.profiles.manage", "crm.prospecting.read"],
};
const input = {
  name: "Education prospects",
  context: "SUBSCRIBER",
  marketCodes: ["FR"],
  locale: "fr-FR",
  currency: "EUR",
  timezone: "Europe/Paris",
  isDefault: false,
  geographicAreas: [],
  industries: [],
  taxonomySlugs: ["services.tutoring", "courses"],
  companyTypes: [],
  businessMaturity: [],
  onlinePresence: [],
  targetRoles: [],
  fitRules: [],
  exclusionRules: [],
  requiredSignals: [],
  optionalSignals: [],
};

describe("prospecting taxonomy boundary", () => {
  it("persists canonical alias selections and rejects unknown categories", async () => {
    const service = new ProspectingService(
      new DemoProspectingRepository(),
      new DemoCrmRepository(),
    );
    const profile = await service.createProfile(principal, input);
    const expected = (await taxonomyV1Service.snapshot()).findCategory(
      "education",
    )!.slug;
    expect(profile.taxonomySlugs).toEqual([expected]);
    expect(
      (await service.listProfiles(principal)).items.find(
        (row) => row.id === profile.id,
      )?.taxonomySlugs,
    ).toEqual([expected]);
    await expect(
      service.createProfile(principal, {
        ...input,
        taxonomySlugs: ["unknown-category"],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("fails without storing a profile when the publication cannot be read", async () => {
    const repository = new DemoProspectingRepository();
    const write = vi.spyOn(repository, "createProfile");
    const read = vi
      .spyOn(taxonomyV1Service, "snapshot")
      .mockRejectedValueOnce(new Error("database unavailable"));
    try {
      await expect(
        new ProspectingService(
          repository,
          new DemoCrmRepository(),
        ).createProfile(principal, input),
      ).rejects.toThrow("database unavailable");
      expect(write).not.toHaveBeenCalled();
    } finally {
      read.mockRestore();
    }
  });
});
