import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { describe, expect, it, vi } from "vitest";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { DemoPublisherRepository } from "../../src/infrastructure/database/repositories/publisher.repository.js";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoBusinessRulesRepository } from "../../src/infrastructure/database/repositories/business-rules.repository.js";
import { BusinessRulesService } from "../../src/modules/business-rules/business-rules.service.js";
import { PublisherEntitlementsService } from "../../src/modules/publishers/publisher-entitlements.service.js";

function service() {
  const users = new DemoUserRepository();
  return new PublisherEntitlementsService(
    users,
    new DemoPublisherRepository(users),
    new DemoListingRepository(),
    new BusinessRulesService(new DemoBusinessRulesRepository()),
  );
}

describe("PublisherEntitlementsService", () => {
  it("keeps a private seller private without requiring professional onboarding", async () => {
    const publisher = await service().getEffectivePublisher({
      actorUserId: "user_camille",
    });
    expect(publisher).toMatchObject({
      type: "private",
      userId: "user_camille",
      verificationStatus: "identity_verified",
    });
    expect(publisher.organizationId).toBeUndefined();
  });

  it("keeps the organization as owner while a professional member is the actor", async () => {
    const publisher = await service().getEffectivePublisher({
      actorUserId: "user_pro_atelier",
    });
    expect(publisher).toMatchObject({
      type: "professional",
      userId: "user_pro_atelier",
      organizationId: "org_user_pro_atelier",
    });
  });

  it("returns typed standard-publication rights for both account types", async () => {
    const resolver = service();
    const privateRights = await resolver.getPublicationEntitlements({
      actorUserId: "user_camille",
      marketCode: "FR",
      categoryId: "bicycles",
    });
    const proRights = await resolver.getPublicationEntitlements({
      actorUserId: "user_pro_atelier",
      marketCode: "FR",
      categoryId: "bicycles",
    });
    expect(privateRights.standardPublicationAvailable).toBe(true);
    expect(proRights.standardPublicationAvailable).toBe(true);
    expect(privateRights.publisher.type).toBe("private");
    expect(proRights.publisher.type).toBe("professional");
  });

  it("rejects an unauthorized cross-organization publication request", async () => {
    await expect(
      service().getEffectivePublisher({
        actorUserId: "user_camille",
        organizationId: "org_user_pro_atelier",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: { reasonCode: "ORGANIZATION_PERMISSION_REQUIRED" },
    });
  });

  it("enforces the active vertical plan instead of the legacy generic quota", async () => {
    const users = new DemoUserRepository();
    const autoBusiness = BASELINE_MONETIZATION_CATALOG.products.find(
      (product) => product.id === "auto.dealer.growth",
    )!;
    const startsAt = "2026-01-01T00:00:00.000Z";
    const activeEntitlements = autoBusiness.entitlements.map(
      (definition, index) => ({
        id: `auto-business-${index}`,
        accountId: "user_pro_atelier",
        productId: autoBusiness.id,
        key: definition.key,
        value: definition.value,
        startsAt,
        status: "active" as const,
        verticalId: definition.verticalId || "auto",
        mergePolicy: definition.mergePolicy,
      }),
    );
    const consumeEntitlementQuota = vi.fn().mockResolvedValue(1);
    const rules = {
      getActiveEntitlements: vi.fn().mockResolvedValue(activeEntitlements),
      getCatalog: vi.fn().mockResolvedValue(BASELINE_MONETIZATION_CATALOG),
      getAccountEligibility: vi.fn().mockResolvedValue({
        eligible: true,
        reasonCode: "ELIGIBLE",
        quotaLimit: 50,
        quotaRemaining: 50,
      }),
      getEntitlementQuotaUsage: vi.fn().mockResolvedValue({ used: 0 }),
      consumeEntitlementQuota,
    } as unknown as BusinessRulesService;
    const resolver = new PublisherEntitlementsService(
      users,
      new DemoPublisherRepository(users),
      new DemoListingRepository(),
      rules,
    );

    const preview = await resolver.getPublicationEntitlements({
      actorUserId: "user_pro_atelier",
      marketCode: "FR",
      categoryId: "vehicles",
    });
    expect(preview).toMatchObject({
      eligible: true,
      verticalId: "auto",
      quotaSource: "plan_entitlement",
      quotaLimit: 80,
      monthlyPublicationLimit: 150,
      monthlyPublicationRemaining: 150,
    });
    expect(preview.entitlementSnapshot.maxPhotosPerVehicle).toBe(25);

    const authorized = await resolver.authorizePublication({
      actorUserId: "user_pro_atelier",
      marketCode: "FR",
      categoryId: "vehicles",
    });
    expect(authorized.monthlyPublicationRemaining).toBe(149);
    expect(consumeEntitlementQuota).toHaveBeenCalledWith(
      "user_pro_atelier",
      expect.objectContaining({
        entitlementKey: "maxMonthlyPublications",
        verticalId: "auto",
        limit: 150,
      }),
    );
  });
});
