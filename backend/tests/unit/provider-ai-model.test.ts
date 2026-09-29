import { afterEach, describe, expect, it, vi } from "vitest";
import { SHONGRE_PROVIDER_REGISTRY } from "@shongre/contracts/provider-platform";

let connection: {
  provider_id: string;
  configuration: Record<string, unknown>;
  status: string;
  tenant_id: string;
  owner_type: string;
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
  assertSafeProviderUrl: async (url: string) => new URL(url),
  publicNetworkDispatcher: undefined,
}));

import { RemoteGenerativeAiGateway } from "../../src/integrations/providers/gateways/remote-capability-gateways.js";

afterEach(() => vi.unstubAllGlobals());

function connect(providerId: string, configuration: Record<string, unknown>) {
  connection = {
    provider_id: providerId,
    configuration,
    status: "ACTIVE",
    tenant_id: "tenant-1",
    owner_type: "TENANT",
  };
  return () =>
    new RemoteGenerativeAiGateway().generate(
      {
        tenantId: "tenant-1",
        connectionId: "connection-1",
        providerId,
      } as never,
      {
        instructions: "Résume.",
        safeContext: {},
        maxOutputTokens: 64,
      } as never,
    );
}

function answeringTransport() {
  const transport = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ content: [{ text: "Résumé." }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", transport);
  return transport;
}

const sentModel = (transport: ReturnType<typeof answeringTransport>) =>
  JSON.parse(String(transport.mock.calls[0]?.[1]?.body)).model;

describe("AI gateway model selection", () => {
  it("uses the provider catalogue's default when the connection names none", async () => {
    const catalogued = SHONGRE_PROVIDER_REGISTRY.find(
      (provider) => provider.id === "anthropic",
    )?.defaultModel;
    expect(catalogued).toBeTruthy();
    const transport = answeringTransport();

    const result = await connect("anthropic", {})();

    expect(sentModel(transport)).toBe(catalogued);
    expect(result.model).toBe(catalogued);
  });

  it("lets the connection's own model override the catalogue", async () => {
    const transport = answeringTransport();

    await connect("anthropic", { model: "tenant-pinned-model" })();

    expect(sentModel(transport)).toBe("tenant-pinned-model");
  });

  it("refuses a compatible endpoint that names no model instead of guessing one", async () => {
    const transport = answeringTransport();

    await expect(
      connect("openai_compatible", { baseUrl: "https://llm.example.com" })(),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR", statusCode: 503 });
    expect(transport).not.toHaveBeenCalled();
  });
});
