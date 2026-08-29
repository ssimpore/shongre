import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CAPABILITIES } from "@shongre/contracts/access-control";
import { DEMO_USERS } from "../../../mocks/initialDemoData";
import { storageService } from "../../../services/storage.service";
import { auditService } from "../../../security/audit.service";
import { DemoAdminService } from "./demo-admin.service";

const target = DEMO_USERS.buyer_thomas;

beforeEach(() => {
  storageService.saveUser({ ...target, capabilityOverrideVersion: 1 });
  storageService.setCurrentUserKey("admin_antoine");
});

afterEach(() => {
  storageService.saveUser({ ...target });
  storageService.setCurrentUserKey("buyer_thomas");
});

describe("DemoAdminService discovery administration", () => {
  it("keeps drafts inactive and validates every published policy", async () => {
    const service = new DemoAdminService();
    const initial = await service.getDiscoveryConfiguration("FR");
    const edited = {
      ...initial,
      weights: {
        ...initial.weights,
        relevance: initial.weights.relevance + 0.01,
        quality: initial.weights.quality - 0.01,
      },
    };
    const draft = await service.saveDiscoveryConfiguration(
      edited,
      "Ajustement de test",
      false,
    );
    expect(draft.version).not.toBe(initial.version);
    expect((await service.getDiscoveryConfiguration("FR")).version).toBe(
      initial.version,
    );

    const published = await service.saveDiscoveryConfiguration(
      edited,
      "Activation de test",
      true,
    );
    expect((await service.getDiscoveryConfiguration("FR")).version).toBe(
      published.version,
    );
  });

  it("rejects a sponsored share that could crowd out organic results", async () => {
    const service = new DemoAdminService();
    const initial = await service.getDiscoveryConfiguration("FR");
    await expect(
      service.saveDiscoveryConfiguration(
        { ...initial, sponsored: { ...initial.sponsored, maxShare: 0.8 } },
        "Politique sponsorisée invalide",
        true,
      ),
    ).rejects.toBeTruthy();
  });

  it("uses the complete canonical projection and owned store for deterministic overrides", async () => {
    const service = new DemoAdminService();
    const before = await service.getCapabilityOverrides(target.id);

    expect(before.capabilities).toHaveLength(CAPABILITIES.length);
    expect(before.capabilities.map((entry) => entry.capability)).toEqual(
      CAPABILITIES,
    );

    const after = await service.updateCapabilityOverrides(target.id, {
      customPermissions: ["listing.read"],
      revokedPermissions: ["listing.create"],
      reason: "Restriction temporaire validée par le contrôle interne",
      expectedVersion: before.version,
    });

    expect(after.version).toBe(before.version + 1);
    expect(
      after.capabilities.find((entry) => entry.capability === "listing.create"),
    ).toMatchObject({ directlyRevoked: true, effective: false });
    expect(storageService.getCurrentUser(target.id)).toMatchObject({
      customPermissions: ["listing.read"],
      revokedPermissions: ["listing.create"],
      capabilityOverrideVersion: 2,
    });
    expect(
      auditService
        .getLogs({ action: "capability_overrides_updated" })
        .some((event) => event.targetId === target.id),
    ).toBe(true);
  });
});
