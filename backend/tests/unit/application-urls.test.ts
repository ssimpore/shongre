import { afterEach, describe, expect, it, vi } from "vitest";
import type { EnvironmentConfig } from "@shongre/contracts/environment";
import { resolveApplicationUrls } from "../../src/app/config/index.js";

function environment(
  name: EnvironmentConfig["environment"],
): EnvironmentConfig {
  return {
    environment: name,
    environmentId: `shongre-${name}`,
    urls: {
      franceApp: new URL("https://fr.shongre.test"),
      internationalApp: new URL("https://shongre.test"),
      api: new URL("https://api.shongre.test"),
    },
    searchIndexingEnabled: false,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("split Web application URLs", () => {
  it("shares the marketplace origin outside production", () => {
    vi.stubEnv("SHONGRE_MARKETPLACE_ORIGIN", "");
    vi.stubEnv("SHONGRE_SOLUTIONS_ORIGIN", "");
    vi.stubEnv("SHONGRE_PROSPECTS_ORIGIN", "");
    vi.stubEnv("SHONGRE_FACTURATION_ORIGIN", "");
    expect(resolveApplicationUrls(environment("local"))).toEqual({
      marketplace: "https://fr.shongre.test",
      solutions: "https://fr.shongre.test/solutions",
      prospects: "https://fr.shongre.test/prospects",
      facturation: "https://fr.shongre.test/facturation",
    });
  });

  it("prefers explicitly configured origins", () => {
    vi.stubEnv("SHONGRE_MARKETPLACE_ORIGIN", "https://market.shongre.test");
    vi.stubEnv("SHONGRE_SOLUTIONS_ORIGIN", "https://solutions.shongre.test");
    vi.stubEnv("SHONGRE_PROSPECTS_ORIGIN", "");
    vi.stubEnv("SHONGRE_FACTURATION_ORIGIN", "");
    expect(resolveApplicationUrls(environment("staging"))).toEqual({
      marketplace: "https://market.shongre.test",
      solutions: "https://solutions.shongre.test",
      prospects: "https://market.shongre.test/prospects",
      facturation: "https://market.shongre.test/facturation",
    });
  });

  it("never invents a production origin", () => {
    vi.stubEnv("SHONGRE_MARKETPLACE_ORIGIN", "https://www.shongre.test");
    vi.stubEnv("SHONGRE_SOLUTIONS_ORIGIN", "https://solutions.shongre.test");
    vi.stubEnv("SHONGRE_PROSPECTS_ORIGIN", "");
    vi.stubEnv("SHONGRE_FACTURATION_ORIGIN", "");
    expect(resolveApplicationUrls(environment("production"))).toEqual({
      marketplace: "https://www.shongre.test",
      solutions: "https://solutions.shongre.test",
      prospects: null,
      facturation: null,
    });
  });

  it("rejects a malformed or credential-bearing origin", () => {
    vi.stubEnv("SHONGRE_SOLUTIONS_ORIGIN", "not-a-url");
    expect(() => resolveApplicationUrls(environment("local"))).toThrow(
      /SHONGRE_SOLUTIONS_ORIGIN must be an absolute URL/,
    );
    vi.stubEnv(
      "SHONGRE_SOLUTIONS_ORIGIN",
      "https://user:secret@solutions.test",
    );
    expect(() => resolveApplicationUrls(environment("local"))).toThrow(
      /must contain an origin only/,
    );
    vi.stubEnv("SHONGRE_SOLUTIONS_ORIGIN", "ftp://solutions.test");
    expect(() => resolveApplicationUrls(environment("local"))).toThrow(
      /must use HTTP or HTTPS/,
    );
    vi.stubEnv("SHONGRE_SOLUTIONS_ORIGIN", "https://solutions.test/workspace");
    expect(() => resolveApplicationUrls(environment("local"))).toThrow(
      /must contain an origin only/,
    );
  });
});
