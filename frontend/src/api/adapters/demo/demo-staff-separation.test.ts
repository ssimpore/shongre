import { afterEach, describe, expect, it } from "vitest";
import { CUSTOMER_MARKETPLACE_CAPABILITIES } from "@shongre/contracts/access-control";
import { storageService } from "../../../services/storage.service";
import { authorizationService } from "../../../security/authorization.service";
import { DEMO_USERS } from "../../../mocks/initialDemoData";
import { authService as demoAuthEngine } from "../../../domains/auth/auth.service";
import { demoAiService } from "./demo-ai.service";
import { demoAuthService } from "./demo-auth.service";
import { demoAutoService } from "./demo-auto.service";
import { demoRealEstateService } from "./demo-real-estate.service";
import { demoCoursesService } from "./demo-courses.service";
import { demoFinanceService } from "./demo-finance.service";
import { demoHomepageService } from "./demo-homepage.service";
import { demoInvoicingService } from "./demo-invoicing.service";
import { demoListingsService } from "./demo-listings.service";
import { demoMessagingService } from "./demo-messaging.service";
import { demoOrdersService } from "./demo-orders.service";
import { demoPaymentsService } from "./demo-payments.service";
import { demoPromotionsService } from "./demo-promotions.service";
import { demoFeatureFlagService } from "./demo-feature-flag.service";
import { demoProviderControlPlaneService } from "./demo-provider-control-plane.service";
import { demoSupportService } from "./demo-support.service";
import { demoMarketingService } from "./demo-marketing.service";
import { demoBusinessRulesService } from "./demo-business-rules.service";
import { auditService } from "../../../security/audit.service";

const ACTIVE_STAFF_PERSONAS = [
  "support_hugo",
  "moderator_claire",
  "trust_nadia",
  "compliance_samia",
  "finance_marc",
  "ops_elena",
  "commercial_lea",
  "content_julien",
  "market_mgr_fr",
  "admin_antoine",
  "super_admin_alex",
] as const;

afterEach(() => storageService.setCurrentUserKey("buyer_thomas"));

describe("demo Staff/customer marketplace separation", () => {
  it("persists the internal Staff role when switching personas", async () => {
    await demoAuthService.switchDemoUser("support_hugo");

    expect(storageService.getCurrentUserKey()).toBe("support_hugo");
    expect(storageService.getCurrentRole()).toBe("support");
  });

  it.each(ACTIVE_STAFF_PERSONAS)(
    "keeps %s outside customer authority while allowing public discovery",
    async (persona) => {
      storageService.setCurrentUserKey(persona);
      const user = storageService.getCurrentUser();
      expect(user?.staffStatus).toBe("active");
      expect(
        CUSTOMER_MARKETPLACE_CAPABILITIES.some((capability) =>
          authorizationService.can(user, capability),
        ),
      ).toBe(false);
      await expect(demoListingsService.getListings()).resolves.toMatchObject({
        listings: expect.any(Array),
      });
    },
  );

  it.each(["suspended", "revoked"] as const)(
    "keeps %s Staff identities outside both access planes",
    async (staffStatus) => {
      const user = {
        ...DEMO_USERS.support_hugo,
        id: `demo-staff-${staffStatus}`,
        email: `staff-${staffStatus}@example.test`,
        staffStatus,
      };
      storageService.saveUser(user);
      storageService.setCurrentUserKey(user.id);

      expect(authorizationService.getEffectivePermissions(user)).toEqual([]);
      expect(() => demoAuthEngine.createSession(user.id)).toThrow(
        /Staff inactive/i,
      );
      await expect(demoListingsService.getListings()).resolves.toMatchObject({
        listings: expect.any(Array),
      });
      await expect(demoAuthService.switchDemoUser(user.id)).rejects.toThrow(
        /Staff interne n'est pas actif/i,
      );
    },
  );

  it("blocks representative creation, purchase, messaging, payment, promotion, and customer-business operations", async () => {
    storageService.setCurrentUserKey("super_admin_alex");

    await expect(
      demoListingsService.createListingDraft(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoListingsService.toggleFavorite("listing-demo"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoMessagingService.getComposerOptions({
        conversationId: "staff-conversation-attempt",
        userId: "user_super_admin_alex",
        locale: "fr-FR",
        isProfessional: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoOrdersService.getPurchases("user_super_admin_alex"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoPaymentsService.createCheckout("quote", "staff-checkout"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoPromotionsService.getAvailableBoosts("listing-demo"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoPromotionsService.getProSubscriptionPlans(),
    ).resolves.toEqual(expect.any(Array));
    await expect(
      demoBusinessRulesService.getCatalog("FR"),
    ).resolves.toMatchObject({ marketCode: "FR", products: expect.any(Array) });
    await expect(
      demoBusinessRulesService.getBillingOverview(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoFinanceService.getAccountDashboard(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(demoInvoicingService.getWorkspace("FR")).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
    await expect(
      demoAiService.generateListingAssistance({ rawInput: "Objet" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(demoAutoService.getCatalog("FR")).resolves.toBeDefined();
    await expect(
      demoAutoService.submitLead({
        vehicleId: "vehicle_3008_petrol",
        contactName: "Staff interne",
        contactEmail: "staff@example.test",
        intention: "availability",
        message: "Demande qui doit rester bloquée.",
        source: "vehicle_page",
        marketingConsent: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoRealEstateService.submitLead({
        propertyId: "property_house_ecully",
        type: "information",
        requesterName: "Staff interne",
        requesterEmail: "staff@example.test",
        message: "Demande qui doit rester bloquée.",
        preferredContactChannel: "message",
        consentGiven: true,
        qualificationAnswers: { source: "staff-separation-test" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(demoCoursesService.getCatalog("FR")).resolves.toBeDefined();
    await expect(
      demoMarketingService.subscribePublic({
        email: "staff@example.test",
        marketCode: "FR",
        locale: "fr-FR",
        topics: ["editorial"],
        source: "FOOTER",
        consentGiven: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      demoHomepageService.getHomepage({
        marketCode: "FR",
        country: "FR",
        locale: "fr-FR",
      }),
    ).resolves.toBeDefined();
  });

  it("allows only the dedicated Staff tester to mutate isolated demo data and audits every action", async () => {
    storageService.setCurrentUserKey("ops_elena");
    const user = storageService.getCurrentUser();
    expect(authorizationService.can(user, "staff.marketplace.demo")).toBe(true);
    expect(authorizationService.can(user, "listing.create")).toBe(false);

    const before = auditService.getLogs({
      action: "staff_marketplace_demo_action",
    }).length;
    await expect(
      demoListingsService.createListingDraft("user_ops_elena"),
    ).resolves.toMatchObject({ marketCode: "FR", currentStep: 1 });
    await expect(
      demoPromotionsService.getAvailableBoosts("listing-demo"),
    ).resolves.toEqual(expect.any(Array));
    await expect(
      demoMarketingService.subscribePublic({
        email: "staff-demo@example.test",
        marketCode: "FR",
        locale: "fr-FR",
        topics: ["editorial"],
        source: "FOOTER",
        consentGiven: true,
      }),
    ).resolves.toMatchObject({ accepted: true });
    await expect(
      demoRealEstateService.submitLead({
        propertyId: "property_house_ecully",
        type: "information",
        requesterName: "Démonstration Staff",
        requesterEmail: "staff-demo@example.test",
        message: "Demande isolée de démonstration.",
        preferredContactChannel: "message",
        consentGiven: true,
        qualificationAnswers: { source: "staff-demo-test" },
      }),
    ).resolves.toMatchObject({ status: "new" });

    const events = auditService.getLogs({
      action: "staff_marketplace_demo_action",
    });
    expect(events.length).toBeGreaterThanOrEqual(before + 4);
    expect(
      events
        .slice(0, 4)
        .every(
          (event) =>
            event.actorId === "user_ops_elena" &&
            (event.newValue as { isolated?: boolean }).isolated === true,
        ),
    ).toBe(true);
  });

  it("keeps internal demo operations scoped to each Staff role", async () => {
    storageService.setCurrentUserKey("support_hugo");
    await expect(demoSupportService.listCases()).resolves.toHaveLength(2);
    await expect(
      demoFeatureFlagService.getAdminSnapshot(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    storageService.setCurrentUserKey("moderator_claire");
    await expect(demoSupportService.listCases()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    storageService.setCurrentUserKey("ops_elena");
    await expect(
      demoProviderControlPlaneService.getSnapshot(),
    ).resolves.toMatchObject({ environment: "demo" });
    await expect(
      demoProviderControlPlaneService.createConnection({
        ownerType: "TENANT",
        providerId: "demo-restricted",
        providerFamily: "AI",
        displayName: "Restricted demo provider",
        configuration: {},
        capabilities: [],
        isDefault: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
