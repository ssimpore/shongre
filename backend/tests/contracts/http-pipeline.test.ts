import { beforeAll, describe, expect, it } from "vitest";
import { Readable, Writable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHttpServer } from "../../src/app/server/index.js";
import {
  seedDemoCredentials,
  DEMO_ACCOUNT_PASSWORD,
} from "../../src/app/bootstrap/seed-demo-credentials.js";

// Exercise the real request listener and domain registrations without binding
// a port. The separate HTTP integration suite still verifies Node networking.
class CapturedResponse extends Writable {
  statusCode = 200;
  headersSent = false;
  readonly headers = new Map<string, string | number | readonly string[]>();
  readonly chunks: Buffer[] = [];
  setHeader(name: string, value: string | number | readonly string[]) {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }
  getHeader(name: string) {
    return this.headers.get(name.toLowerCase());
  }
  removeHeader(name: string) {
    this.headers.delete(name.toLowerCase());
  }
  writeHead(status: number, headers?: Record<string, string>) {
    this.statusCode = status;
    for (const [name, value] of Object.entries(headers || {}))
      this.setHeader(name, value);
    this.headersSent = true;
    return this;
  }
  _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    done: (error?: Error | null) => void,
  ) {
    this.chunks.push(Buffer.from(chunk));
    done();
  }
}
const server = createHttpServer();
async function request(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) {
  const req = Readable.from(
    init.body === undefined ? [] : [Buffer.from(JSON.stringify(init.body))],
  );
  Object.assign(req, {
    url: path,
    method: init.method || "GET",
    headers: {
      "content-type": "application/json",
      "x-request-id": "contract-request",
      ...init.headers,
    },
    socket: { remoteAddress: "127.0.0.1" },
  });
  const res = new CapturedResponse();
  await new Promise<void>((resolve, reject) => {
    res.once("finish", resolve);
    res.once("error", reject);
    server.emit(
      "request",
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
  });
  return {
    status: res.statusCode,
    headers: res.headers,
    body: String(res.getHeader("content-type")).includes("application/json")
      ? JSON.parse(Buffer.concat(res.chunks).toString() || "null")
      : Buffer.concat(res.chunks).toString(),
  };
}

beforeAll(() => seedDemoCredentials());

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
