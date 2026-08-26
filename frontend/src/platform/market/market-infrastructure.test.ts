import { afterEach, describe, expect, it, vi } from "vitest";

import { marketInfrastructureFromPublicEnvironment } from "./market-infrastructure";

describe("marketInfrastructureFromPublicEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps client-side market switches on staging domains", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT_ID", "shongre-staging");
    vi.stubEnv("NEXT_PUBLIC_INTL_URL", "https://staging.shongre.com");
    vi.stubEnv("NEXT_PUBLIC_FR_URL", "https://staging.shongre.fr");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api-staging.shongre.fr");

    expect(marketInfrastructureFromPublicEnvironment()).toEqual({
      globalDomain: "staging.shongre.com",
      franceDomain: "staging.shongre.fr",
      canonicalProtocol: "https",
    });
  });
});
