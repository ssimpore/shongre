import { describe, it, expect } from "vitest";
import {
  CANONICAL_PROVIDER_REGISTRY,
  getProvidersByCategory,
  getProvidersByCapability,
} from "./provider.registry";
import {
  PROVIDER_CATEGORIES,
  PROVIDER_CAPABILITIES,
} from "./provider-capabilities";

describe("Canonical Provider Registry", () => {
  it("has unique IDs and codes for all registered providers", () => {
    const ids = new Set<string>();
    const codes = new Set<string>();

    CANONICAL_PROVIDER_REGISTRY.forEach((provider) => {
      expect(
        ids.has(provider.id),
        `Duplicate provider id: ${provider.id}`,
      ).toBe(false);
      expect(
        codes.has(provider.code),
        `Duplicate provider code: ${provider.code}`,
      ).toBe(false);
      ids.add(provider.id);
      codes.add(provider.code);
    });

    expect(CANONICAL_PROVIDER_REGISTRY.length).toBeGreaterThan(15);
  });

  it("assigns valid categories recognized by PROVIDER_CATEGORIES", () => {
    CANONICAL_PROVIDER_REGISTRY.forEach((provider) => {
      expect(
        PROVIDER_CATEGORIES[provider.category],
        `Unknown category for ${provider.id}`,
      ).toBeDefined();
    });
  });

  it("assigns valid capabilities recognized by PROVIDER_CAPABILITIES", () => {
    CANONICAL_PROVIDER_REGISTRY.forEach((provider) => {
      expect(provider.capabilities.length).toBeGreaterThan(0);
      provider.capabilities.forEach((cap) => {
        expect(
          PROVIDER_CAPABILITIES[cap],
          `Unknown capability "${cap}" on ${provider.id}`,
        ).toBeDefined();
      });
    });
  });

  it("correctly filters providers by category and capability", () => {
    const paymentProviders = getProvidersByCategory("PAYMENT");
    expect(paymentProviders.some((p) => p.id === "mangopay")).toBe(true);
    expect(paymentProviders.some((p) => p.id === "stripe")).toBe(true);

    const cardProviders = getProvidersByCapability("payment.card");
    expect(cardProviders.length).toBeGreaterThanOrEqual(2);

    const relayProviders = getProvidersByCapability("delivery.relay_point");
    expect(relayProviders.some((p) => p.id === "mondial_relay")).toBe(true);
  });

  it("ensures configuration schemas contain valid fields", () => {
    CANONICAL_PROVIDER_REGISTRY.forEach((provider) => {
      expect(provider.configurationSchema).toBeDefined();
      expect(Array.isArray(provider.configurationSchema.fields)).toBe(true);

      provider.configurationSchema.fields.forEach((field) => {
        expect(field.key).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect([
          "text",
          "number",
          "boolean",
          "select",
          "multi-select",
          "url",
          "password",
        ]).toContain(field.type);
      });
    });
  });
});
