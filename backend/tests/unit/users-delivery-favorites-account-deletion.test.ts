import { describe, expect, it, vi } from "vitest";
import { DemoAdminRepository } from "../../src/infrastructure/database/repositories/admin.repository.js";
import { DemoAuthRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import { DemoDeliveryRepository } from "../../src/infrastructure/database/repositories/delivery.repository.js";
import { DemoOrderRepository } from "../../src/infrastructure/database/repositories/order.repository.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { UsersService } from "../../src/modules/users/users.service.js";
import type { UserProfile } from "../../src/shared/types/index.js";

const deletingUser: UserProfile = {
  id: "delivery-favorite-account-deletion-user",
  slug: "delivery-favorite-account-deletion-user",
  email: "delivery-favorite-account-deletion@example.test",
  name: "Favorite account deletion",
  accountType: "individual",
  primaryRole: "individual_buyer",
  role: "individual_buyer",
  status: "active",
  country: "FR",
  isVerified: true,
  isIdentityVerified: true,
  isPhoneVerified: true,
  isEmailVerified: true,
  rating: 0,
  reviewCount: 0,
  responseRatePercent: 100,
};

const favoriteRequestInput = {
  marketCode: "FR",
  origin: "standalone" as const,
  title: "Livrer le favori du compte supprimé",
  description: "Demande publique appartenant à un autre compte de test.",
  pickup: {
    street: "12 rue A",
    city: "Paris",
    postalCode: "75011",
    contactName: "Camille",
    contactPhone: "+33600000000",
  },
  dropoff: {
    street: "8 rue B",
    city: "Lyon",
    postalCode: "69001",
    contactName: "Alex",
    contactPhone: "+33600000001",
  },
  pickupWindow: {
    startsAt: "2027-01-15T09:00:00.000Z",
    endsAt: "2027-01-15T11:00:00.000Z",
  },
  deliveryWindow: {
    startsAt: "2027-01-15T12:00:00.000Z",
    endsAt: "2027-01-15T16:00:00.000Z",
  },
  package: {
    type: "Colis",
    count: 1,
    approximateWeightGrams: 1_000,
    handlingRequirements: [],
    loadingAssistanceRequired: false,
  },
  expiresAt: "2027-01-14T20:00:00.000Z",
  idempotencyKey: "delivery-favorite-account-deletion-request",
};

describe("user account deletion delivery cleanup", () => {
  it("purges delivery favorites through the real UsersService deletion path", async () => {
    const userRepository = new DemoUserRepository({
      [deletingUser.email]: deletingUser,
    });
    const authRepository = new DemoAuthRepository();
    const deliveryRepository = new DemoDeliveryRepository();
    const prepareAccountDeletion = vi.spyOn(
      deliveryRepository,
      "prepareAccountDeletion",
    );
    const request = await deliveryRepository.createDraft(
      "delivery-favorite-request-owner",
      "Request owner",
      false,
      favoriteRequestInput,
    );
    await deliveryRepository.publish(
      request.id,
      "delivery-favorite-request-owner",
    );
    await deliveryRepository.setFavoriteRequest(
      deletingUser.id,
      request.id,
      "FR",
      true,
    );
    await authRepository.linkIdentity({
      userId: deletingUser.id,
      provider: "facebook",
      providerSubject: "delivery-favorite-account-deletion-subject",
      providerEmail: deletingUser.email,
      providerEmailVerified: true,
      providerDisplayName: deletingUser.name,
      isPrivateRelay: false,
    });
    const users = new UsersService(
      userRepository,
      new DemoOrderRepository({}),
      new DemoAdminRepository(),
      authRepository,
      deliveryRepository,
    );

    await expect(
      users.deleteFromVerifiedProvider(
        deletingUser.id,
        "facebook",
        "delivery-favorite-account-deletion-subject",
      ),
    ).resolves.toEqual({ status: "completed" });

    expect(prepareAccountDeletion).toHaveBeenCalledOnce();
    expect(prepareAccountDeletion).toHaveBeenCalledWith(deletingUser.id);
    expect(
      await deliveryRepository.getFavoriteRequestIds(deletingUser.id, "FR"),
    ).toEqual([]);
    expect(await userRepository.findById(deletingUser.id)).toMatchObject({
      status: "deleted",
      email: `deleted+${deletingUser.id}@anonymized.invalid`,
    });
    expect(
      await authRepository.findIdentity(
        "facebook",
        "delivery-favorite-account-deletion-subject",
      ),
    ).toBeNull();
  });
});
