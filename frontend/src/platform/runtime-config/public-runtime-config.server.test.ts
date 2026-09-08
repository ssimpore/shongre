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
    PUBLIC_MEDIA_ASSET_BASE_URL:
      "https://storage.shongre.invalid/listing-media/editorial",
    PUBLIC_CATEGORY_MEDIA_BASE_URL:
      "https://storage.shongre.invalid/listing-media/categories",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_TestOnly123",
    SHONGRE_MARKETPLACE_ORIGIN: "https://marketplace.shongre.invalid",
    SHONGRE_SOLUTIONS_ORIGIN: "https://solutions.shongre.invalid",
    SHONGRE_PROSPECTS_ORIGIN: "https://prospects.shongre.invalid",
    SHONGRE_FACTURATION_ORIGIN: "https://facturation.shongre.invalid",
  } as const;
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
}

function configureLocalRuntime(): void {
  const values = {
    APP_ENV: "local",
    ENVIRONMENT_ID: "shongre-local",
    PUBLIC_FR_URL: "http://127.0.0.1:3000",
    PUBLIC_INTL_URL: "http://127.0.0.1:3000",
    API_URL: "http://127.0.0.1:4000",
    PUBLIC_MEDIA_ASSET_BASE_URL:
      "http://127.0.0.1:54321/storage/v1/object/public/listing-media/local-seed/demo-library",
    PUBLIC_CATEGORY_MEDIA_BASE_URL:
      "http://127.0.0.1:54321/storage/v1/object/public/listing-media/local-seed/categories",
  } as const;
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
}

describe("server public runtime configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only backend-connected production Web configuration", () => {
    configureProductionRuntime();

    expect(createPublicRuntimeConfig()).toMatchObject({
      appEnvironment: "production",
      stripePublishableKey: "pk_live_TestOnly123",
      apiBaseUrl: "https://api.shongre.fr/api/v1",
    });
  });

  it("accepts the connected local API configuration", () => {
    configureLocalRuntime();

    expect(createPublicRuntimeConfig()).toMatchObject({
      appEnvironment: "local",
      apiBaseUrl: "http://127.0.0.1:4000/api/v1",
    });
  });

  it("rejects connected Web configuration without owned media prefixes", () => {
    configureLocalRuntime();
    vi.stubEnv("PUBLIC_CATEGORY_MEDIA_BASE_URL", "");

    expect(() => createPublicRuntimeConfig()).toThrow(
      /PUBLIC_CATEGORY_MEDIA_BASE_URL is required/,
    );
  });

  it("rejects a non-live publishable key in production", () => {
    configureProductionRuntime();
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_wrong_mode");

    expect(() => createPublicRuntimeConfig()).toThrow(/live publishable key/);
  });
});
