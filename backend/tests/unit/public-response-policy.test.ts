import { describe, expect, it } from "vitest";
import {
  cacheInvalidationTags,
  publicCacheTags,
  resolvePublicResponseProfile,
} from "../../src/infrastructure/http/public-response-policy.js";

describe("public response policy", () => {
  it("caches only explicitly registered anonymous public GET projections", () => {
    expect(
      resolvePublicResponseProfile({
        method: "GET",
        operationId: "getListings",
        accessKind: "public",
        hasCredentials: false,
      }),
    ).toBe("discovery");
    expect(
      resolvePublicResponseProfile({
        method: "GET",
        operationId: "getListings",
        accessKind: "public",
        hasCredentials: true,
      }),
    ).toBeNull();
    expect(
      resolvePublicResponseProfile({
        method: "GET",
        operationId: "getAdminAuditLogs",
        accessKind: "permission",
        hasCredentials: false,
      }),
    ).toBeNull();
    expect(
      resolvePublicResponseProfile({
        method: "GET",
        operationId: "getFeatureFlagsByKey",
        accessKind: "public",
        hasCredentials: false,
      }),
    ).toBeNull();
  });

  it("creates versioned market/resource tags without user data", () => {
    const tags = publicCacheTags({
      operationId: "getListingsById",
      marketCode: "FR",
      params: { id: "list-107" },
    });
    expect(tags).toContain("shongre-v1-discovery");
    expect(tags).toContain("shongre-v1-market-fr");
    expect(tags).toContain("shongre-v1-discovery-id-list-107");
    expect(tags.join(" ")).not.toMatch(/user|cookie|authorization/i);
  });

  it("emits invalidation tags only for writes in a cacheable domain", () => {
    expect(
      cacheInvalidationTags({
        method: "PUT",
        operationId: "putListingsById",
        marketCode: "BE",
        params: { id: "listing-1" },
      }),
    ).toContain("shongre-v1-discovery");
    expect(
      cacheInvalidationTags({
        method: "GET",
        operationId: "getListings",
        marketCode: "FR",
        params: {},
      }),
    ).toEqual([]);
    expect(
      cacheInvalidationTags({
        method: "POST",
        operationId: "postListingsSearch",
        marketCode: "FR",
        params: {},
      }),
    ).toEqual([]);
  });
});
