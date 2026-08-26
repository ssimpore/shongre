import { afterEach, describe, expect, it, vi } from "vitest";

describe("API client environment configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the configured versioned API URL in API mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "api");
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://api-development.shongre.invalid/api/v1",
    );

    const { apiClientConfig } = await import("./api-client.config");

    expect(apiClientConfig).toEqual({
      dataMode: "api",
      apiBaseUrl: "https://api-development.shongre.invalid/api/v1",
      demoLatencyMs: 0,
    });
  });

  it("keeps demo mode independent of an API deployment", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "demo");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    const { apiClientConfig } = await import("./api-client.config");

    expect(apiClientConfig.dataMode).toBe("demo");
    expect(apiClientConfig.apiBaseUrl).toBe("");
  });
});
