import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CapabilityManagementProjection,
  CapabilityOverrideUpdate,
} from "@shongre/contracts/access-control";
import { apiOperation } from "./generated-api-operation";
import { HttpAdminService } from "./http-admin.service";

vi.mock("./generated-api-operation", () => ({
  apiOperation: vi.fn(),
}));

const projection: CapabilityManagementProjection = {
  userId: "user/with space",
  accountType: "individual",
  staffStatus: "none",
  staffRole: null,
  version: 2,
  capabilities: [
    {
      capability: "listing.create",
      label: "Créer une annonce",
      category: "Annonces",
      fromCustomerAccount: true,
      fromStaffRole: false,
      directlyGranted: false,
      directlyRevoked: false,
      effective: true,
      ineffectiveReason: null,
    },
  ],
};

describe("HttpAdminService capability-management contract", () => {
  beforeEach(() => {
    vi.mocked(apiOperation).mockReset();
  });

  it("returns the canonical read projection without adapter reshaping", async () => {
    vi.mocked(apiOperation).mockResolvedValue(projection);

    await expect(
      new HttpAdminService().getCapabilityOverrides("user/with space"),
    ).resolves.toEqual(projection);
    expect(apiOperation).toHaveBeenCalledWith("getAdminUserCapabilities", {
      path: { userId: "user/with space" },
    });
  });

  it("sends the complete allowlisted update to the dedicated endpoint", async () => {
    const update: CapabilityOverrideUpdate = {
      customPermissions: ["listing.read"],
      revokedPermissions: ["listing.create"],
      reason: "Restriction temporaire approuvée par le contrôle interne",
      expectedVersion: 1,
    };
    vi.mocked(apiOperation).mockResolvedValue(projection);

    await expect(
      new HttpAdminService().updateCapabilityOverrides(
        "user/with space",
        update,
      ),
    ).resolves.toEqual(projection);
    expect(apiOperation).toHaveBeenCalledWith(
      "updateAdminUserCapabilityOverrides",
      { path: { userId: "user/with space" }, body: update },
    );
  });
});
