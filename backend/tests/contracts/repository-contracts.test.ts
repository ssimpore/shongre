import { describe, it, expect, beforeEach } from "vitest";
import {
  DemoUserRepository,
  PostgresUserRepository,
  DemoListingRepository,
  PostgresListingRepository,
  DemoMarketRepository,
  PostgresMarketRepository,
  DemoTaxonomyRepository,
  PostgresTaxonomyRepository,
  DemoOrderRepository,
  PostgresOrderRepository,
  DemoVerificationRepository,
  PostgresVerificationRepository,
  DemoMessagingRepository,
  PostgresMessagingRepository,
  DemoNotificationRepository,
  PostgresNotificationRepository,
  DemoReviewRepository,
  PostgresReviewRepository,
  DemoAdminRepository,
  PostgresAdminRepository,
  DemoWorkspaceRepository,
  PostgresWorkspaceRepository,
  DemoCoursesRepository,
  PostgresCoursesRepository,
  createRepositoryContainer,
} from "../../src/infrastructure/database/repositories/index.js";
import { UserProfile, Listing } from "../../src/shared/types/index.js";

describe("Repository Contract & Dual-Mode Compatibility Tests", () => {
  describe("User Repository Contract", () => {
    const demoRepo = new DemoUserRepository();
    const postgresRepo = new PostgresUserRepository();

    beforeEach(() => {
      demoRepo.reset();
    });

    it("finds existing user by email and id in Demo mode", async () => {
      const user = await demoRepo.findByEmail("thomas.laurent@example.fr");
      expect(user).toBeDefined();
      expect(user?.email).toBe("thomas.laurent@example.fr");
      expect(user?.name).toBe("Thomas Laurent");

      const byId = await demoRepo.findById("user_thomas");
      expect(byId?.id).toBe("user_thomas");
    });

    it("returns null for missing user", async () => {
      const missing = await demoRepo.findByEmail("nonexistent@domain.com");
      expect(missing).toBeNull();
    });

    it("saves and updates user in Demo mode", async () => {
      const newUser: UserProfile = {
        id: "usr_test_123",
        slug: "test-user",
        email: "test@shongre.com",
        name: "Test User",
        accountType: "individual",
        primaryRole: "individual_buyer",
        role: "individual_buyer",
        status: "active",
        country: "FR",
        isVerified: false,
        isIdentityVerified: false,
        isPhoneVerified: false,
        isEmailVerified: true,
        rating: 5.0,
        reviewCount: 0,
        responseRatePercent: 100,
      };

      await demoRepo.save(newUser);
      const found = await demoRepo.findById("usr_test_123");
      expect(found).toBeDefined();
      expect(found?.name).toBe("Test User");

      const updated = await demoRepo.update("usr_test_123", {
        name: "Updated User",
      });
      expect(updated.name).toBe("Updated User");
    });

    it("PostgresUserRepository implements all interface methods cleanly", () => {
      expect(typeof postgresRepo.findById).toBe("function");
      expect(typeof postgresRepo.findByEmail).toBe("function");
      expect(typeof postgresRepo.save).toBe("function");
      expect(typeof postgresRepo.update).toBe("function");
      expect(typeof postgresRepo.getAll).toBe("function");
    });
  });

  describe("Listing Repository Contract", () => {
    const demoRepo = new DemoListingRepository();
    const postgresRepo = new PostgresListingRepository();

    beforeEach(() => {
      demoRepo.reset();
    });

    it("searches listings and resolves total count in Demo mode", async () => {
      const res = await demoRepo.search({});
      expect(res).toBeDefined();
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      expect(res.total).toBeGreaterThanOrEqual(1);
      expect(res.page).toBe(1);
      expect(res.totalPages).toBeGreaterThanOrEqual(1);
    });

    it("creates, updates and deletes a listing in Demo mode", async () => {
      const newListing: Listing = {
        id: "list_test_456",
        sellerId: "user_camille",
        categoryId: "smartphones",
        title: "iPhone 15 Pro 256Go",
        description: "Parfait état, batterie 100%",
        price: 850,
        currency: "EUR",
        status: "published",
        condition: "tres-bon-etat",
        marketCode: "FR",
        city: "Paris",
        postalCode: "75008",
        country: "FR",
        allowedDelivery: ["hand_delivery", "relay_point"],
        images: [],
        viewCount: 0,
        favoriteCount: 0,
        attributes: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + 60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      const saved = await demoRepo.save(newListing);
      expect(saved.id).toBe("list_test_456");

      const found = await demoRepo.findById("list_test_456");
      expect(found?.price).toBe(850);

      const updated = await demoRepo.update("list_test_456", { price: 800 });
      expect(updated.price).toBe(800);

      const deleted = await demoRepo.delete("list_test_456");
      expect(deleted).toBe(true);
      expect(await demoRepo.findById("list_test_456")).toBeNull();
    });

    it("toggles favorites deterministically in Demo mode", async () => {
      const isFav1 = await demoRepo.toggleFavorite(
        "user_thomas",
        "list_new_fav",
      );
      expect(isFav1).toBe(true);
      const isFav2 = await demoRepo.toggleFavorite(
        "user_thomas",
        "list_new_fav",
      );
      expect(isFav2).toBe(false);
    });

    it("PostgresListingRepository implements all interface methods cleanly", () => {
      expect(typeof postgresRepo.findById).toBe("function");
      expect(typeof postgresRepo.search).toBe("function");
      expect(typeof postgresRepo.save).toBe("function");
      expect(typeof postgresRepo.update).toBe("function");
      expect(typeof postgresRepo.delete).toBe("function");
      expect(typeof postgresRepo.toggleFavorite).toBe("function");
      expect(typeof postgresRepo.getFavorites).toBe("function");
    });
  });

  describe("Market Repository Contract", () => {
    const demoRepo = new DemoMarketRepository();
    const postgresRepo = new PostgresMarketRepository();

    it("resolves all canonical markets in Demo mode", async () => {
      const markets = await demoRepo.getAll();
      expect(markets.length).toBeGreaterThanOrEqual(6);
      expect(markets.some((m) => m.code === "FR")).toBe(true);
      expect(markets.some((m) => m.code === "BE")).toBe(true);
      expect(markets.some((m) => m.code === "CH")).toBe(true);
    });

    it("inherits baseline parameters from France in Demo mode", async () => {
      const be = await demoRepo.getEffective("BE");
      expect(be.code).toBe("BE");
      expect(be.protectionFeeRate).toBe(0.045);
      expect(be.currency).toBe("EUR");
    });

    it("PostgresMarketRepository implements all interface methods cleanly", () => {
      expect(typeof postgresRepo.getAll).toBe("function");
      expect(typeof postgresRepo.getByCode).toBe("function");
      expect(typeof postgresRepo.getActive).toBe("function");
      expect(typeof postgresRepo.setActive).toBe("function");
      expect(typeof postgresRepo.getEffective).toBe("function");
    });
  });

  describe("Course entity repository contract", () => {
    const demoRepo = new DemoCoursesRepository();
    const postgresRepo = new PostgresCoursesRepository();

    it("exposes a deterministic normalized demo catalog", async () => {
      const catalog = await demoRepo.getCatalog("FR");
      expect(
        catalog.subjects.some(
          (subject) => subject.id === "subject_mathematics",
        ),
      ).toBe(true);
      expect(
        catalog.plans.some((plan) => plan.id === "school_organization"),
      ).toBe(true);
      expect(catalog.config.featureFlags.paymentsEnabled).toBe(false);
    });

    it("keeps the Postgres adapter compatible with the complete course repository contract", () => {
      for (const method of [
        "getCatalog",
        "saveMarketConfig",
        "saveSubject",
        "savePlan",
        "searchTutors",
        "getTutorProfile",
        "saveTutorProfile",
        "getCourseOffers",
        "saveCourseOffer",
        "createLearnerRequest",
        "getLearnerRequest",
        "getTutorLeads",
        "saveLead",
        "getTutorWorkspace",
        "getOrganization",
        "getOrganizationWorkspace",
      ]) {
        expect(
          typeof (postgresRepo as unknown as Record<string, unknown>)[method],
        ).toBe("function");
      }
    });
  });

  describe("Taxonomy Repository Contract", () => {
    const demoRepo = new DemoTaxonomyRepository();
    const postgresRepo = new PostgresTaxonomyRepository();

    it("resolves root categories and hierarchical children in Demo mode", async () => {
      const roots = await demoRepo.getRootCategories();
      expect(roots.length).toBeGreaterThan(0);
      expect(roots.some((r) => r.id === "vehicles")).toBe(true);

      const children = await demoRepo.getChildren("vehicles");
      expect(children.length).toBeGreaterThanOrEqual(3);
    });

    it("resolves dynamic category attributes in Demo mode", async () => {
      const attrs = await demoRepo.getAttributesForCategory("cars");
      expect(attrs.some((a) => a.id === "mileage")).toBe(true);
      expect(attrs.some((a) => a.id === "fuel")).toBe(true);
    });

    it("PostgresTaxonomyRepository implements all interface methods cleanly", () => {
      expect(typeof postgresRepo.getRootCategories).toBe("function");
      expect(typeof postgresRepo.getNodeById).toBe("function");
      expect(typeof postgresRepo.getNodeBySlug).toBe("function");
      expect(typeof postgresRepo.getChildren).toBe("function");
      expect(typeof postgresRepo.getAttributesForCategory).toBe("function");
    });
  });

  describe("Order & Escrow Repository Contract", () => {
    const demoRepo = new DemoOrderRepository();
    const postgresRepo = new PostgresOrderRepository();

    it("creates and finds orders with escrow calculations in Demo mode", async () => {
      const order = await demoRepo.findById("ord_sample_1");
      expect(order).toBeDefined();
      expect(order?.status).toBe("escrow_funded");
      expect(order?.escrowSecuredAmount).toBe(258.5);
    });

    it("PostgresOrderRepository implements all interface methods cleanly", () => {
      expect(typeof postgresRepo.findById).toBe("function");
      expect(typeof postgresRepo.getPurchases).toBe("function");
      expect(typeof postgresRepo.getSales).toBe("function");
      expect(typeof postgresRepo.create).toBe("function");
      expect(typeof postgresRepo.update).toBe("function");
    });
  });

  describe("Monetization, Verification, Messaging, Notification & Admin Repositories", () => {
    it("returns verification state through Verification Repository", async () => {
      const demoRepo = new DemoVerificationRepository();
      const status = await demoRepo.getUserStatus("user_thomas");
      expect(status.state).toBeDefined();
      expect(status.isPhoneVerified).toBe(true);
      expect(status.isIdentityVerified).toBe(true);
    });

    it("saves messages through Messaging Repository", async () => {
      const demoRepo = new DemoMessagingRepository();
      const msg = await demoRepo.saveMessage({
        id: "msg_test_1",
        conversationId: "conv_1",
        senderId: "user_thomas",
        text: "Nouveau message test",
        createdAt: new Date().toISOString(),
      });
      expect(msg.id).toBe("msg_test_1");
      const page = await demoRepo.getMessages("conv_1");
      expect(page.items.some((message) => message.id === "msg_test_1")).toBe(
        true,
      );
      expect(page.pageInfo.hasNextPage).toBe(false);
    });

    it("manages notifications through Notification Repository", async () => {
      const demoRepo = new DemoNotificationRepository();
      const notifs = await demoRepo.getUserNotifications("user_camille");
      expect(notifs.length).toBeGreaterThan(0);
      const count = await demoRepo.getUnreadCount("user_camille");
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("returns platform stats through Admin Repository", async () => {
      const demoRepo = new DemoAdminRepository();
      const stats = await demoRepo.getStats();
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.escrowSecuredAmount).toBeGreaterThan(0);
    });

    it("returns workspace summary through Workspace Repository", async () => {
      const demoRepo = new DemoWorkspaceRepository();
      const summary = await demoRepo.getUserWorkspaceSummary("user_camille");
      expect(summary.activeListingsCount).toBeGreaterThanOrEqual(0);
      expect(summary.totalEarningsAmount).toBeGreaterThan(0);
    });
  });

  describe("Repository Container Dynamic Resolution", () => {
    it("creates container in demo mode with all demo repository instances", () => {
      const container = createRepositoryContainer("demo");
      expect(container.users instanceof DemoUserRepository).toBe(true);
      expect(container.listings instanceof DemoListingRepository).toBe(true);
      expect(container.markets instanceof DemoMarketRepository).toBe(true);
      expect(container.taxonomy instanceof DemoTaxonomyRepository).toBe(true);
      expect(container.orders instanceof DemoOrderRepository).toBe(true);
      expect(container.verification instanceof DemoVerificationRepository).toBe(
        true,
      );
      expect(container.messaging instanceof DemoMessagingRepository).toBe(true);
      expect(
        container.notifications instanceof DemoNotificationRepository,
      ).toBe(true);
      expect(container.reviews instanceof DemoReviewRepository).toBe(true);
      expect(container.admin instanceof DemoAdminRepository).toBe(true);
      expect(container.workspace instanceof DemoWorkspaceRepository).toBe(true);
    });

    it("creates container in database mode with all postgres repository instances", () => {
      const container = createRepositoryContainer("database");
      expect(container.users instanceof PostgresUserRepository).toBe(true);
      expect(container.listings instanceof PostgresListingRepository).toBe(
        true,
      );
      expect(container.markets instanceof PostgresMarketRepository).toBe(true);
      expect(container.taxonomy instanceof PostgresTaxonomyRepository).toBe(
        true,
      );
      expect(container.orders instanceof PostgresOrderRepository).toBe(true);
      expect(
        container.verification instanceof PostgresVerificationRepository,
      ).toBe(true);
      expect(container.messaging instanceof PostgresMessagingRepository).toBe(
        true,
      );
      expect(
        container.notifications instanceof PostgresNotificationRepository,
      ).toBe(true);
      expect(container.reviews instanceof PostgresReviewRepository).toBe(true);
      expect(container.admin instanceof PostgresAdminRepository).toBe(true);
      expect(container.workspace instanceof PostgresWorkspaceRepository).toBe(
        true,
      );
    });
  });
});
