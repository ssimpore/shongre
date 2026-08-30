import { afterEach, describe, it, expect } from "vitest";
import {
  activateServiceRegistry,
  createServiceRegistry,
  services,
} from "./service-registry";
import { isDemoMode } from "./data-mode.service";

const SERVICE_KEYS = [
  "listings",
  "homepage",
  "search",
  "auth",
  "markets",
  "taxonomy",
  "messaging",
  "notifications",
  "orders",
  "payments",
  "promotions",
  "verification",
  "workspace",
  "admin",
  "reviews",
  "ai",
  "trending",
  "courses",
  "auto",
  "realEstate",
  "employment",
  "businessRules",
  "finance",
  "commissions",
  "providerControlPlane",
  "support",
  "featureFlags",
  "moderation",
  "crm",
  "crmProspecting",
  "marketing",
  "analytics",
  "invoicing",
  "solutions",
] as const;

describe("Service Registry & API Adapter Boundary", () => {
  afterEach(() => {
    activateServiceRegistry("demo");
  });

  it("constructs the complete lazy registry in demo mode by default", () => {
    expect(isDemoMode()).toBe(true);
    const registry = createServiceRegistry("demo");
    expect(Object.keys(registry)).toEqual(SERVICE_KEYS);
    for (const key of SERVICE_KEYS) expect(registry[key]).toBeDefined();
    expect(registry.auth.completeDemoSocialAuth).toBeTypeOf("function");
    expect(registry.notifications.simulateNotification).toBeTypeOf("function");
  });

  it("constructs the complete lazy registry in api mode when configured", () => {
    const apiRegistry = createServiceRegistry("api");
    expect(Object.keys(apiRegistry)).toEqual(SERVICE_KEYS);
    for (const key of SERVICE_KEYS) expect(apiRegistry[key]).toBeDefined();
    expect(apiRegistry.auth.completeDemoSocialAuth).toBeUndefined();
    expect(apiRegistry.notifications.simulateNotification).toBeUndefined();
  });

  it("rebinds the stable registry object when the central mode changes", () => {
    const stableRegistry = services;

    activateServiceRegistry("api");
    expect(services).toBe(stableRegistry);
    expect(services.auth.completeDemoSocialAuth).toBeUndefined();
    expect(services.notifications.simulateNotification).toBeUndefined();

    activateServiceRegistry("demo");
    expect(services).toBe(stableRegistry);
    expect(services.auth.completeDemoSocialAuth).toBeTypeOf("function");
    expect(services.notifications.simulateNotification).toBeTypeOf("function");
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
