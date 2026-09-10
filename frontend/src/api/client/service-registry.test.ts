import { describe, it, expect } from "vitest";
import { createServiceRegistry, services } from "./service-registry";

const SERVICE_KEYS = [
  "listings",
  "homepage",
  "search",
  "auth",
  "markets",
  "geo",
  "taxonomy",
  "messaging",
  "notifications",
  "watchSubscriptions",
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
  "currencies",
  "auto",
  "realEstate",
  "employment",
  "delivery",
  "digitalProducts",
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
  "users",
] as const;

describe("Service Registry & API Adapter Boundary", () => {
  it("constructs the complete API-only lazy registry", () => {
    const registry = createServiceRegistry();
    expect(Object.keys(registry)).toEqual(SERVICE_KEYS);
    for (const key of SERVICE_KEYS) expect(registry[key]).toBeDefined();
  });

  it("keeps every registry entry lazy", () => {
    for (const key of SERVICE_KEYS) expect(services[key]).toBeDefined();
    expect(services.listings.getListings).toBeTypeOf("function");
  });
});
