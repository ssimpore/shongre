import { describe, expect, it } from "vitest";
import {
  APP_ENVIRONMENTS,
  assertEnvironmentSafety,
  createEnvironmentConfig,
  parseAppEnvironment,
} from "./app-environment";

const configFor = (environment: (typeof APP_ENVIRONMENTS)[number]) =>
  createEnvironmentConfig({
    appEnvironment: environment,
    environmentId: `shongre-${environment}`,
    publicFranceUrl:
      environment === "local"
        ? "http://web.localhost:3000"
        : `https://fr-${environment}.shongre.invalid`,
    publicInternationalUrl:
      environment === "local"
        ? "http://web.localhost:3000"
        : `https://intl-${environment}.shongre.invalid`,
    apiUrl:
      environment === "local"
        ? "http://api.localhost:4000"
        : `https://api-${environment}.shongre.invalid`,
  });

describe("application environments", () => {
  it.each(APP_ENVIRONMENTS)("parses %s", (environment) => {
    expect(parseAppEnvironment(environment)).toBe(environment);
  });

  it.each([undefined, "", "dev", "prod", "qa"])(
    "rejects invalid APP_ENV %s",
    (environment) => {
      expect(() => parseAppEnvironment(environment)).toThrow(/APP_ENV/);
    },
  );

  it("rejects missing deployment URLs", () => {
    expect(() =>
      createEnvironmentConfig({
        appEnvironment: "staging",
        environmentId: "shongre-staging",
        publicFranceUrl: "",
        publicInternationalUrl: "https://intl.shongre.invalid",
        apiUrl: "https://api.shongre.invalid",
      }),
    ).toThrow(/PUBLIC_FR_URL/);
  });

  it.each(
    APP_ENVIRONMENTS.filter((environment) => environment !== "production"),
  )("disables search indexing in %s", (environment) => {
    expect(configFor(environment).searchIndexingEnabled).toBe(false);
  });

  it("enables search indexing only in production", () => {
    expect(configFor("production").searchIndexingEnabled).toBe(true);
  });
});

describe("environment safety", () => {
  it("rejects a development deployment connected to a production fingerprint", () => {
    expect(() =>
      assertEnvironmentSafety({
        config: configFor("development"),
        apiEnvironmentId: "shongre-production",
        supabaseEnvironmentId: "shongre-production",
        storageEnvironmentId: "shongre-production",
        paymentMode: "test",
        emailMode: "sandbox",
        aiMode: "development",
        analyticsMode: "development",
      }),
    ).toThrow(/API_ENVIRONMENT_ID/);
  });

  it("rejects staging connected to the wrong Supabase project", () => {
    expect(() =>
      assertEnvironmentSafety({
        config: configFor("staging"),
        supabaseProjectRef: "production-project-ref",
        expectedSupabaseProjectRef: "staging-project-ref",
        paymentMode: "test",
        emailMode: "sandbox",
        aiMode: "staging",
        analyticsMode: "staging",
      }),
    ).toThrow(/SUPABASE_PROJECT_REF/);
  });

  it("rejects preview connected to production storage", () => {
    expect(() =>
      assertEnvironmentSafety({
        config: configFor("preview"),
        storageEnvironmentId: "shongre-production",
        paymentMode: "test",
        emailMode: "sandbox",
        aiMode: "development",
        analyticsMode: "test",
      }),
    ).toThrow(/STORAGE_ENVIRONMENT_ID/);
  });

  it("rejects live payment credentials in test", () => {
    expect(() =>
      assertEnvironmentSafety({
        config: configFor("test"),
        paymentMode: "live",
        emailMode: "console",
        aiMode: "mock",
        analyticsMode: "off",
      }),
    ).toThrow(/live payments/);
  });

  it("rejects a production deployment with a mismatched API fingerprint", () => {
    expect(() =>
      assertEnvironmentSafety({
        config: configFor("production"),
        apiEnvironmentId: "shongre-staging",
        paymentMode: "live",
        emailMode: "live",
        aiMode: "production",
        analyticsMode: "production",
      }),
    ).toThrow(/API_ENVIRONMENT_ID/);
  });

  it("accepts a fully aligned production deployment", () => {
    expect(() =>
      assertEnvironmentSafety({
        config: configFor("production"),
        apiEnvironmentId: "shongre-production",
        supabaseEnvironmentId: "shongre-production",
        storageEnvironmentId: "shongre-production",
        paymentMode: "live",
        emailMode: "live",
        aiMode: "production",
        analyticsMode: "production",
      }),
    ).not.toThrow();
  });
});
