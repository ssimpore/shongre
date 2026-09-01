import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPublicRuntimeConfig } from "./public-runtime-config.server";

function configureProductionRuntime(): void {
  const values = {
    APP_ENV: "production",
    ENVIRONMENT_ID: "shongre-production",
    PUBLIC_FR_URL: "https://shongre.fr",
    PUBLIC_INTL_URL: "https://shongre.com",
    API_URL: "https://api.shongre.fr",
    NEXT_PUBLIC_DATA_MODE: "api",
    NEXT_PUBLIC_ENABLE_MOCK_STORAGE: "false",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_TestOnly123",
    SHONGRE_MARKETPLACE_ORIGIN: "https://marketplace.shongre.invalid",
    SHONGRE_SOLUTIONS_ORIGIN: "https://solutions.shongre.invalid",
    SHONGRE_PROSPECTS_ORIGIN: "https://prospects.shongre.invalid",
    SHONGRE_FACTURATION_ORIGIN: "https://facturation.shongre.invalid",
  } as const;
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
}

describe("server public runtime configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only backend-connected production Web configuration", () => {
    configureProductionRuntime();

    expect(createPublicRuntimeConfig()).toMatchObject({
      appEnvironment: "production",
      dataMode: "api",
      mockStorageEnabled: false,
      stripePublishableKey: "pk_live_TestOnly123",
      apiBaseUrl: "https://api.shongre.fr/api/v1",
    });
  });

  it("rejects demo data and mock storage in production", () => {
    configureProductionRuntime();
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "demo");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCK_STORAGE", "true");

    expect(() => createPublicRuntimeConfig()).toThrow(
      /NEXT_PUBLIC_DATA_MODE=api.*NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false/,
    );
  });

  it("rejects a non-live publishable key in production", () => {
    configureProductionRuntime();
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_wrong_mode");

    expect(() => createPublicRuntimeConfig()).toThrow(/live publishable key/);
  });
});
