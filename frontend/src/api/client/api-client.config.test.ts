import { afterEach, describe, expect, it, vi } from "vitest";

describe("API client environment configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uses the configured versioned API URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://api-development.shongre.invalid/api/v1",
    );

    const { apiClientConfig } = await import("./api-client.config");

    expect(apiClientConfig).toEqual({
      apiBaseUrl: "https://api-development.shongre.invalid/api/v1",
    });
  });

  it("keeps browser requests first-party and SSR requests on the configured API", async () => {
    const { resolveApiRequestBaseUrl } = await import("./api-client.config");
    const configured = "https://api.shongre.invalid/api/v1";
    vi.stubGlobal("window", undefined);
    expect(resolveApiRequestBaseUrl(configured)).toBe(configured);
    vi.stubGlobal("window", {});
    expect(resolveApiRequestBaseUrl(configured)).toBe("/api/v1");
  });
});
