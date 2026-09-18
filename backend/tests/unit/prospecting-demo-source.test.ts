import { describe, expect, it } from "vitest";
import type {
  LeadSourceSearchContext,
  ProspectDiscoveryFilters,
} from "@shongre/contracts/prospecting";
import {
  DemoAuthorizedLeadSourceAdapter,
  matchesQuery,
} from "../../src/modules/crm/prospecting/demo-lead-source.adapter.js";

const context = {
  accountId: "account_test",
  operatingContext: "SUBSCRIBER",
} as unknown as LeadSourceSearchContext;

const filters = (query?: string): ProspectDiscoveryFilters => ({
  query,
  marketCode: "FR",
  countryCode: "FR",
  locale: "fr-FR",
  currency: "EUR",
  timezone: "Europe/Paris",
  industries: [],
  taxonomySlugs: [],
  companyTypes: [],
  sourceIds: ["demo_authorized_registry"],
  freshness: [],
  limit: 25,
});

describe("demo authorized registry search", () => {
  it("reads a discovery brief as prose rather than a registry key", () => {
    const record =
      "Atelier Horizon Mobilité Atelier automobile multimarque Automobile Montreuil Île-de-France";
    expect(matchesQuery("ateliers automobiles", record)).toBe(true);
    expect(matchesQuery("Atelier ile-de-france", record)).toBe(true);
    expect(matchesQuery("mobilité", record)).toBe(true);
    expect(matchesQuery("mobilier reconditionné", record)).toBe(false);
    expect(matchesQuery("", record)).toBe(true);
    expect(matchesQuery(undefined, record)).toBe(true);
  });

  it("finds the automotive workshop from the brief the product suggests", async () => {
    const adapter = new DemoAuthorizedLeadSourceAdapter();
    const workshops = await adapter.search(
      context,
      filters("ateliers automobiles"),
    );
    expect(
      workshops.map((candidate) => candidate.company.canonicalName),
    ).toEqual(["Atelier Horizon Mobilité"]);

    const furniture = await adapter.search(context, filters("mobilier"));
    expect(
      furniture.map((candidate) => candidate.company.canonicalName),
    ).toEqual(["Maison Seconde Vie"]);

    const everything = await adapter.search(context, filters());
    expect(everything.length).toBeGreaterThanOrEqual(2);
  });
});
