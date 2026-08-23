import { describe, expect, it } from "vitest";
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
});
