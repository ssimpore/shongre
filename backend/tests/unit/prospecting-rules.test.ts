import { describe, expect, it } from "vitest";
import type {
  LeadSourceDefinition,
  ProspectDiscoveryFilters,
} from "@shongre/contracts/prospecting";
import {
  assertSourceEligible,
  calculateExplainableProspectScore,
  normalizeProspectDomain,
  outreachEligibility,
  sourceFingerprint,
  spreadsheetSafeCell,
} from "../../src/modules/crm/prospecting/prospecting.rules.js";

const source: LeadSourceDefinition = {
  id: "approved_source",
  providerId: "official_provider",
  name: "Source approuvée",
  category: "OFFICIAL_REGISTRY",
  description: "Source de test contractuellement approuvée.",
  supportedMarketCodes: ["FR", "BE"],
  operations: ["SEARCH", "ENRICHMENT", "DELETE"],
  restrictions: {
    permittedContexts: ["SUBSCRIBER"],
    permittedUses: ["Prospection professionnelle"],
    prohibitedUses: [],
    mayStoreProfessionalContacts: false,
    requiresAttribution: true,
    retentionDays: 90,
    deletionMode: "DELETE",
    requiresLegalApproval: false,
    requiresCommercialApproval: false,
  },
  lifecycle: "ACTIVE",
  healthMessage: "Disponible",
  dataFreshnessLabel: "30 jours",
};

const filters: ProspectDiscoveryFilters = {
  marketCode: "FR",
  countryCode: "FR",
  locale: "fr-FR",
  currency: "EUR",
  timezone: "Europe/Paris",
  industries: ["Automobile"],
  taxonomySlugs: [],
  companyTypes: [],
  sourceIds: [source.id],
  freshness: [],
  limit: 25,
};

describe("prospecting rules", () => {
  it("normalizes domains and produces stable market-scoped fingerprints", () => {
    expect(normalizeProspectDomain("https://WWW.Example.com/path")).toBe(
      "example.com",
    );
    expect(
      normalizeProspectDomain("not a valid domain / value"),
    ).toBeUndefined();
    expect(
      sourceFingerprint({
        marketCode: "fr",
        sourceId: source.id,
        sourceRecordId: "record-1",
        domain: "www.example.com",
        name: "Exemple",
      }),
    ).toBe(
      sourceFingerprint({
        marketCode: "FR",
        sourceId: source.id,
        sourceRecordId: "record-1",
        domain: "https://example.com/",
        name: "EXEMPLE",
      }),
    );
  });

  it("fails closed for unavailable markets, operations and approvals", () => {
    expect(
      assertSourceEligible({
        source,
        context: "SUBSCRIBER",
        marketCode: "FR",
        operation: "SEARCH",
        internalFirstPartyPermission: false,
      }),
    ).toEqual({ allowed: true });
    expect(
      assertSourceEligible({
        source,
        context: "SUBSCRIBER",
        marketCode: "SN",
        operation: "SEARCH",
        internalFirstPartyPermission: false,
      }),
    ).toEqual({ allowed: false, reason: "SOURCE_MARKET_UNAVAILABLE" });
    expect(
      assertSourceEligible({
        source: {
          ...source,
          restrictions: {
            ...source.restrictions,
            requiresLegalApproval: true,
          },
        },
        context: "SUBSCRIBER",
        marketCode: "FR",
        operation: "SEARCH",
        internalFirstPartyPermission: false,
      }),
    ).toEqual({ allowed: false, reason: "SOURCE_APPROVAL_REQUIRED" });
  });

  it("calculates an evidence-linked, deterministic and explainable score", () => {
    const candidate = {
      company: {
        id: "b0000000-0000-4000-8000-000000000001",
        canonicalName: "Atelier Exemple",
        officialIdentifier: {
          marketCode: "FR",
          scheme: "TEST",
          value: "TEST-1",
        },
        domain: "atelier.example",
        website: "https://atelier.example",
        industry: "Automobile",
        estimatedSize: "10–49",
        marketCodes: ["FR"],
        countryCode: "FR",
        sourceIds: [source.id],
        discoveredAt: "2026-08-15T10:00:00.000Z",
        refreshedAt: "2026-08-15T10:00:00.000Z",
        reviewState: "UNREVIEWED" as const,
      },
      evidence: [
        {
          id: "e0000000-0000-4000-8000-000000000001",
          sourceId: source.id,
          sourceCategory: source.category,
          title: "Registre professionnel",
          observedAt: "2026-08-15T10:00:00.000Z",
          freshness: "CURRENT" as const,
          attributionRequired: true,
          confidence: 0.9,
        },
      ],
      status: "DISCOVERED" as const,
      humanReviewRequired: true as const,
    };
    const score = calculateExplainableProspectScore({
      filters,
      candidate,
      evaluatedAt: "2026-08-15T10:00:00.000Z",
    });
    expect(score.totalScore).toBe(79);
    expect(score.dataConfidence).toBe(90);
    expect(
      score.positiveFactors.every((factor) => factor.evidenceIds.length),
    ).toBe(true);
    expect(score.ruleVersion).toBe("prospecting-rules-v1");
  });

  it("blocks outreach when compliance or quota checks fail", () => {
    expect(
      outreachEligibility({
        professionalPurpose: true,
        tenantAuthorized: true,
        sourceEligible: true,
        entitled: true,
        quotaRemaining: 0,
        suppressed: true,
        objected: false,
        marketPolicyAllows: true,
        sendingIdentityVerified: true,
        frequencyCapReached: false,
        unsubscribeMechanismPresent: true,
      }),
    ).toEqual({
      eligible: false,
      reasons: ["QUOTA_EXHAUSTED", "SUPPRESSED"],
    });
  });

  it("neutralizes spreadsheet formulas while preserving ordinary text", () => {
    for (const value of ["=1+1", "+SUM(A1:A2)", "-2+3", "@cmd", "\tformula"])
      expect(spreadsheetSafeCell(value)).toBe(`'${value}`);
    expect(spreadsheetSafeCell(" Atelier Exemple")).toBe(" Atelier Exemple");
  });
});
