import { describe, expect, it } from "vitest";
import {
  cacheInvalidationTags,
  publicCacheTags,
  resolvePublicResponseCachePolicy,
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
    ).toBeNull();
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

  it("keeps taxonomy out of shared caches while a reader's own cache may revalidate it", () => {
    const anonymous = (operationId: string) => ({
      method: "GET" as const,
      operationId,
      accessKind: "public" as const,
      hasCredentials: false,
    });
    for (const operationId of [
      "getTaxonomyRoot",
      "getTaxonomyNodesById",
      "getTaxonomySearchFilters",
      "getTaxonomyHeaderNavigation",
      "getTaxonomyV1Tree",
      "getTaxonomyV1Options",
      "resolveTaxonomyV1PublicationSchema",
    ]) {
      expect(resolvePublicResponseProfile(anonymous(operationId))).toBeNull();
      expect(resolvePublicResponseCachePolicy(anonymous(operationId))).toEqual({
        kind: "revalidate",
      });
      expect(
        resolvePublicResponseCachePolicy({
          ...anonymous(operationId),
          hasCredentials: true,
        }),
      ).toBeNull();
    }
    expect(resolvePublicResponseCachePolicy(anonymous("getMarkets"))).toEqual({
      kind: "shared",
      profile: "reference",
    });
    for (const operationId of [
      "getListings",
      "getHomepage",
      "getAdminTaxonomyDraft",
      "getFeatureFlagsByKey",
    ]) {
      expect(
        resolvePublicResponseCachePolicy(anonymous(operationId)),
      ).toBeNull();
    }
    expect(
      resolvePublicResponseCachePolicy({
        ...anonymous("getTaxonomyV1Tree"),
        method: "POST",
      }),
    ).toBeNull();
  });

  it("keeps course classifications fresh and invalidates their projection on taxonomy writes", () => {
    expect(
      resolvePublicResponseProfile({
        method: "GET",
        operationId: "getEducationCatalog",
        accessKind: "public",
        hasCredentials: false,
      }),
    ).toBeNull();
    expect(
      cacheInvalidationTags({
        method: "POST",
        operationId: "publishAdminTaxonomyRevision",
        marketCode: "FR",
        params: {},
      }),
    ).toContain("shongre-v1-education");
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
