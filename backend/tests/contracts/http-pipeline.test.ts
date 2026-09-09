import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createBackendApplication } from "../../src/app/server/index.js";
import {
  seedDemoCredentials,
  DEMO_ACCOUNT_PASSWORD,
} from "../../src/app/bootstrap/seed-demo-credentials.js";

// Exercise Fastify's real parsing and the composed domain registrations
// without binding a port. The integration suite separately verifies sockets.
let app: NestFastifyApplication;
async function request(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) {
  const response = await app
    .getHttpAdapter()
    .getInstance()
    .inject({
      url: path,
      method: (init.method || "GET") as "GET",
      headers: {
        "content-type": "application/json",
        "x-request-id": "contract-request",
        ...init.headers,
      },
      payload: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  const headers = new Map(
    Object.entries(response.headers).map(([name, value]) => [
      name.toLowerCase(),
      value,
    ]),
  );
  return {
    status: response.statusCode,
    headers,
    body: String(response.headers["content-type"]).includes("application/json")
      ? JSON.parse(response.body || "null")
      : response.body,
  };
}

beforeAll(async () => {
  await seedDemoCredentials();
  app = await createBackendApplication();
});

afterAll(async () => app?.close());

describe("composed domain HTTP pipeline", () => {
  it("serves the canonical specification and a self-contained API reference", async () => {
    const specification = await request("/api/openapi.json");
    expect(specification.status).toBe(200);
    expect(specification.body.openapi).toBe("3.1.0");
    expect(specification.body.paths["/favorites"].get.operationId).toBeTypeOf(
      "string",
    );
    const documentation = await request("/api/docs");
    expect(documentation.status).toBe(200);
    expect(documentation.body).toContain("/api/openapi.json");
    expect(documentation.body).toContain(
      specification.body.paths["/favorites"].get.operationId,
    );
    expect(documentation.body).not.toContain("<script");
  });
  it("serves the developer console to browsers and a descriptor to clients", async () => {
    const page = await request("/", { headers: { accept: "text/html" } });
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(page.headers.get("vary")).toContain("Accept-Encoding");
    expect(page.body).toContain("Backend API");
    expect(page.body).toContain('id="console-contract"');
    // The console never advertises a route the contract does not document.
    expect(page.body).toContain("/api/v1/listings");
    expect(page.body).not.toContain("SUPABASE_SERVICE_ROLE_KEY");

    const descriptor = await request("/");
    expect(descriptor.status).toBe(200);
    expect(descriptor.body).toMatchObject({
      status: "ok",
      service: "shongre-backend",
      environment: "test",
    });
  });

  it.each(["/health", "/health/live", "/health/ready", "/livez", "/readyz"])(
    "serves the operational contract at %s",
    async (path) => {
      const result = await request(path);
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        service: "shongre-backend",
        environment: "test",
      });
      expect(result.headers.get("x-request-id")).toBe("contract-request");
    },
  );

  it("preserves native identity, favorite ownership, and conflicting-market rejection", async () => {
    const login = await request("/api/v1/auth/login", {
      method: "POST",
      headers: { "x-shongre-client": "native" },
      body: {
        email: "thomas.laurent@example.fr",
        password: DEMO_ACCOUNT_PASSWORD,
      },
    });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTypeOf("string");
    const headers = {
      authorization: `Bearer ${login.body.token}`,
      "x-shongre-market": "FR",
    };
    const favorites = await request("/api/v1/favorites", { headers });
    expect(favorites.status).toBe(200);
    expect(favorites.body.listingIds).toBeInstanceOf(Array);
    const denied = await request("/api/v1/favorites?marketCode=BE", {
      headers,
    });
    expect(denied.status).toBe(409);
    expect(denied.body).toMatchObject({
      status: 409,
      code: "CONFLICT",
      requestId: "contract-request",
      error: { code: "CONFLICT" },
    });
    expect(denied.headers.get("cache-control")).toBe("private, no-store");
  });

  it("preserves the guest capability denial", async () => {
    const result = await request("/api/v1/favorites", {
      headers: { "x-shongre-market": "FR" },
    });
    expect(result.status).toBe(401);
    expect(result.body.code).toBe("UNAUTHENTICATED");
  });

  it("does not reflect unknown token-bearing paths in errors", async () => {
    const result = await request(
      "/private-callback/credential-that-must-not-be-reflected",
    );
    expect(result.status).toBe(404);
    expect(JSON.stringify(result.body)).not.toContain(
      "credential-that-must-not-be-reflected",
    );
    expect(result.body).toMatchObject({
      type: "about:blank",
      status: 404,
      requestId: "contract-request",
    });
  });
});
