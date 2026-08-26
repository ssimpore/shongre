import { afterEach, describe, expect, it, vi } from "vitest";

import { marketInfrastructureFromPublicEnvironment } from "./market-infrastructure";

describe("marketInfrastructureFromPublicEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps client-side market switches on staging domains", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SHONGRE_GLOBAL_DOMAIN",
      "staging.shongre.com",
    );
    vi.stubEnv("NEXT_PUBLIC_SHONGRE_FR_DOMAIN", "staging.shongre.fr");
    vi.stubEnv("NEXT_PUBLIC_SHONGRE_CANONICAL_PROTOCOL", "https");

    expect(marketInfrastructureFromPublicEnvironment()).toEqual({
      globalDomain: "staging.shongre.com",
      franceDomain: "staging.shongre.fr",
      canonicalProtocol: "https",
    });
  });
});
