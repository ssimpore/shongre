import { afterEach, describe, it, expect } from "vitest";
import {
  activateServiceRegistry,
  createServiceRegistry,
  services,
} from "./service-registry";
import { isDemoMode } from "./data-mode.service";
import {
  HttpListingsService,
  HttpSearchService,
  HttpAuthService,
  HttpMarketsService,
  HttpTaxonomyService,
  HttpMessagingService,
  HttpNotificationsService,
  HttpOrdersService,
  HttpPaymentsService,
  HttpPromotionsService,
  HttpVerificationService,
  HttpWorkspaceService,
  HttpAdminService,
  HttpReviewsService,
  HttpBusinessRulesService,
  HttpCommissionService,
  HttpCrmService,
  HttpCrmProspectingService,
} from "../adapters/http";
import {
  DemoListingsService,
  DemoSearchService,
  DemoAuthService,
  DemoMarketsService,
  DemoTaxonomyService,
  DemoMessagingService,
  DemoNotificationsService,
  DemoOrdersService,
  DemoPaymentsService,
  DemoPromotionsService,
  DemoVerificationService,
  DemoWorkspaceService,
  DemoAdminService,
  DemoReviewsService,
  DemoBusinessRulesService,
  DemoCommissionService,
  DemoCrmService,
  DemoProspectResearchService,
} from "../adapters/demo";

describe("Service Registry & API Adapter Boundary", () => {
  afterEach(() => {
    activateServiceRegistry("demo");
  });

  it("instantiates the service registry in demo mode by default", () => {
    expect(isDemoMode()).toBe(true);
    const registry = createServiceRegistry("demo");
    expect(registry).toBeDefined();
    expect(registry.listings instanceof DemoListingsService).toBe(true);
    expect(registry.search instanceof DemoSearchService).toBe(true);
    expect(registry.auth instanceof DemoAuthService).toBe(true);
    expect(registry.markets instanceof DemoMarketsService).toBe(true);
    expect(registry.taxonomy instanceof DemoTaxonomyService).toBe(true);
    expect(registry.messaging instanceof DemoMessagingService).toBe(true);
    expect(registry.notifications instanceof DemoNotificationsService).toBe(
      true,
    );
    expect(registry.orders instanceof DemoOrdersService).toBe(true);
    expect(registry.payments instanceof DemoPaymentsService).toBe(true);
    expect(registry.promotions instanceof DemoPromotionsService).toBe(true);
    expect(registry.verification instanceof DemoVerificationService).toBe(true);
    expect(registry.workspace instanceof DemoWorkspaceService).toBe(true);
    expect(registry.admin instanceof DemoAdminService).toBe(true);
    expect(registry.reviews instanceof DemoReviewsService).toBe(true);
    expect(registry.businessRules instanceof DemoBusinessRulesService).toBe(
      true,
    );
    expect(registry.commissions instanceof DemoCommissionService).toBe(true);
    expect(registry.crm instanceof DemoCrmService).toBe(true);
    expect(registry.crmProspecting instanceof DemoProspectResearchService).toBe(true);
  });

  it("instantiates the service registry in api mode when configured", () => {
    const apiRegistry = createServiceRegistry("api");
    expect(apiRegistry).toBeDefined();
    expect(apiRegistry.listings instanceof HttpListingsService).toBe(true);
    expect(apiRegistry.search instanceof HttpSearchService).toBe(true);
    expect(apiRegistry.auth instanceof HttpAuthService).toBe(true);
    expect(apiRegistry.markets instanceof HttpMarketsService).toBe(true);
    expect(apiRegistry.taxonomy instanceof HttpTaxonomyService).toBe(true);
    expect(apiRegistry.messaging instanceof HttpMessagingService).toBe(true);
    expect(apiRegistry.notifications instanceof HttpNotificationsService).toBe(
      true,
    );
    expect(apiRegistry.orders instanceof HttpOrdersService).toBe(true);
    expect(apiRegistry.payments instanceof HttpPaymentsService).toBe(true);
    expect(apiRegistry.promotions instanceof HttpPromotionsService).toBe(true);
    expect(apiRegistry.verification instanceof HttpVerificationService).toBe(
      true,
    );
    expect(apiRegistry.workspace instanceof HttpWorkspaceService).toBe(true);
    expect(apiRegistry.admin instanceof HttpAdminService).toBe(true);
    expect(apiRegistry.reviews instanceof HttpReviewsService).toBe(true);
    expect(apiRegistry.businessRules instanceof HttpBusinessRulesService).toBe(
      true,
    );
    expect(apiRegistry.commissions instanceof HttpCommissionService).toBe(true);
    expect(apiRegistry.crm instanceof HttpCrmService).toBe(true);
    expect(apiRegistry.crmProspecting instanceof HttpCrmProspectingService).toBe(true);
  });

  it("rebinds the stable registry object when the central mode changes", () => {
    const stableRegistry = services;

    activateServiceRegistry("api");
    expect(services).toBe(stableRegistry);
    expect(services.auth instanceof HttpAuthService).toBe(true);
    expect(services.listings instanceof HttpListingsService).toBe(true);
    expect(services.crm instanceof HttpCrmService).toBe(true);
    expect(services.crmProspecting instanceof HttpCrmProspectingService).toBe(true);

    activateServiceRegistry("demo");
    expect(services).toBe(stableRegistry);
    expect(services.auth instanceof DemoAuthService).toBe(true);
    expect(services.listings instanceof DemoListingsService).toBe(true);
    expect(services.crm instanceof DemoCrmService).toBe(true);
    expect(services.crmProspecting instanceof DemoProspectResearchService).toBe(true);
  });

  it("exposes asynchronous Promise-based APIs on all domain services in demo mode", async () => {
    const categories = await services.taxonomy.getRootCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);

    const boosts = await services.promotions.getAvailableBoosts();
    expect(Array.isArray(boosts)).toBe(true);
    expect(boosts).toHaveLength(0);

    const proPlans = await services.promotions.getProSubscriptionPlans();
    expect(Array.isArray(proPlans)).toBe(true);
    expect(proPlans.length).toBeGreaterThan(0);

    const catalog = await services.businessRules.getCatalog("FR");
    expect(catalog.products.length).toBeGreaterThan(0);
    expect(catalog.rules.length).toBeGreaterThan(0);
    expect(catalog.commissionPolicies.length).toBeGreaterThan(0);
  });

  it("provides deterministic demo verification status without backend calls", async () => {
    const status =
      await services.verification.getUserVerificationStatus("demo-user");
    expect(status).toBeDefined();
    expect(status.state).toBeDefined();
    expect(typeof status.isPhoneVerified).toBe("boolean");
    expect(typeof status.isIdentityVerified).toBe("boolean");
    expect(typeof status.isBusinessVerified).toBe("boolean");
    expect(typeof status.isBankPayoutConfigured).toBe("boolean");
  });
});
