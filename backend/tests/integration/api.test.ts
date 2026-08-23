import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHttpServer } from "../../src/app/server/index.js";
import {
  seedDemoCredentials,
  DEMO_ACCOUNT_PASSWORD,
} from "../../src/app/bootstrap/seed-demo-credentials.js";
import { Server } from "http";

describe("API v1 Endpoints Integration", () => {
  let server: Server;
  let baseUrl: string;
  let buyerToken: string;
  let proToken: string;
  let adminToken: string;

  async function login(email: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shongre-Client": "native",
      },
      body: JSON.stringify({ email, password: DEMO_ACCOUNT_PASSWORD }),
    });
    if (res.status !== 200) {
      throw new Error(
        `Login failed for ${email}: ${res.status} ${await res.text()}`,
      );
    }
    return (await res.json()).token;
  }

  const auth = (token: string) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  beforeAll(async () => {
    // The demo personas need password hashes before login can verify anything.
    await seedDemoCredentials();

    server = createHttpServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    buyerToken = await login("thomas.laurent@example.fr");
    proToken = await login("contact@atelier-nordique.fr");
    adminToken = await login("admin@shongre.com");
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /health returns 200 OK", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("shongre-backend");
  });

  // ---------------------------------------------------------------------------
  // Public surface
  // ---------------------------------------------------------------------------

  it("GET /api/v1/markets returns all markets", async () => {
    const res = await fetch(`${baseUrl}/api/v1/markets`);
    expect(res.status).toBe(200);
    const markets = await res.json();
    expect(Array.isArray(markets)).toBe(true);
    expect(markets.some((m: any) => m.code === "FR")).toBe(true);
  });

  it("GET /api/v1/taxonomy/root returns categories", async () => {
    const res = await fetch(`${baseUrl}/api/v1/taxonomy/root`);
    expect(res.status).toBe(200);
    const categories = await res.json();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/listings returns paginated listings", async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.listings).toBeDefined();
    expect(Array.isArray(data.listings)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/v1/listings/list_1 returns listing detail", async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings/list_1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("list_1");
    expect(data.title).toContain("Vélo");
  });

  it("POST /api/v1/listings/search executes structured search query", async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Vélo" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("GET /api/v1/promotions/boosts returns boost offers", async () => {
    const res = await fetch(`${baseUrl}/api/v1/promotions/boosts`);
    expect(res.status).toBe(200);
    const boosts = await res.json();
    expect(Array.isArray(boosts)).toBe(true);
    expect(boosts.length).toBeGreaterThanOrEqual(3);
  });

  it("serves the public Immo catalog, spatial-shaped search, and privacy-safe property projection", async () => {
    const catalogResponse = await fetch(
      `${baseUrl}/api/v1/real-estate/catalog?market=FR`,
    );
    expect(catalogResponse.status).toBe(200);
    const catalog = await catalogResponse.json();
    expect(catalog.activation.verticalType).toBe("real_estate");
    expect(
      catalog.offers.some((offer: any) => offer.id === "immo_owner_free"),
    ).toBe(true);

    const searchResponse = await fetch(`${baseUrl}/api/v1/real-estate/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketCode: "FR",
        transactionTypes: ["sale"],
        center: { latitude: 45.76, longitude: 4.84 },
        radiusKm: 30,
        sort: "promoted",
      }),
    });
    expect(searchResponse.status).toBe(200);
    const search = await searchResponse.json();
    expect(search.items.length).toBeGreaterThan(0);

    const propertyResponse = await fetch(
      `${baseUrl}/api/v1/real-estate/properties/property_apartment_lyon`,
    );
    expect(propertyResponse.status).toBe(200);
    const property = await propertyResponse.json();
    expect(property.address).not.toHaveProperty("exactAddress");
    expect(property).not.toHaveProperty("documents");
    expect(property).not.toHaveProperty("riskSignals");
  });

  it("serves the public employment catalog, filters and product-free job projection", async () => {
    const catalogResponse = await fetch(
      `${baseUrl}/api/v1/employment/catalog?market=FR`,
    );
    expect(catalogResponse.status).toBe(200);
    const catalog = await catalogResponse.json();
    expect(catalog.activation.verticalType).toBe("employment");
    expect(
      catalog.offers.find(
        (offer: any) => offer.id === "employment.employer.free",
      ).prices[0].amount.amountMinor,
    ).toBe(0);

    const searchResponse = await fetch(`${baseUrl}/api/v1/employment/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketCode: "FR",
        contractTypeIds: ["employment.fr.contract_type.seasonal"],
        workingArrangementIds: ["employment.fr.working_arrangement.onsite"],
        sort: "relevance",
      }),
    });
    expect(searchResponse.status).toBe(200);
    const search = await searchResponse.json();
    expect(search.items.length).toBeGreaterThan(0);
    expect(
      search.items.every((job: any) =>
        job.contractTypeId.endsWith(".seasonal"),
      ),
    ).toBe(true);

    const jobResponse = await fetch(
      `${baseUrl}/api/v1/employment/jobs/job-seasonal-nice`,
    );
    expect(jobResponse.status).toBe(200);
    const job = await jobResponse.json();
    expect(job.candidateFeeRequired).toBe(false);
    expect(job).not.toHaveProperty("condition");
    expect(job).not.toHaveProperty("delivery");
    expect(job).not.toHaveProperty("stock");
  });

  it("keeps employment candidate and recruiter workspaces permission-scoped", async () => {
    const candidateResponse = await fetch(
      `${baseUrl}/api/v1/employment/candidate/workspace`,
      { headers: auth(buyerToken) },
    );
    expect(candidateResponse.status).toBe(200);
    const candidate = await candidateResponse.json();
    expect(candidate.profile.userId).toBe("user_thomas");
    expect(candidate).not.toHaveProperty("recruiterNotes");

    const deniedRecruiterResponse = await fetch(
      `${baseUrl}/api/v1/employment/recruiter/employers`,
      { headers: auth(buyerToken) },
    );
    expect(deniedRecruiterResponse.status).toBe(403);

    const recruiterResponse = await fetch(
      `${baseUrl}/api/v1/employment/recruiter/employers`,
      { headers: auth(proToken) },
    );
    expect(recruiterResponse.status).toBe(200);
    const employers = await recruiterResponse.json();
    expect(employers.map((employer: any) => employer.id)).toEqual([
      "employer-technova",
    ]);

    const deniedAdminResponse = await fetch(
      `${baseUrl}/api/v1/employment/admin/overview?market=FR`,
      { headers: auth(proToken) },
    );
    expect(deniedAdminResponse.status).toBe(403);
    const adminResponse = await fetch(
      `${baseUrl}/api/v1/employment/admin/overview?market=FR`,
      { headers: auth(adminToken) },
    );
    expect(adminResponse.status).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  it("POST /api/v1/auth/login creates a cookie-only browser session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "thomas.laurent@example.fr",
        password: DEMO_ACCOUNT_PASSWORD,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe("thomas.laurent@example.fr");
    expect(data).not.toHaveProperty("token");
    expect(data).not.toHaveProperty("refreshToken");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("returns Shongre tokens only to an explicit native client", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shongre-Client": "native",
      },
      body: JSON.stringify({
        email: "thomas.laurent@example.fr",
        password: DEMO_ACCOUNT_PASSWORD,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token.split(".")).toHaveLength(3);
    expect(data.refreshToken).toBeTruthy();
  });

  it("POST /api/v1/auth/login rejects a login with no password", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "thomas.laurent@example.fr" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/auth/login rejects a wrong password", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "thomas.laurent@example.fr",
        password: "not-the-password",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/auth/login does not reveal whether an account exists", async () => {
    const unknown = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nobody@example.fr",
        password: "whatever-password",
      }),
    });
    const wrongPassword = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "thomas.laurent@example.fr",
        password: "whatever-password",
      }),
    });

    expect(unknown.status).toBe(wrongPassword.status);
    expect(await unknown.json()).toEqual(await wrongPassword.json());
  });

  it("GET /api/v1/auth/me returns null without a token and the profile with one", async () => {
    const anonymous = await fetch(`${baseUrl}/api/v1/auth/me`);
    expect(anonymous.status).toBe(200);
    expect(await anonymous.json()).toBeNull();

    const authenticated = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: auth(buyerToken),
    });
    expect((await authenticated.json()).email).toBe(
      "thomas.laurent@example.fr",
    );
  });

  it("rejects a token with a tampered payload", async () => {
    const [header, , signature] = buyerToken.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({
        sub: "user_admin",
        email: "admin@shongre.com",
        role: "super_admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await fetch(`${baseUrl}/api/v1/admin/stats`, {
      headers: {
        Authorization: `Bearer ${header}.${forgedPayload}.${signature}`,
      },
    });
    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // Authorization: unauthenticated access is refused
  // ---------------------------------------------------------------------------

  it("refuses unauthenticated access to protected endpoints", async () => {
    const protectedCalls: Array<[string, RequestInit]> = [
      ["/api/v1/admin/stats", {}],
      ["/api/v1/admin/users", {}],
      ["/api/v1/admin/audit-logs", {}],
      ["/api/v1/favorites", {}],
      ["/api/v1/verification/status/user_thomas", {}],
      ["/api/v1/orders/purchases/user_thomas", {}],
      ["/api/v1/messaging/conversations/user_camille", {}],
      ["/api/v1/notifications/user_camille", {}],
      ["/api/v1/payments/balance/user_camille", {}],
      ["/api/v1/workspace/summary/user_thomas", {}],
      ["/api/v1/real-estate/drafts/draft-private", {}],
      ["/api/v1/employment/candidate/workspace", {}],
      ["/api/v1/employment/recruiter/employers", {}],
      ["/api/v1/employment/admin/overview", {}],
      [
        "/api/v1/payments/intent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 150 }),
        },
      ],
      [
        "/api/v1/orders/direct-purchase",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: "list_1",
            deliveryMethod: "hand_delivery",
          }),
        },
      ],
    ];

    for (const [path, init] of protectedCalls) {
      const res = await fetch(`${baseUrl}${path}`, init);
      expect(res.status, path).toBe(401);
    }
  });

  // ---------------------------------------------------------------------------
  // Authorization: authenticated but insufficient
  // ---------------------------------------------------------------------------

  it("refuses admin endpoints to an ordinary buyer", async () => {
    for (const path of [
      "/api/v1/admin/stats",
      "/api/v1/admin/users",
      "/api/v1/admin/audit-logs",
    ]) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: auth(buyerToken),
      });
      expect(res.status, path).toBe(403);
    }
  });

  it("allows admin endpoints to an administrator", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/stats`, {
      headers: auth(adminToken),
    });
    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.totalUsers).toBeGreaterThan(0);
  });

  it("protects Immo administration with the vertical permission", async () => {
    const forbidden = await fetch(
      `${baseUrl}/api/v1/real-estate/admin/overview`,
      {
        headers: auth(buyerToken),
      },
    );
    expect(forbidden.status).toBe(403);

    const allowed = await fetch(
      `${baseUrl}/api/v1/real-estate/admin/overview?market=FR`,
      {
        headers: auth(adminToken),
      },
    );
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).catalog.activation.verticalType).toBe(
      "real_estate",
    );
  });

  it("refuses a privilege escalation through /auth/switch-role", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/switch-role`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({ role: "super_admin" }),
    });
    expect(res.status).toBe(403);

    // And the session must not have gained anything from the attempt.
    const after = await fetch(`${baseUrl}/api/v1/admin/stats`, {
      headers: auth(buyerToken),
    });
    expect(after.status).toBe(403);
  });

  it("allows switching to a role the account actually holds", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/switch-role`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({ role: "individual_seller" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe("individual_seller");
    expect(data.token.split(".")).toHaveLength(3);
  });

  it("refuses registration that claims a staff role", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "escalation@example.fr",
        name: "Escalation Attempt",
        role: "admin",
        password: "a-perfectly-long-password",
      }),
    });
    expect(res.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // Authorization: cross-user access (IDOR)
  // ---------------------------------------------------------------------------

  it("refuses to return another user's conversations", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/messaging/conversations/user_camille`,
      {
        headers: auth(buyerToken),
      },
    );
    expect(res.status).toBe(404);
  });

  it("refuses to return another user's notifications and orders", async () => {
    for (const path of [
      "/api/v1/notifications/user_camille",
      "/api/v1/orders/purchases/user_camille",
      "/api/v1/workspace/summary/user_camille",
    ]) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: auth(buyerToken),
      });
      expect(res.status, path).toBe(404);
    }
  });

  it("scopes owner-addressed routes to the caller", async () => {
    const byId = await fetch(`${baseUrl}/api/v1/notifications/user_thomas`, {
      headers: auth(buyerToken),
    });
    expect(byId.status).toBe(200);

    const byAlias = await fetch(`${baseUrl}/api/v1/notifications/me`, {
      headers: auth(buyerToken),
    });
    expect(byAlias.status).toBe(200);

    // Compare identity rather than the whole payload: the demo repository
    // stamps createdAt at call time, so two reads differ by milliseconds.
    const idsOf = (rows: any[]) => rows.map((r) => `${r.id}:${r.userId}`);
    expect(idsOf(await byAlias.json())).toEqual(idsOf(await byId.json()));
  });

  it("ignores a body-supplied identity and uses the authenticated caller", async () => {
    const res = await fetch(`${baseUrl}/api/v1/orders/direct-purchase`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({
        listingId: "list_1",
        buyerId: "user_camille", // attacker-supplied; must be ignored
        deliveryMethod: "hand_delivery",
        paymentMethod: "card",
      }),
    });
    expect(res.status).toBe(200);
    const order = await res.json();
    expect(order.buyerId).toBe("user_thomas");
    expect(order.totalCharged).toBeGreaterThan(0);
  });

  it("refuses profile updates that try to change role or verification state", async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/user_thomas`, {
      method: "PUT",
      headers: auth(buyerToken),
      body: JSON.stringify({
        name: "Thomas Renamed",
        primaryRole: "super_admin",
        status: "active",
        isIdentityVerified: true,
      }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.name).toBe("Thomas Renamed");
    expect(updated.primaryRole).not.toBe("super_admin");
  });

  // ---------------------------------------------------------------------------
  // Authenticated happy paths
  // ---------------------------------------------------------------------------

  it("GET /api/v1/verification/status returns the caller status", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/verification/status/user_thomas`,
      { headers: auth(buyerToken) },
    );
    expect(res.status).toBe(200);
    const status = await res.json();
    expect(status.state).toBeDefined();
    expect(status.isPhoneVerified).toBe(true);
  });

  it("POST /api/v1/payments/intent rejects a client-supplied amount without an authoritative quote", async () => {
    const res = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({ amount: 150, currency: "EUR" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code || data.code).toBeDefined();
    expect(data.clientSecret).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Mobile safety and account lifecycle
  // ---------------------------------------------------------------------------

  it("accepts an authenticated user report for moderation", async () => {
    const res = await fetch(`${baseUrl}/api/v1/reports`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({
        listingId: "list_1",
        reason: "other",
        details:
          "Le contenu de cette annonce doit être vérifié par la modération.",
      }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");
  });

  it("enforces a block on subsequent message sends and supports explicit unblock", async () => {
    const sellerToken = await login("camille.martin@example.fr");
    const block = await fetch(`${baseUrl}/api/v1/messaging/block`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({ targetUserId: "user_camille" }),
    });
    expect(block.status).toBe(200);

    const refused = await fetch(`${baseUrl}/api/v1/messaging/send`, {
      method: "POST",
      headers: auth(sellerToken),
      body: JSON.stringify({
        conversationId: "conv_1",
        text: "Ce message doit être refusé.",
      }),
    });
    expect(refused.status).toBe(403);

    const unblock = await fetch(`${baseUrl}/api/v1/messaging/unblock`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({ targetUserId: "user_camille" }),
    });
    expect(unblock.status).toBe(200);
  });

  it("registers and removes only the caller push device token", async () => {
    const token = "ExpoPushToken[mobile-test-token]";
    const register = await fetch(`${baseUrl}/api/v1/notifications/devices`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({ token, platform: "ios", appVersion: "1.0.0" }),
    });
    expect(register.status).toBe(200);

    const remove = await fetch(
      `${baseUrl}/api/v1/notifications/devices/unregister`,
      {
        method: "POST",
        headers: auth(buyerToken),
        body: JSON.stringify({ token }),
      },
    );
    expect(remove.status).toBe(200);
  });

  it("blocks deletion while an order is active", async () => {
    const res = await fetch(`${baseUrl}/api/v1/account/delete`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({ password: DEMO_ACCOUNT_PASSWORD }),
    });
    expect(res.status).toBe(409);
  });

  it("anonymizes an eligible account, revokes access, and removes its credential", async () => {
    const email = "mobile-delete-test@example.fr";
    const password = "DeleteThisAccount2026!";
    const registration = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shongre-Client": "native",
      },
      body: JSON.stringify({
        email,
        name: "Deletion Test",
        role: "individual_buyer",
        password,
      }),
    });
    expect(registration.status).toBe(200);
    const session = await registration.json();

    const deletion = await fetch(`${baseUrl}/api/v1/account/delete`, {
      method: "POST",
      headers: auth(session.token),
      body: JSON.stringify({ password, reason: "Test automatisé" }),
    });
    expect(deletion.status).toBe(200);
    expect((await deletion.json()).status).toBe("completed");

    const me = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: auth(session.token),
    });
    expect(await me.json()).toBeNull();
    const relogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(relogin.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  it("refuses an unsigned Stripe webhook", async () => {
    const res = await fetch(`${baseUrl}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "payment_intent.succeeded" }),
    });
    expect(res.status).toBe(403);
  });
});
