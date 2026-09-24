import { afterEach, describe, expect, it, vi } from "vitest";

const connection = {
  provider_id: "openai_compatible",
  configuration: { baseUrl: "https://llm.example.com", model: "local-model" },
  status: "ACTIVE",
  tenant_id: "tenant-1",
  owner_type: "TENANT",
};

vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: connection, error: null }),
        }),
      }),
    }),
  }),
}));
vi.mock("../../src/modules/providers/provider-connection.service.js", () => ({
  providerCredentialVault: {
    getCredentialMaterial: async () => ({
      kind: "secret",
      value: JSON.stringify({ apiKey: "tenant-secret-key" }),
    }),
  },
}));
vi.mock("../../src/integrations/providers/safe-provider-url.js", () => ({
  // The configured host passes the public-network check; what it redirects
  // to is the part this suite is about.
  assertSafeProviderUrl: async (url: string) => new URL(url),
}));

import { RemoteGenerativeAiGateway } from "../../src/integrations/providers/gateways/remote-capability-gateways.js";

afterEach(() => vi.unstubAllGlobals());

describe("provider gateway transport", () => {
  it("never follows a redirect with the tenant's credential", async () => {
    const transport = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      // What undici does for `redirect: "error"` on a 3xx.
      if (init?.redirect === "error")
        throw new TypeError("fetch failed: unexpected redirect");
      return new Response(null, {
        status: 307,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      });
    });
    vi.stubGlobal("fetch", transport);

    await expect(
      new RemoteGenerativeAiGateway().generate(
        {
          tenantId: "tenant-1",
          connectionId: "connection-1",
          providerId: "openai_compatible",
        } as never,
        {
          instructions: "Résume.",
          safeContext: {},
          maxOutputTokens: 64,
        } as never,
      ),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR", statusCode: 503 });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[1]?.redirect).toBe("error");
  });
});
