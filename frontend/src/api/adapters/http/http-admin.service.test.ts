import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CapabilityManagementProjection,
  CapabilityOverrideUpdate,
} from "@shongre/contracts/access-control";
import { httpClient } from "./http-client";
import { HttpAdminService } from "./http-admin.service";

vi.mock("./http-client", () => ({
  httpClient: { get: vi.fn(), put: vi.fn() },
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
    vi.mocked(httpClient.get).mockReset();
    vi.mocked(httpClient.put).mockReset();
  });

  it("returns the canonical read projection without adapter reshaping", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(projection);

    await expect(
      new HttpAdminService().getCapabilityOverrides("user/with space"),
    ).resolves.toEqual(projection);
    expect(httpClient.get).toHaveBeenCalledWith(
      "/admin/users/user%2Fwith%20space/capabilities",
    );
  });

  it("sends the complete allowlisted update to the dedicated endpoint", async () => {
    const update: CapabilityOverrideUpdate = {
      customPermissions: ["listing.read"],
      revokedPermissions: ["listing.create"],
      reason: "Restriction temporaire approuvée par le contrôle interne",
      expectedVersion: 1,
    };
    vi.mocked(httpClient.put).mockResolvedValue(projection);

    await expect(
      new HttpAdminService().updateCapabilityOverrides(
        "user/with space",
        update,
      ),
    ).resolves.toEqual(projection);
    expect(httpClient.put).toHaveBeenCalledWith(
      "/admin/users/user%2Fwith%20space/capability-overrides",
      update,
    );
  });
});
