import { describe, expect, it } from "vitest";
import { DemoDigitalProductsService } from "./demo-digital-products.service";

const buyerId = "user_thomas";

describe("deterministic digital product demo service", () => {
  it.each([
    ["FR", true, "EUR"],
    ["BE", true, "EUR"],
    ["CH", true, "CHF"],
    ["SN", false, "EUR"],
    ["BF", false, "EUR"],
  ] as const)(
    "projects %s market availability",
    async (marketCode, enabled, currency) => {
      const policy = await new DemoDigitalProductsService().getPolicy(
        marketCode,
      );
      expect(policy.enabled).toBe(enabled);
      expect(policy.currency).toBe(currency);
      expect(policy.capabilities.checkout).toBe(enabled);
    },
  );

  it("rejects unknown markets instead of falling back to France", async () => {
    await expect(
      new DemoDigitalProductsService().getPolicy("XX"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("provides every required deterministic entitlement state without raw secrets", async () => {
    const items = await new DemoDigitalProductsService().listEntitlements(
      "FR",
      buyerId,
    );
    expect(items.map((item) => item.status)).toEqual(
      expect.arrayContaining([
        "PAYMENT_PENDING",
        "PAYMENT_FAILED",
        "PROVISIONING",
        "QUARANTINED",
        "INVALID_ACCESS",
        "EXPIRED",
        "DISPUTED",
        "LIMIT_REACHED",
        "UNAVAILABLE",
      ]),
    );
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain("DEMO-LICENSE-NOT-VALID");
    expect(serialized).not.toContain("DEMO-NOT-VALID");
  });

  it("returns secrets only after a buyer-owned single-use grant is consumed", async () => {
    const service = new DemoDigitalProductsService();
    const entitlementId = "20000000-0000-4000-8000-000000000004";
    await expect(
      service.createRevealGrant("FR", "wrong-buyer", entitlementId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const grant = await service.createRevealGrant("FR", buyerId, entitlementId);
    const revealed = await service.consumeAccessGrant(buyerId, grant.id);
    expect(revealed.kind).toBe("CREDENTIALS");
    expect(
      revealed.kind === "CREDENTIALS" ? revealed.fields[0]?.value : "",
    ).toBe("DEMO-LICENSE-NOT-VALID");
    await expect(
      service.consumeAccessGrant(buyerId, grant.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps provisioning tasks seller and market scoped", async () => {
    const service = new DemoDigitalProductsService();
    expect(
      await service.listSellerProvisioningTasks("FR", "user_camille"),
    ).toHaveLength(1);
    expect(
      await service.listSellerProvisioningTasks("BE", "user_camille"),
    ).toHaveLength(0);
    expect(
      await service.listSellerProvisioningTasks("FR", "user_thomas"),
    ).toHaveLength(0);
  });

  it("accepts digital and combined sellers only for an exact policy combination", async () => {
    const service = new DemoDigitalProductsService();
    await expect(
      service.acceptSellerResponsibilities(
        "FR",
        "seller-digital",
        ["FILE_DOWNLOAD"],
        1,
      ),
    ).resolves.toMatchObject({ fulfillmentTypes: ["FILE_DOWNLOAD"] });
    await expect(
      service.acceptSellerResponsibilities(
        "FR",
        "seller-combined",
        ["PHYSICAL", "ACCESS_LINK", "ACCESS_CREDENTIALS"],
        1,
      ),
    ).resolves.toMatchObject({
      fulfillmentTypes: ["PHYSICAL", "ACCESS_LINK", "ACCESS_CREDENTIALS"],
    });
    await expect(
      service.acceptSellerResponsibilities(
        "FR",
        "seller-invalid",
        ["FILE_DOWNLOAD", "SELLER_PROVISIONED"],
        1,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("keeps the private upload workflow behind the service boundary", async () => {
    const file = {
      name: "guide.pdf",
      type: "application/pdf",
      size: 1_024,
    } as File;
    const asset = await new DemoDigitalProductsService().uploadPrivateFile(
      "FR",
      file,
    );
    expect(asset).toMatchObject({ status: "READY", scanStatus: "CLEAN" });
    expect(JSON.stringify(asset)).not.toContain("signedUploadUrl");
  });
});
