import { describe, expect, it } from "vitest";
import {
  hasOrganizationProductAccess,
  isStandaloneProductPortfolio,
  type OrganizationProductAccess,
  type ShongreProductId,
} from "./product-access";

const access = (
  productId: ShongreProductId,
  status: OrganizationProductAccess["status"] = "active",
): OrganizationProductAccess => ({
  organizationId: "organization-demo",
  productId,
  entitlementKey:
    productId === "facturation"
      ? "invoicing.enabled"
      : productId === "prospects"
        ? "prospecting.enabled"
        : "marketplace.enabled",
  status,
  accessMode: productId === "marketplace" ? "BUNDLED" : "ADD_ON",
  planName: `Shongre ${productId}`,
  source: "subscription",
  cancelAtPeriodEnd: false,
  seats: 1,
  capabilities: [],
});

describe("organization product portfolios", () => {
  it.each([
    ["Facturation-only", ["facturation"], true, false, true],
    [
      "existing Shongre plus Facturation",
      ["marketplace", "facturation"],
      true,
      false,
      false,
    ],
    ["Prospects-only", ["prospects"], false, true, false],
    [
      "Facturation plus Prospects",
      ["facturation", "prospects"],
      true,
      true,
      false,
    ],
    [
      "full Shongre",
      ["marketplace", "prospects", "facturation"],
      true,
      true,
      false,
    ],
    ["without Facturation", ["marketplace", "prospects"], false, true, false],
  ] as const)(
    "resolves the %s configuration",
    (_label, productIds, facturation, prospects, facturationOnly) => {
      const portfolio = {
        organizationId: "organization-demo",
        products: productIds.map((productId) =>
          access(productId as ShongreProductId),
        ),
      };

      expect(hasOrganizationProductAccess(portfolio, "facturation")).toBe(
        facturation,
      );
      expect(hasOrganizationProductAccess(portfolio, "prospects")).toBe(
        prospects,
      );
      expect(isStandaloneProductPortfolio(portfolio, "facturation")).toBe(
        facturationOnly,
      );
    },
  );

  it("fails closed when a Facturation subscription is no longer active", () => {
    const portfolio = {
      organizationId: "organization-demo",
      products: [access("facturation", "expired")],
    };

    expect(hasOrganizationProductAccess(portfolio, "facturation")).toBe(false);
  });
});
