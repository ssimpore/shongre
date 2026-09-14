import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createBackendApplication } from "../../src/app/server/index.js";
import {
  seedDemoCredentials,
  DEMO_ACCOUNT_PASSWORD,
} from "../../src/app/bootstrap/seed-demo-credentials.js";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { generateTotpCode } from "../../src/modules/auth/mfa.service.js";
import { config } from "../../src/app/config/index.js";
import { repositories } from "../../src/infrastructure/database/repositories/index.js";
import { PUBLICATION_CONSTRAINTS } from "@shongre/contracts/publication";

describe("API v1 Endpoints Integration", () => {
  let app: NestFastifyApplication;
  let baseUrl: string;
  let buyerToken: string;
  let proToken: string;
  let adminToken: string;
  let moderatorToken: string;
  let trustToken: string;
  let complianceToken: string;
  let financeToken: string;

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
    const body = await res.json();
    expect(Array.isArray(body.user?.capabilities)).toBe(true);
    return body.token;
  }

  async function loginStaff(email: string): Promise<string> {
    const token = await login(email);
    const setupResponse = await fetch(`${baseUrl}/api/v1/auth/mfa/setup`, {
      method: "POST",
      headers: auth(token),
    });
    if (setupResponse.status !== 200) {
      throw new Error(
        `MFA setup failed for ${email}: ${setupResponse.status} ${await setupResponse.text()}`,
      );
    }
    const setup = await setupResponse.json();
    const confirmResponse = await fetch(`${baseUrl}/api/v1/auth/mfa/confirm`, {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({ code: generateTotpCode(setup.secret) }),
    });
    if (confirmResponse.status !== 200) {
      throw new Error(
        `MFA confirmation failed for ${email}: ${confirmResponse.status} ${await confirmResponse.text()}`,
      );
    }
    return token;
  }

  const auth = (token: string) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  it("rejects overlong product titles through the authenticated publication API", async () => {
    const response = await fetch(`${baseUrl}/api/v1/listings/publish`, {
      method: "POST",
      headers: { ...auth(buyerToken), "X-Shongre-Market": "FR" },
      body: JSON.stringify({
        draft: {
          title: "W".repeat(PUBLICATION_CONSTRAINTS.title.maxLength + 1),
          categoryId: "electronics.smartphones.phones",
          marketCode: "FR",
        },
      }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: {
          field: "title",
          maxLength: PUBLICATION_CONSTRAINTS.title.maxLength,
        },
      },
    });
  });

  beforeAll(async () => {
    // The demo personas need password hashes before login can verify anything.
    await seedDemoCredentials();

    app = await createBackendApplication();
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();

    buyerToken = await login("thomas.laurent@example.fr");
    proToken = await login("recrutement@technova.fr");
    adminToken = await loginStaff("admin@shongre.com");
    moderatorToken = await loginStaff("moderation@shongre.com");
    trustToken = await loginStaff("trust@shongre.com");
    complianceToken = await loginStaff("compliance@shongre.com");
    financeToken = await loginStaff("finance@shongre.com");
  });

  afterAll(async () => {
    await app.close();
  });

  it("reads public listing characteristics with the listing's market and visibility boundary", async () => {
    const original = await repositories.listings.findById("list_1");
    expect(original).not.toBeNull();
    const id = "characteristics-public-vehicle";
    await repositories.listings.save({
      ...original!,
      id,
      categoryId: "vehicles.cars",
      brand: "Peugeot",
      model: "208",
      attributes: {
        model_year: 2022,
        fuel_type: "petrol",
        transmission: "manual",
        mileage: 28500,
        vin_private: "never-public",
        contactCount: 19,
      },
    });
    const endpoint = `${baseUrl}/api/v1/listings/${id}/characteristics`;
    try {
      for (const headers of [
        { "X-Shongre-Market": "FR" },
        { ...auth(adminToken), "X-Shongre-Market": "FR" },
      ]) {
        const response = await fetch(`${endpoint}?locale=fr-FR`, { headers });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.groups.flatMap((group: any) => group.items)).toContainEqual(
          expect.objectContaining({
            code: "fuel_type",
            label: "Énergie / Carburant",
            value: "Essence",
            presentation: "fact",
          }),
        );
        expect(JSON.stringify(body)).not.toMatch(
          /vin_private|never-public|contactCount/,
        );
      }
      const wrongMarket = await fetch(endpoint, {
        headers: { "X-Shongre-Market": "CH" },
      });
      expect(wrongMarket.status).toBe(404);
      expect(
        (
          await fetch(`${endpoint}?locale=invalid_locale`, {
            headers: { "X-Shongre-Market": "FR" },
          })
        ).status,
      ).toBe(400);
      await repositories.listings.update(id, { status: "draft" });
      expect(
        (await fetch(endpoint, { headers: { "X-Shongre-Market": "FR" } }))
          .status,
      ).toBe(404);
    } finally {
      await repositories.listings.delete(id);
    }
  });

  it("returns currency-labelled workspace analytics only to the authorized seller", async () => {
    const token = await login("contact@atelier-nordique.fr");
    const url = `${baseUrl}/api/v1/workspace/pro-analytics/user_pro_atelier`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    const snapshot = await response.json();
    expect(snapshot.revenueByCurrency).toEqual([
      { amountMinor: 384000, currency: "EUR" },
    ]);
    expect(Number.isInteger(snapshot.monthlyViews)).toBe(true);
    expect(Array.isArray(snapshot.topListings)).toBe(true);
    expect((await fetch(url)).status).toBe(401);
    expect([403, 404]).toContain(
      (await fetch(url, { headers: { Authorization: `Bearer ${buyerToken}` } }))
        .status,
    );
    expect([403, 404]).toContain(
      (
        await fetch(`${baseUrl}/api/v1/workspace/pro-analytics/user_camille`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status,
    );
  });

  it("GET /health returns 200 OK", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("shongre-backend");
  });

  it("exposes separate liveness and dependency-aware readiness probes", async () => {
    const [liveResponse, readyResponse, apiHealthResponse, apiReadyResponse] =
      await Promise.all([
        fetch(`${baseUrl}/livez`),
        fetch(`${baseUrl}/readyz`),
        fetch(`${baseUrl}/api/health`),
        fetch(`${baseUrl}/api/ready`),
      ]);
    expect(liveResponse.status).toBe(200);
    expect(readyResponse.status).toBe(200);
    expect(apiHealthResponse.status).toBe(200);
    expect(apiReadyResponse.status).toBe(200);
    expect(await apiHealthResponse.json()).toMatchObject({
      status: "ok",
      environment: config.environment.environment,
    });
    expect(await readyResponse.json()).toMatchObject({
      status: "ready",
      dependencies: { database: "up" },
    });
  });

  it("returns a stable request id and rejects malformed JSON", async () => {
    const requestId = "integration-request-123";
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
      body: "{not-json",
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect((await response.json()).error.code).toBe("BAD_REQUEST");
  });

  it("rejects request bodies above the configured limit", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(1_048_576) }),
    });
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("BAD_REQUEST");
  });

  it("contains malformed path parameters and continues serving requests", async () => {
    for (const id of ["%E0%A4%A", "%FF", "%"]) {
      const response = await fetch(`${baseUrl}/api/v1/listings/${id}`, {
        signal: AbortSignal.timeout(2_000),
        headers: { "X-Request-Id": "malformed-path-regression" },
      });
      expect(response.status).toBe(400);
      expect(response.headers.get("x-request-id")).toBe(
        "malformed-path-regression",
      );
      expect((await response.json()).error.code).toBe("BAD_REQUEST");
      expect((await fetch(`${baseUrl}/livez`)).status).toBe(200);
    }
  });

  it("allows idempotent browser writes only from configured CORS origins", async () => {
    for (const origin of [
      ...config.oauthAllowedReturnOrigins,
      "https://untrusted.invalid",
    ]) {
      const response = await fetch(`${baseUrl}/api/v1/invoicing/invoices`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers":
            "content-type,idempotency-key,x-csrf-token",
        },
      });
      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        origin === "https://untrusted.invalid" ? null : origin,
      );
      expect(
        response.headers.get("access-control-allow-headers")?.toLowerCase(),
      ).toContain("idempotency-key");
    }
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

  it("uses ETags only for anonymous allowlisted public projections", async () => {
    const initial = await fetch(`${baseUrl}/api/v1/markets`);
    const etag = initial.headers.get("etag");
    expect(initial.headers.get("cache-control")).toMatch(
      /public.*max-age=300.*s-maxage=.*stale-while-revalidate=.*stale-if-error=/,
    );
    expect(initial.headers.get("cache-tag")).toContain("shongre-v1-markets");
    expect(initial.headers.get("vary")).toContain("X-Shongre-Market");
    expect(etag).toMatch(/^"[A-Za-z0-9_-]+"$/);

    const unchanged = await fetch(`${baseUrl}/api/v1/markets`, {
      headers: { "If-None-Match": String(etag) },
    });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");

    const credentialed = await fetch(`${baseUrl}/api/v1/markets`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(credentialed.status).toBe(200);
    expect(credentialed.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(credentialed.headers.get("etag")).toBeNull();

    const principalDependent = await fetch(
      `${baseUrl}/api/v1/feature-flags/example`,
    );
    expect(principalDependent.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(principalDependent.headers.get("etag")).toBeNull();

    const compressed = await fetch(`${baseUrl}/api/v1/listings?marketCode=FR`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Shongre-Market": "FR",
      },
    });
    expect(compressed.status).toBe(200);
    expect(compressed.headers.get("content-encoding")).toBe("gzip");
    expect(compressed.headers.get("cache-control")).toContain("max-age=0");
  });

  it("keeps probable-country detection non-authoritative and privacy-safe", async () => {
    const response = await fetch(`${baseUrl}/api/v1/markets/detection`, {
      headers: {
        "X-Country": "BE",
        "X-Shongre-Market": "BE",
        "X-Forwarded-For": "203.0.113.42",
      },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    // Automated tests do not enable a trusted edge header. Arbitrary browser
    // headers therefore cannot turn into a country recommendation.
    expect(body).toMatchObject({
      status: "unknown",
      country: null,
      experience: "global_gateway",
    });
    expect(JSON.stringify(body)).not.toMatch(
      /203\.0\.113\.42|ipAddress|latitude|longitude/,
    );
  });

  it("serves Solutions through a market-scoped contract and protects catalog writes", async () => {
    const unauthorized = await fetch(`${baseUrl}/api/v1/admin/solutions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(unauthorized.status).toBe(401);

    const createBody = {
      name: "Shongre Integration",
      slug: "integration-catalog",
      shortDescription: "Catalogue de test d’intégration",
      description:
        "Définition créée uniquement dans le dépôt de démonstration du backend.",
      icon: "apps",
      category: "Test",
      lifecycle: "COMING_SOON",
      markets: ["FR"],
      languages: ["fr-FR"],
      audiences: ["Professionnels"],
      capabilities: ["Tester le catalogue"],
      requiresAuthentication: false,
      requiresEntitlement: false,
      releaseNotes: [],
      sortOrder: 10,
      catalogVisible: true,
      featured: false,
    };
    const idempotencyKey = "solutions-integration-create";
    const create = () =>
      fetch(`${baseUrl}/api/v1/admin/solutions`, {
        method: "POST",
        headers: {
          ...auth(adminToken),
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(createBody),
      });
    const createdResponse = await create();
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();
    const retriedResponse = await create();
    expect(retriedResponse.status).toBe(201);
    expect((await retriedResponse.json()).id).toBe(created.id);

    const [franceResponse, belgiumResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/solutions?locale=fr-FR`, {
        headers: { "X-Shongre-Market": "FR" },
      }),
      fetch(`${baseUrl}/api/v1/solutions?locale=fr-BE`, {
        headers: { "X-Shongre-Market": "BE" },
      }),
    ]);
    expect(franceResponse.status).toBe(200);
    expect(belgiumResponse.status).toBe(200);
    expect(
      (await franceResponse.json()).map((value: any) => value.id),
    ).toContain(created.id);
    expect(
      (await belgiumResponse.json()).map((value: any) => value.id),
    ).not.toContain(created.id);
  });

  it("resolves consented coordinates ephemerally without echoing them", async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/markets/detection/coordinates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 48.8566,
          longitude: 2.3522,
          accuracy: 20,
        }),
      },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      source: "coordinates",
      country: { code: "FR" },
    });
    expect(JSON.stringify(body)).not.toMatch(/latitude|longitude|48\.8566/);
  });

  it("rejects the removed unversioned API shadow", async () => {
    const res = await fetch(`${baseUrl}/listings`);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("serves Education only through the canonical API route", async () => {
    const [canonicalResponse, removedAliasResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/education/catalog?market=FR`),
      fetch(`${baseUrl}/api/v1/courses/catalog?market=FR`),
    ]);
    expect(canonicalResponse.status).toBe(200);
    expect(removedAliasResponse.status).toBe(404);
    const canonical = await canonicalResponse.json();
    expect(canonical.config.vertical).toBe("tutoring");
  });

  it("GET /api/v1/taxonomy/v1/root returns categories", async () => {
    const res = await fetch(`${baseUrl}/api/v1/taxonomy/v1/root`, {
      headers: { "X-Shongre-Market": "FR" },
    });
    expect(res.status).toBe(200);
    const categories = await res.json();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  it("serves the ordered public header configuration and protects admin writes", async () => {
    const [publicResponse, adminReadResponse, adminWriteResponse] =
      await Promise.all([
        fetch(`${baseUrl}/api/v1/taxonomy/v1/header-navigation`, {
          headers: { "X-Shongre-Market": "FR" },
        }),
        fetch(`${baseUrl}/api/v1/admin/taxonomy/header-navigation`, {
          headers: { "X-Shongre-Market": "FR" },
        }),
        fetch(`${baseUrl}/api/v1/admin/taxonomy/header-navigation`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Shongre-Market": "FR",
          },
          body: JSON.stringify({
            marketCode: "FR",
            expectedRevision: 1,
            changeReason: "Tentative non authentifiée de modification.",
            items: [],
            links: [],
          }),
        }),
      ]);

    expect(publicResponse.status).toBe(200);
    const configuration = await publicResponse.json();
    expect(configuration.marketCode).toBe("FR");
    expect(configuration.items.length).toBeGreaterThan(0);
    expect(configuration.links).toMatchObject([
      {
        target: "category_overview",
        isActive: true,
        shortLabels: { "fr-FR": "Autres" },
      },
      {
        target: "promotions",
        isActive: true,
        shortLabels: { "fr-FR": "Promotions" },
      },
    ]);
    expect(configuration.items.every((item: any) => item.isActive)).toBe(true);
    expect(configuration.items.map((item: any) => item.displayOrder)).toEqual(
      [...configuration.items]
        .sort((left: any, right: any) => left.displayOrder - right.displayOrder)
        .map((item: any) => item.displayOrder),
    );
    expect(adminReadResponse.status).toBe(401);
    expect(adminWriteResponse.status).toBe(401);
  });

  it("serves taxonomy v1 through explicit market-scoped typed endpoints", async () => {
    for (const [marketCode, locale] of [
      ["FR", "fr-FR"],
      ["BE", "fr-BE"],
      ["CH", "fr-CH"],
    ]) {
      const treeResponse = await fetch(
        `${baseUrl}/api/v1/taxonomy/v1/tree?locale=${locale}&version=v1`,
        { headers: { "X-Shongre-Market": marketCode } },
      );
      expect(treeResponse.status).toBe(200);
      const tree = await treeResponse.json();
      expect(tree).toMatchObject({
        taxonomyVersion: "v1",
        marketCode,
        locale,
      });
      expect(tree.items).toHaveLength(302);
      expect(tree.listingTypes).toHaveLength(213);
      expect(
        tree.items.some((node: any) => node.sourceKey === "vehicles.cars.suv"),
      ).toBe(true);
    }

    const resolvedResponse = await fetch(
      `${baseUrl}/api/v1/taxonomy/v1/resolve?category=vehicles.cars.suv&listingTypeId=vehicles.cars.suv.listing&sellerType=individual&locale=fr-FR`,
      { headers: { "X-Shongre-Market": "FR" } },
    );
    expect(resolvedResponse.status).toBe(200);
    const resolved = await resolvedResponse.json();
    expect(resolved.category.id).toBe("vehicles.cars.suv");
    expect(resolved.attributes.length).toBeGreaterThan(0);
    expect(resolved.projections.cardFields.length).toBeGreaterThan(0);

    const optionResponse = await fetch(
      `${baseUrl}/api/v1/taxonomy/v1/options/brand?limit=5`,
      { headers: { "X-Shongre-Market": "FR" } },
    );
    expect(optionResponse.status).toBe(200);
    expect((await optionResponse.json()).items.length).toBeLessThanOrEqual(5);
  });

  it("fails closed for unavailable or mismatched taxonomy markets", async () => {
    const comingSoonResponse = await fetch(
      `${baseUrl}/api/v1/taxonomy/v1/tree`,
      { headers: { "X-Shongre-Market": "SN" } },
    );
    expect(comingSoonResponse.status).toBe(409);
    expect((await comingSoonResponse.json()).error.code).toBe(
      "TAXONOMY_MARKET_UNAVAILABLE",
    );

    const mismatchResponse = await fetch(
      `${baseUrl}/api/v1/taxonomy/v1/tree?market=BE`,
      { headers: { "X-Shongre-Market": "FR" } },
    );
    expect(mismatchResponse.status).toBe(409);
    expect((await mismatchResponse.json()).error.code).toBe("CONFLICT");
  });

  it("GET /api/v1/listings returns paginated listings", async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings?marketCode=FR`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.listings).toBeDefined();
    expect(Array.isArray(data.listings)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/v1/listings/list_1 returns listing detail", async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings/list_1`, {
      headers: { "X-Shongre-Market": "FR" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("list_1");
    expect(data.title).toContain("Vélo");
    expect(data).not.toHaveProperty("safetyRiskScore");
    expect(data).not.toHaveProperty("entitlementSnapshot");
    expect(data).not.toHaveProperty("subscriptionId");
  });

  it("isolates country search while resolving an explicit shared publication", async () => {
    const [frResponse, beResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/listings?marketCode=FR`),
      fetch(`${baseUrl}/api/v1/listings?marketCode=BE`),
    ]);
    expect(frResponse.status).toBe(200);
    expect(beResponse.status).toBe(200);
    const fr = await frResponse.json();
    const be = await beResponse.json();
    expect(fr.listings.some((listing: any) => listing.id === "list_be_1")).toBe(
      false,
    );
    expect(be.listings.some((listing: any) => listing.id === "list_be_1")).toBe(
      true,
    );
    expect(be.listings.some((listing: any) => listing.id === "list_1")).toBe(
      true,
    );

    const sharedDetail = await fetch(`${baseUrl}/api/v1/listings/list_1`, {
      headers: { "X-Shongre-Market": "BE" },
    });
    expect(await sharedDetail.json()).toMatchObject({
      id: "list_1",
      marketCode: "BE",
      price: 265,
      currency: "EUR",
    });
  });

  it("does not expose a Belgium-only listing through the France detail route", async () => {
    const response = await fetch(`${baseUrl}/api/v1/listings/list_be_1`, {
      headers: { "X-Shongre-Market": "FR" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("returns public sellers while excluding Staff identities", async () => {
    const sellerResponse = await fetch(`${baseUrl}/api/v1/users/user_camille`);
    expect(sellerResponse.status).toBe(200);
    const seller = await sellerResponse.json();
    expect(seller.name).toContain("Camille");
    expect(seller).not.toHaveProperty("email");
    expect(seller).not.toHaveProperty("phone");
    expect(seller).not.toHaveProperty("status");
    expect(seller).not.toHaveProperty("isIdentityVerified");

    const staffResponse = await fetch(`${baseUrl}/api/v1/users/user_admin`);
    expect(staffResponse.status).toBe(200);
    const staffSeller = await staffResponse.json();
    expect(staffSeller).toBeNull();
  });

  it("POST /api/v1/listings/search executes structured search query", async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Vélo", marketCode: "FR" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("narrows search to one seller, over GET and POST alike", async () => {
    /*
     * "The other listings from this seller" is a question two public surfaces
     * ask — the rail on a detail page and the seller's own profile — and until
     * this filter existed both answered it by reading the whole market and
     * matching ids in the browser.
     */
    const all = await fetch(
      `${baseUrl}/api/v1/listings/search?marketCode=FR&limit=50`,
      { headers: { "X-Shongre-Market": "FR" } },
    ).then((response) => response.json());
    const sellerId = all.items.find((item: any) => item.sellerId)?.sellerId;
    expect(sellerId).toBeTruthy();

    for (const response of [
      await fetch(
        `${baseUrl}/api/v1/listings/search?marketCode=FR&sellerId=${sellerId}`,
        { headers: { "X-Shongre-Market": "FR" } },
      ),
      await fetch(`${baseUrl}/api/v1/listings/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shongre-Market": "FR",
        },
        body: JSON.stringify({ marketCode: "FR", sellerId }),
      }),
    ]) {
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items.every((item: any) => item.sellerId === sellerId)).toBe(
        true,
      );
      expect(body.items.length).toBeLessThan(all.items.length + 1);
    }

    // An identifier is never punctuation: the value reaches a column filter,
    // so anything that could be syntax is refused rather than interpreted.
    const rejected = await fetch(
      `${baseUrl}/api/v1/listings/search?marketCode=FR&sellerId=${encodeURIComponent("a,b.eq.c")}`,
      { headers: { "X-Shongre-Market": "FR" } },
    );
    expect(rejected.status).toBe(400);
  });

  it("keeps Staff signed in for public discovery while denying customer mutations", async () => {
    const listingUrl = `${baseUrl}/api/v1/listings?marketCode=FR`;
    const anonymous = await fetch(listingUrl);
    const customer = await fetch(listingUrl, {
      headers: auth(buyerToken),
    });
    const staff = await fetch(listingUrl, {
      headers: auth(adminToken),
    });
    const staffNotifications = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: auth(adminToken),
    });
    const staffPublication = await fetch(`${baseUrl}/api/v1/listings/publish`, {
      method: "POST",
      headers: auth(adminToken),
      body: JSON.stringify({}),
    });
    const staffSupportCase = await fetch(`${baseUrl}/api/v1/support/cases`, {
      method: "POST",
      headers: auth(adminToken),
      body: JSON.stringify({
        category: "account",
        subject: "Staff customer-case attempt",
        description: "This customer-plane operation must be denied.",
      }),
    });

    expect(anonymous.status).toBe(200);
    expect(customer.status).toBe(200);
    expect(staff.status).toBe(200);
    expect(Array.isArray((await staff.json()).listings)).toBe(true);
    expect(staffNotifications.status).toBe(403);
    expect(staffPublication.status).toBe(403);
    expect(staffSupportCase.status).toBe(403);

    const stillSignedIn = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: auth(adminToken),
    });
    expect(stillSignedIn.status).toBe(200);
    expect(await stillSignedIn.json()).toMatchObject({
      staffStatus: "active",
      staffRole: "admin",
    });
  });

  it("returns the standard validation envelope for an invalid domain request", async () => {
    const res = await fetch(`${baseUrl}/api/v1/real-estate/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketCode: "not-a-market" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      },
    });
  });

  it("GET /api/v1/business-rules/catalog returns the canonical monetization catalog", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/business-rules/catalog?marketCode=FR`,
    );
    expect(res.status).toBe(200);
    const catalog = await res.json();
    expect(catalog.marketCode).toBe("FR");
    expect(Array.isArray(catalog.products)).toBe(true);
    expect(Array.isArray(catalog.promotions)).toBe(true);
  });

  it("GET /api/v1/monetization/professional-plans exposes only the target preview", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/monetization/professional-plans?marketCode=FR`,
    );
    expect(res.status).toBe(200);
    const presentation = await res.json();

    expect(presentation).toMatchObject({
      mode: "draft_preview",
      checkoutEnabled: false,
      planProductIds: [
        "pro.target.starter",
        "pro.target.growth",
        "pro.target.performance",
      ],
    });
    expect(new Set(presentation.planProductIds).size).toBe(3);
    expect(
      presentation.planProductIds.some((productId: string) =>
        productId.startsWith("plan.pro."),
      ),
    ).toBe(false);
    expect(presentation.catalog).not.toHaveProperty("commercialEconomics");
    expect(presentation.catalog).not.toHaveProperty("providerMappings");
    expect(presentation.catalog).not.toHaveProperty("migrationMappings");
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
      { headers: { "X-Shongre-Market": "FR" } },
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
      { headers: { "X-Shongre-Market": "FR" } },
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
      {
        headers: {
          ...auth(buyerToken),
          "X-Shongre-Market": "FR",
        },
      },
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

  it("sets Education and Employment favorites idempotently per account market", async () => {
    const marketAuth = (marketCode: string) => ({
      ...auth(buyerToken),
      "X-Shongre-Market": marketCode,
    });
    const setFavorite = (
      path: string,
      marketCode: string,
      isFavorite: boolean,
    ) =>
      fetch(`${baseUrl}/api/v1${path}`, {
        method: "PUT",
        headers: marketAuth(marketCode),
        body: JSON.stringify({ isFavorite }),
      });

    const firstTutorSave = await setFavorite(
      "/education/tutors/tutor_sophie/favorite",
      "FR",
      true,
    );
    const replayTutorSave = await setFavorite(
      "/education/tutors/tutor_sophie/favorite",
      "FR",
      true,
    );
    expect(firstTutorSave.status).toBe(200);
    expect(replayTutorSave.status).toBe(200);
    expect(await replayTutorSave.json()).toEqual({ isFavorite: true });

    const [frTutors, beTutors, rejectedBeTutor, removedMissingTutor] =
      await Promise.all([
        fetch(`${baseUrl}/api/v1/education/favorites`, {
          headers: marketAuth("FR"),
        }),
        fetch(`${baseUrl}/api/v1/education/favorites`, {
          headers: marketAuth("BE"),
        }),
        setFavorite("/education/tutors/tutor_sophie/favorite", "BE", true),
        setFavorite("/education/tutors/missing-tutor/favorite", "BE", false),
      ]);
    expect((await frTutors.json()).tutorProfileIds).toContain("tutor_sophie");
    expect(await beTutors.json()).toEqual({ tutorProfileIds: [] });
    expect(rejectedBeTutor.status).toBe(404);
    expect(await removedMissingTutor.json()).toEqual({ isFavorite: false });

    const firstJobSave = await setFavorite(
      "/employment/jobs/job-seasonal-nice/save",
      "FR",
      true,
    );
    const replayJobSave = await setFavorite(
      "/employment/jobs/job-seasonal-nice/save",
      "FR",
      true,
    );
    expect(firstJobSave.status).toBe(200);
    expect(await replayJobSave.json()).toEqual({ isFavorite: true });

    const [frJobs, beJobs, rejectedBeJob, removedMissingJob] =
      await Promise.all([
        fetch(`${baseUrl}/api/v1/employment/favorites`, {
          headers: marketAuth("FR"),
        }),
        fetch(`${baseUrl}/api/v1/employment/favorites`, {
          headers: marketAuth("BE"),
        }),
        setFavorite("/employment/jobs/job-seasonal-nice/save", "BE", true),
        setFavorite("/employment/jobs/missing-job/save", "BE", false),
      ]);
    expect((await frJobs.json()).jobIds).toContain("job-seasonal-nice");
    expect(await beJobs.json()).toEqual({ jobIds: [] });
    expect(rejectedBeJob.status).toBe(404);
    expect(await removedMissingJob.json()).toEqual({ isFavorite: false });
  });

  it("projects delivery favorites through the unified favorite collection", async () => {
    const headers = {
      ...auth(buyerToken),
      "X-Shongre-Market": "FR",
    };
    const requestResponse = await fetch(`${baseUrl}/api/v1/delivery/requests`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        marketCode: "FR",
        origin: "standalone",
        title: "Livrer une bibliothèque démontée",
        description:
          "Transport local de plusieurs panneaux emballés avec précaution.",
        pickup: {
          street: "12 rue des Lilas",
          city: "Paris",
          postalCode: "75011",
          contactName: "Thomas",
          contactPhone: "+33600000000",
        },
        dropoff: {
          street: "8 rue Victor-Hugo",
          city: "Boulogne-Billancourt",
          postalCode: "92100",
          contactName: "Thomas",
          contactPhone: "+33600000000",
        },
        pickupWindow: {
          startsAt: "2027-02-15T09:00:00.000Z",
          endsAt: "2027-02-15T11:00:00.000Z",
        },
        deliveryWindow: {
          startsAt: "2027-02-15T12:00:00.000Z",
          endsAt: "2027-02-15T16:00:00.000Z",
        },
        package: {
          type: "Meuble démonté",
          count: 4,
          approximateWeightGrams: 42_000,
          handlingRequirements: ["Fragile"],
          requiredVehicleType: "van",
          loadingAssistanceRequired: true,
        },
        budget: { amountMinor: 6_500, currency: "EUR" },
        expiresAt: "2027-02-14T20:00:00.000Z",
        idempotencyKey: "integration-delivery-favorite-card-v1",
      }),
    });
    expect(requestResponse.status).toBe(201);
    const request = await requestResponse.json();
    const publishResponse = await fetch(
      `${baseUrl}/api/v1/delivery/requests/${request.id}/publish`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ marketCode: "FR" }),
      },
    );
    expect(publishResponse.status).toBe(200);

    const favoriteResponse = await fetch(
      `${baseUrl}/api/v1/delivery/requests/${request.id}/favorite`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ isFavorite: true }),
      },
    );
    expect(await favoriteResponse.json()).toEqual({ isFavorite: true });

    const collectionResponse = await fetch(`${baseUrl}/api/v1/favorites`, {
      headers,
    });
    expect(collectionResponse.status).toBe(200);
    const collection = await collectionResponse.json();
    const projectionId = `delivery_${request.id}`;
    expect(collection.listingIds).toContain(projectionId);
    expect(
      collection.listings.find((listing: any) => listing.id === projectionId),
    ).toMatchObject({
      marketCode: "FR",
      title: "Livrer une bibliothèque démontée",
      attributes: {
        verticalType: "delivery",
        verticalEntityId: request.id,
        price_type: "fixed",
      },
    });
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
    const unknownBody = await unknown.json();
    const wrongPasswordBody = await wrongPassword.json();
    expect({ ...unknownBody, requestId: undefined }).toEqual({
      ...wrongPasswordBody,
      requestId: undefined,
    });
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
      ["/api/v1/admin/users/user_thomas/capabilities", {}],
      ["/api/v1/admin/audit-logs", {}],
      ["/api/v1/favorites", {}],
      ["/api/v1/compliance/status", {}],
      ["/api/v1/verification/status/user_thomas", {}],
      ["/api/v1/orders/purchases", {}],
      ["/api/v1/messaging/conversations", {}],
      ["/api/v1/notifications", {}],
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
      "/api/v1/admin/users/user_thomas/capabilities",
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

  it("allows only capability administrators to inspect user overrides", async () => {
    const [adminResponse, moderatorResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/admin/users/user_thomas/capabilities`, {
        headers: auth(adminToken),
      }),
      fetch(`${baseUrl}/api/v1/admin/users/user_thomas/capabilities`, {
        headers: auth(moderatorToken),
      }),
    ]);

    expect(adminResponse.status).toBe(200);
    expect(await adminResponse.json()).toMatchObject({
      userId: "user_thomas",
      accountType: "individual",
      version: 1,
    });
    expect(moderatorResponse.status).toBe(403);
  });

  it("does not let administrative configuration imply moderation or finance", async () => {
    const reports = await fetch(`${baseUrl}/api/v1/admin/reports`, {
      headers: auth(adminToken),
    });
    expect(reports.status).toBe(403);

    const refund = await fetch(
      `${baseUrl}/api/v1/real-estate/checkouts/checkout-missing/refunds`,
      {
        method: "POST",
        headers: auth(adminToken),
        body: JSON.stringify({ reason: "Test de séparation des privilèges" }),
      },
    );
    expect(refund.status).toBe(403);
  });

  it("keeps moderator and Trust & Safety actions distinct", async () => {
    const reports = await fetch(`${baseUrl}/api/v1/admin/reports`, {
      headers: auth(moderatorToken),
    });
    expect(reports.status).toBe(200);

    const moderatorBan = await fetch(
      `${baseUrl}/api/v1/admin/reports/report-missing/resolve`,
      {
        method: "POST",
        headers: auth(moderatorToken),
        body: JSON.stringify({
          action: "ban_user",
          reason: "Test de séparation des privilèges",
        }),
      },
    );
    expect(moderatorBan.status).toBe(403);

    const trustRemoval = await fetch(
      `${baseUrl}/api/v1/admin/reports/report-missing/resolve`,
      {
        method: "POST",
        headers: auth(trustToken),
        body: JSON.stringify({
          action: "remove_listing",
          reason: "Test de séparation des privilèges",
        }),
      },
    );
    expect(trustRemoval.status).toBe(403);

    const trustStatus = await fetch(
      `${baseUrl}/api/v1/admin/users/user_trust_safety/status`,
      {
        method: "PUT",
        headers: auth(trustToken),
        body: JSON.stringify({
          status: "suspended",
          reason: "Contrôle de portée sans mutation de compte",
        }),
      },
    );
    expect(trustStatus.status).toBe(400);
  });

  it("allows finance audit/refund capabilities without platform configuration", async () => {
    const audit = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
      headers: auth(financeToken),
    });
    expect(audit.status).toBe(200);

    const stats = await fetch(`${baseUrl}/api/v1/admin/stats`, {
      headers: auth(financeToken),
    });
    expect(stats.status).toBe(403);

    const refund = await fetch(
      `${baseUrl}/api/v1/real-estate/checkouts/checkout-missing/refunds`,
      {
        method: "POST",
        headers: auth(financeToken),
        body: JSON.stringify({ reason: "Test de portée finance uniquement" }),
      },
    );
    expect(refund.status).not.toBe(403);
  });

  it("enforces account, organization, platform and reconciliation finance scopes", async () => {
    const ownAccount = await fetch(
      `${baseUrl}/api/v1/finance/account/overview`,
      {
        headers: { ...auth(buyerToken), "X-Shongre-Market": "FR" },
      },
    );
    expect(ownAccount.status).toBe(200);
    expect((await ownAccount.json()).accountKind).toBe("individual");

    const buyerPlatform = await fetch(
      `${baseUrl}/api/v1/finance/platform/overview?period=30d&marketCode=ALL&currency=EUR`,
      {
        headers: {
          ...auth(buyerToken),
          "X-Shongre-Market": "FR",
        },
      },
    );
    expect(buyerPlatform.status).toBe(403);

    const buyerOrganization = await fetch(
      `${baseUrl}/api/v1/finance/organization/overview`,
      {
        headers: auth(buyerToken),
      },
    );
    expect(buyerOrganization.status).toBe(403);

    const proOrganization = await fetch(
      `${baseUrl}/api/v1/finance/organization/overview`,
      {
        headers: { ...auth(proToken), "X-Shongre-Market": "FR" },
      },
    );
    expect(proOrganization.status).toBe(200);
    expect((await proOrganization.json()).accountKind).toBe("professional");

    const financePlatform = await fetch(
      `${baseUrl}/api/v1/finance/platform/overview?period=30d&marketCode=FR&currency=EUR`,
      {
        headers: auth(financeToken),
      },
    );
    expect(financePlatform.status).toBe(200);
    const overview = await financePlatform.json();
    expect(overview.metrics.platformRevenue.amount.amountMinor).not.toBe(
      overview.metrics.grossCollected.amount.amountMinor,
    );

    const financeReconciliation = await fetch(
      `${baseUrl}/api/v1/finance/platform/reconciliation`,
      {
        headers: auth(financeToken),
      },
    );
    expect(financeReconciliation.status).toBe(200);

    const adminPlatform = await fetch(
      `${baseUrl}/api/v1/finance/platform/overview?period=30d&marketCode=ALL&currency=EUR`,
      {
        headers: auth(adminToken),
      },
    );
    expect(adminPlatform.status).toBe(200);
    const adminReconciliation = await fetch(
      `${baseUrl}/api/v1/finance/platform/reconciliation`,
      {
        headers: auth(adminToken),
      },
    );
    expect(adminReconciliation.status).toBe(403);

    const moderatorPlatform = await fetch(
      `${baseUrl}/api/v1/finance/platform/overview`,
      {
        headers: auth(moderatorToken),
      },
    );
    expect(moderatorPlatform.status).toBe(403);
  });

  it("scopes the exact commission simulator and analytics to authorized staff", async () => {
    const payload = {
      eligibleCommercialEvent: true,
      earningEvent: "payment_succeeded",
      effectiveAt: "2026-08-24T12:00:00.000Z",
      marketCode: "FR",
      countryCode: "FR",
      currency: "EUR",
      transactionType: "marketplace_order",
      sellerType: "professional",
      campaignIds: [],
      itemSubtotalMinor: 10_000,
      discountMinor: 0,
      shippingMinor: 0,
      taxMinor: 0,
      buyerFeesMinor: 0,
      totalMinor: 10_000,
      platformCollectedMinor: 10_000,
      historicalVolumeMinor: 0,
    };
    const buyer = await fetch(`${baseUrl}/api/v1/admin/commissions/simulate`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify(payload),
    });
    expect(buyer.status).toBe(403);

    const finance = await fetch(
      `${baseUrl}/api/v1/admin/commissions/simulate`,
      {
        method: "POST",
        headers: auth(financeToken),
        body: JSON.stringify(payload),
      },
    );
    expect(finance.status).toBe(200);
    expect(await finance.json()).toMatchObject({
      totalCommissionMinor: 300,
      sellerPayableMinor: 9_700,
      appliedPolicyId: "commission-policy-marketplace-pro-fr",
    });

    const moderator = await fetch(
      `${baseUrl}/api/v1/admin/commissions/simulate`,
      {
        method: "POST",
        headers: auth(moderatorToken),
        body: JSON.stringify(payload),
      },
    );
    expect(moderator.status).toBe(403);

    const analytics = await fetch(
      `${baseUrl}/api/v1/admin/commissions/analytics?marketCode=FR&currency=EUR&from=2026-08-01&to=2026-08-31`,
      { headers: auth(financeToken) },
    );
    expect(analytics.status).toBe(200);
    expect(Array.isArray(await analytics.json())).toBe(true);
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

  it("keeps removed owner-addressed routes unavailable", async () => {
    for (const path of [
      "/api/v1/notifications/user_camille",
      "/api/v1/orders/purchases/user_camille",
    ]) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: auth(buyerToken),
      });
      expect(res.status, path).toBe(404);
    }
  });

  it("derives notification and order ownership from the authenticated caller", async () => {
    const notifications = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: auth(buyerToken),
    });
    expect(notifications.status).toBe(200);

    const purchases = await fetch(`${baseUrl}/api/v1/orders/purchases`, {
      headers: auth(buyerToken),
    });
    expect(purchases.status).toBe(200);

    const notificationRows = await notifications.json();
    expect(
      notificationRows.every((row: any) => row.userId === "user_thomas"),
    ).toBe(true);
    const purchaseRows = await purchases.json();
    expect(
      purchaseRows.every((row: any) => row.buyerId === "user_thomas"),
    ).toBe(true);
  });

  it("keeps watch subscriptions authenticated, market-scoped, and owner-only", async () => {
    const anonymous = await fetch(`${baseUrl}/api/v1/watch-subscriptions`, {
      headers: { "X-Shongre-Market": "FR" },
    });
    expect(anonymous.status).toBe(401);

    const staff = await fetch(`${baseUrl}/api/v1/watch-subscriptions`, {
      headers: { ...auth(adminToken), "X-Shongre-Market": "FR" },
    });
    expect(staff.status).toBe(403);

    const createdResponse = await fetch(
      `${baseUrl}/api/v1/watch-subscriptions`,
      {
        method: "POST",
        headers: { ...auth(buyerToken), "X-Shongre-Market": "FR" },
        body: JSON.stringify({
          marketCode: "FR",
          targetType: "seller",
          targetId: "user_camille",
          title: "Camille",
          frequency: "daily",
          channels: { inApp: true, email: false, push: true },
        }),
      },
    );
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();

    const ownerList = await fetch(`${baseUrl}/api/v1/watch-subscriptions`, {
      headers: { ...auth(buyerToken), "X-Shongre-Market": "FR" },
    });
    expect(ownerList.status).toBe(200);
    expect((await ownerList.json()).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          marketCode: "FR",
          targetId: "user_camille",
        }),
      ]),
    );

    const wrongOwner = await fetch(
      `${baseUrl}/api/v1/watch-subscriptions/${encodeURIComponent(created.id)}`,
      {
        method: "DELETE",
        headers: { ...auth(proToken), "X-Shongre-Market": "FR" },
      },
    );
    expect(wrongOwner.status).toBe(404);

    const mismatchedMarket = await fetch(
      `${baseUrl}/api/v1/watch-subscriptions`,
      {
        method: "POST",
        headers: { ...auth(buyerToken), "X-Shongre-Market": "FR" },
        body: JSON.stringify({
          marketCode: "BE",
          targetType: "seller",
          targetId: "user_camille",
          title: "Camille",
          frequency: "daily",
          channels: { inApp: true, email: false, push: false },
        }),
      },
    );
    expect(mismatchedMarket.status).toBe(409);

    const removed = await fetch(
      `${baseUrl}/api/v1/watch-subscriptions/${encodeURIComponent(created.id)}`,
      {
        method: "DELETE",
        headers: { ...auth(buyerToken), "X-Shongre-Market": "FR" },
      },
    );
    expect(removed.status).toBe(200);
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
        isIdentityVerified: false,
      }),
    });
    expect(res.status).toBe(400);
    const rejected = await res.json();
    expect(rejected.error?.code).toBe("VALIDATION_ERROR");

    const allowed = await fetch(`${baseUrl}/api/v1/users/user_thomas`, {
      method: "PUT",
      headers: auth(buyerToken),
      body: JSON.stringify({ name: "Thomas Renamed" }),
    });
    expect(allowed.status).toBe(200);
    const updated = await allowed.json();
    expect(updated.name).toBe("Thomas Renamed");
    expect(updated.primaryRole).not.toBe("super_admin");
    expect(updated.isIdentityVerified).toBe(true);
  });

  it("rejects seller attempts to change listing lifecycle and promotion state", async () => {
    const sellerToken = await login("camille.martin@example.fr");
    const res = await fetch(`${baseUrl}/api/v1/listings/list_1`, {
      method: "PUT",
      headers: auth(sellerToken),
      body: JSON.stringify({
        status: "published",
        isFeatured: true,
        promotionState: "active",
        viewCount: 50_000,
      }),
    });
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error?.details?.rejectedFields).toEqual([
      "isFeatured",
      "promotionState",
      "status",
      "viewCount",
    ]);
  });

  it("supports authenticated conversation creation and message history", async () => {
    const conversationResponse = await fetch(
      `${baseUrl}/api/v1/messaging/conversations`,
      {
        method: "POST",
        headers: {
          ...auth(buyerToken),
          "X-Shongre-Market": "FR",
        },
        body: JSON.stringify({
          listingId: "list_1",
          sellerId: "user_admin",
          initialMessage: "Bonjour depuis le parcours HTTP.",
        }),
      },
    );
    expect(conversationResponse.status).toBe(200);
    const conversation = await conversationResponse.json();
    expect(conversation.buyerId).toBe("user_thomas");
    expect(conversation.sellerId).toBe("user_camille");

    const messagesResponse = await fetch(
      `${baseUrl}/api/v1/messaging/conversations/${conversation.id}/messages?limit=1`,
      { headers: auth(buyerToken) },
    );
    expect(messagesResponse.status).toBe(200);
    const messages = await messagesResponse.json();
    expect(messages.items).toHaveLength(1);
    expect(messages.items[0].text).toContain("parcours HTTP");

    const presenceUpdate = await fetch(`${baseUrl}/api/v1/messaging/presence`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({
        clientId: "11111111-1111-4111-8111-111111111111",
        sequence: 1,
        activity: "active",
      }),
    });
    expect(presenceUpdate.status).toBe(200);
    expect(await presenceUpdate.json()).toEqual({ updated: true });

    const sellerToken = await login("camille.martin@example.fr");
    const presenceResponse = await fetch(
      `${baseUrl}/api/v1/messaging/presence?conversationIds=${conversation.id}`,
      { headers: auth(sellerToken) },
    );
    expect(presenceResponse.status).toBe(200);
    expect(await presenceResponse.json()).toMatchObject({
      items: [
        {
          conversationId: conversation.id,
          presence: { status: "online" },
        },
      ],
    });

    const presenceDenied = await fetch(
      `${baseUrl}/api/v1/messaging/presence?conversationIds=${conversation.id}`,
      { headers: auth(proToken) },
    );
    expect(presenceDenied.status).toBe(404);

    const deniedResponse = await fetch(
      `${baseUrl}/api/v1/messaging/conversations/${conversation.id}/messages`,
      { headers: auth(proToken) },
    );
    expect(deniedResponse.status).toBe(403);
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

  it("evaluates ordinary private publication without demanding identity", async () => {
    const res = await fetch(`${baseUrl}/api/v1/compliance/requirements`, {
      method: "POST",
      headers: auth(buyerToken),
      body: JSON.stringify({
        requestedAction: "publish_listing",
        jurisdiction: "FR",
        marketCode: "FR",
      }),
    });
    expect(res.status).toBe(200);
    const decision = await res.json();
    expect(decision.required).toContain("email");
    expect(decision.required).toContain("professional_status");
    expect(decision.required).not.toContain("identity");
  });

  it("does not trust a client-supplied risk classification", async () => {
    const evaluate = (level: "NORMAL" | "CRITICAL") =>
      fetch(`${baseUrl}/api/v1/compliance/requirements`, {
        method: "POST",
        headers: auth(buyerToken),
        body: JSON.stringify({
          requestedAction: "message_seller",
          jurisdiction: "FR",
          marketCode: "FR",
          riskContext: {
            level,
            reasonCodes: ["CLIENT_CONTROLLED"],
            humanReviewAvailable: false,
          },
        }),
      }).then((response) => response.json());

    const [normal, forgedCritical] = await Promise.all([
      evaluate("NORMAL"),
      evaluate("CRITICAL"),
    ]);
    expect(forgedCritical.required).toEqual(normal.required);
    expect(forgedCritical.reasonCodes).toEqual(normal.reasonCodes);
    expect(forgedCritical.reasonCodes).not.toContain("CLIENT_CONTROLLED");
  });

  it("keeps compliance policy administration behind dedicated RBAC", async () => {
    const denied = await fetch(`${baseUrl}/api/v1/admin/compliance/rules`, {
      headers: auth(buyerToken),
    });
    expect(denied.status).toBe(403);

    const allowed = await fetch(`${baseUrl}/api/v1/admin/compliance/rules`, {
      headers: auth(complianceToken),
    });
    expect(allowed.status).toBe(200);
    const rules = await allowed.json();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.some((rule: any) => rule.action === "publish_listing")).toBe(
      true,
    );

    const deniedRetention = await fetch(
      `${baseUrl}/api/v1/admin/compliance/retention/run`,
      { method: "POST", headers: auth(buyerToken) },
    );
    expect(deniedRetention.status).toBe(403);
    const allowedRetention = await fetch(
      `${baseUrl}/api/v1/admin/compliance/retention/run`,
      { method: "POST", headers: auth(complianceToken) },
    );
    expect(allowedRetention.status).toBe(200);
    expect(await allowedRetention.json()).toMatchObject({
      providerEventsDeleted: 0,
    });
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

    const refused = await fetch(
      `${baseUrl}/api/v1/messaging/conversations/conv_1/messages`,
      {
        method: "POST",
        headers: auth(sellerToken),
        body: JSON.stringify({
          text: "Ce message doit être refusé.",
        }),
      },
    );
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

  it("enforces review authentication, participant ownership, Staff separation and strict input over HTTP", async () => {
    const source = await repositories.orders.findById("ord_sample_1");
    expect(source).not.toBeNull();
    const orderId = "api-review-order";
    await repositories.orders.create({
      ...source!,
      id: orderId,
      status: "completed",
    });
    const endpoint = `${baseUrl}/api/v1/orders/${orderId}/review`;
    expect((await fetch(endpoint)).status).toBe(401);
    expect((await fetch(endpoint, { headers: auth(proToken) })).status).toBe(
      404,
    );
    expect((await fetch(endpoint, { headers: auth(adminToken) })).status).toBe(
      403,
    );
    const eligibility = await fetch(endpoint, { headers: auth(buyerToken) });
    expect(eligibility.status).toBe(200);
    expect(await eligibility.json()).toMatchObject({ eligible: true });

    const input = {
      transactionId: orderId,
      rating: 4,
      comment: "Conforme à la description, merci.",
    };
    const submit = (token: string, body: unknown) =>
      fetch(`${baseUrl}/api/v1/reviews/submit`, {
        method: "POST",
        headers: auth(token),
        body: JSON.stringify(body),
      });
    expect((await submit(adminToken, input)).status).toBe(403);
    expect((await submit(proToken, input)).status).toBe(404);
    expect(
      (await submit(buyerToken, { ...input, targetUserId: "outsider" })).status,
    ).toBe(400);
    const accepted = await submit(buyerToken, input);
    expect(accepted.status).toBe(200);
    const review = await accepted.json();
    expect(review).toMatchObject({
      authorId: source!.buyerId,
      targetUserId: source!.sellerId,
      verifiedTransaction: true,
      reviewerRole: "buyer",
    });
    expect(review).not.toHaveProperty("orderId");
    expect((await submit(buyerToken, input)).status).toBe(409);
    const publicReviews = await fetch(
      `${baseUrl}/api/v1/reviews/user/${source!.sellerId}`,
    );
    expect(publicReviews.status).toBe(200);
    expect(await publicReviews.json()).toContainEqual(review);
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
