import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicRuntimeConfig } from "./public-runtime-config";

const injected: PublicRuntimeConfig = {
  appEnvironment: "staging",
  environmentId: "shongre-staging",
  franceUrl: "https://staging.shongre.fr/",
  internationalUrl: "https://staging.shongre.com/",
  apiBaseUrl: "https://api-staging.shongre.fr/api/v1",
  dataMode: "api",
  mockStorageEnabled: false,
  stripePublishableKey: "pk_test_staging",
  release: "a".repeat(40),
  applications: {
    marketplace: {
      applicationId: "marketplace",
      origin: "https://staging.shongre.fr",
      fallbackPath: "/",
    },
    solutions: {
      applicationId: "solutions",
      origin: "https://solutions.staging.shongre.fr",
      fallbackPath: "/solutions",
    },
    prospects: {
      applicationId: "prospects",
      origin: "https://prospects.staging.shongre.fr",
      fallbackPath: "/prospects",
    },
    facturation: {
      applicationId: "facturation",
      origin: "https://facturation.staging.shongre.fr",
      fallbackPath: "/facturation",
    },
  },
  analytics: {
    mode: "staging",
    internalEnabled: true,
    posthog: {
      enabled: false,
      key: "",
      host: "https://eu.i.posthog.com",
      sessionReplayEnabled: false,
    },
    ga4: { enabled: false, measurementId: "" },
    matomo: { enabled: false, url: "", siteId: "" },
    cloudflare: { enabled: false, token: "" },
    sentry: { enabled: false, dsn: "", tracesSampleRate: 0 },
  },
  externalLinks: {
    appStore: "",
    googlePlay: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    youtube: "",
  },
};

describe("public runtime configuration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the configuration injected into HTML instead of build-time values", async () => {
    vi.stubGlobal("window", { __SHONGRE_RUNTIME_CONFIG__: injected });
    const { getPublicRuntimeConfig } = await import("./public-runtime-config");
    expect(getPublicRuntimeConfig()).toEqual(injected);
  });

  it("fails closed when the server did not inject browser configuration", async () => {
    vi.stubGlobal("window", {});
    const { getPublicRuntimeConfig } = await import("./public-runtime-config");
    expect(() => getPublicRuntimeConfig()).toThrow(/was not injected/);
  });
});
