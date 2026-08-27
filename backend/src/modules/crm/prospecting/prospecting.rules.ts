import { createHash } from "node:crypto";
import type {
  LeadSourceDefinition,
  ProspectCandidate,
  ProspectDiscoveryFilters,
  ProspectEvidence,
  ProspectScore,
  ProspectingContext,
} from "@shongre/contracts/prospecting";

export function normalizeProspectDomain(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const normalized = url.hostname.toLowerCase().replace(/^www\./, "");
    return normalized || undefined;
  } catch {
    return undefined;
  }
}

export function sourceFingerprint(input: {
  marketCode: string;
  sourceId: string;
  sourceRecordId: string;
  officialIdentifier?: string;
  domain?: string;
  name: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        marketCode: input.marketCode.toUpperCase(),
        sourceId: input.sourceId,
        sourceRecordId: input.sourceRecordId,
        officialIdentifier: input.officialIdentifier?.trim().toUpperCase(),
        domain: normalizeProspectDomain(input.domain),
        name: input.name.trim().toLocaleLowerCase("en-US"),
      }),
    )
    .digest("hex");
}

export function assertSourceEligible(input: {
  source: LeadSourceDefinition;
  context: ProspectingContext;
  marketCode: string;
  operation: "SEARCH" | "ENRICHMENT" | "IMPORT" | "REFRESH" | "DELETE";
  internalFirstPartyPermission: boolean;
}): { allowed: true } | { allowed: false; reason: string } {
  const { source } = input;
  if (source.lifecycle !== "ACTIVE") {
    return { allowed: false, reason: "SOURCE_NOT_ACTIVE" };
  }
  if (!source.supportedMarketCodes.includes(input.marketCode)) {
    return { allowed: false, reason: "SOURCE_MARKET_UNAVAILABLE" };
  }
  if (!source.operations.includes(input.operation)) {
    return { allowed: false, reason: "SOURCE_OPERATION_UNAVAILABLE" };
  }
  if (!source.restrictions.permittedContexts.includes(input.context)) {
    return { allowed: false, reason: "SOURCE_CONTEXT_FORBIDDEN" };
  }
  if (
    source.category === "FIRST_PARTY_AUTHORIZED" &&
    !input.internalFirstPartyPermission
  ) {
    return { allowed: false, reason: "INTERNAL_PERMISSION_REQUIRED" };
  }
  if (
    source.restrictions.requiresLegalApproval ||
    source.restrictions.requiresCommercialApproval
  ) {
    return { allowed: false, reason: "SOURCE_APPROVAL_REQUIRED" };
  }
  return { allowed: true };
}

function boundedScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateExplainableProspectScore(input: {
  filters: ProspectDiscoveryFilters;
  candidate: Omit<ProspectCandidate, "score">;
  evaluatedAt: string;
}): ProspectScore {
  const { company, evidence } = input.candidate;
  const positiveFactors: ProspectScore["positiveFactors"] = [];
  const negativeFactors: ProspectScore["negativeFactors"] = [];
  const missingInformation: string[] = [];
  let fit = 35;
  let opportunity = 30;

  if (
    company.industry &&
    input.filters.industries.some(
      (industry) =>
        company.industry?.toLocaleLowerCase("en-US") ===
        industry.toLocaleLowerCase("en-US"),
    )
  ) {
    fit += 25;
    positiveFactors.push({
      code: "INDUSTRY_MATCH",
      label: "Secteur correspondant au profil cible",
      impact: 25,
      evidenceIds: evidence.map((item) => item.id),
    });
  }
  if (company.marketCodes.includes(input.filters.marketCode)) {
    fit += 20;
    positiveFactors.push({
      code: "MARKET_MATCH",
      label: "Entreprise active sur le marché sélectionné",
      impact: 20,
      evidenceIds: evidence.map((item) => item.id),
    });
  }
  if (company.website && company.domain) {
    opportunity += 15;
    positiveFactors.push({
      code: "OFFICIAL_WEBSITE",
      label: "Site professionnel identifié",
      impact: 15,
      evidenceIds: evidence.map((item) => item.id),
    });
  } else {
    missingInformation.push("Site professionnel");
  }
  if (company.officialIdentifier) {
    fit += 15;
    positiveFactors.push({
      code: "OFFICIAL_IDENTIFIER",
      label: "Identifiant d’entreprise officiel présent",
      impact: 15,
      evidenceIds: evidence.map((item) => item.id),
    });
  } else {
    missingInformation.push("Identifiant officiel");
  }
  const freshEvidence = evidence.filter((item) => item.freshness === "CURRENT");
  if (freshEvidence.length) {
    opportunity += Math.min(20, freshEvidence.length * 10);
    positiveFactors.push({
      code: "CURRENT_EVIDENCE",
      label: "Preuves professionnelles récentes",
      impact: Math.min(20, freshEvidence.length * 10),
      evidenceIds: freshEvidence.map((item) => item.id),
    });
  }
  const staleEvidence = evidence.filter((item) => item.freshness === "STALE");
  if (staleEvidence.length) {
    opportunity -= 15;
    negativeFactors.push({
      code: "STALE_EVIDENCE",
      label: "Certaines preuves doivent être actualisées",
      impact: -15,
      evidenceIds: staleEvidence.map((item) => item.id),
    });
  }
  if (!company.estimatedSize) missingInformation.push("Taille de l’entreprise");

  const fitScore = boundedScore(fit);
  const opportunityScore = boundedScore(opportunity);
  const dataConfidence = boundedScore(
    evidence.reduce((sum, item) => sum + item.confidence * 100, 0) /
      Math.max(1, evidence.length),
  );
  return {
    totalScore: boundedScore(fitScore * 0.6 + opportunityScore * 0.4),
    fitScore,
    opportunityScore,
    dataConfidence,
    positiveFactors,
    negativeFactors,
    missingInformation,
    evidenceIds: evidence.map((item) => item.id),
    ruleVersion: "prospecting-rules-v1",
    confidence: dataConfidence / 100,
    evaluatedAt: input.evaluatedAt,
    recommendedNextAction:
      dataConfidence >= 70
        ? "Valider les preuves puis ajouter l’entreprise à une liste ciblée."
        : "Compléter les informations manquantes avant tout contact.",
  };
}

export function outreachEligibility(input: {
  professionalPurpose: boolean;
  tenantAuthorized: boolean;
  sourceEligible: boolean;
  entitled: boolean;
  quotaRemaining: number;
  suppressed: boolean;
  objected: boolean;
  marketPolicyAllows: boolean;
  sendingIdentityVerified: boolean;
  frequencyCapReached: boolean;
  unsubscribeMechanismPresent: boolean;
}): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.professionalPurpose) reasons.push("PROFESSIONAL_PURPOSE_REQUIRED");
  if (!input.tenantAuthorized) reasons.push("TENANT_AUTHORIZATION_REQUIRED");
  if (!input.sourceEligible) reasons.push("SOURCE_NOT_ELIGIBLE");
  if (!input.entitled) reasons.push("ENTITLEMENT_REQUIRED");
  if (input.quotaRemaining <= 0) reasons.push("QUOTA_EXHAUSTED");
  if (input.suppressed) reasons.push("SUPPRESSED");
  if (input.objected) reasons.push("RIGHT_TO_OBJECT");
  if (!input.marketPolicyAllows) reasons.push("MARKET_POLICY_BLOCKED");
  if (!input.sendingIdentityVerified)
    reasons.push("VERIFIED_SENDING_IDENTITY_REQUIRED");
  if (input.frequencyCapReached) reasons.push("FREQUENCY_CAP_REACHED");
  if (!input.unsubscribeMechanismPresent)
    reasons.push("UNSUBSCRIBE_MECHANISM_REQUIRED");
  return { eligible: reasons.length === 0, reasons };
}

/** Prefixing neutralizes spreadsheet formula execution without changing text. */
export function spreadsheetSafeCell(value: string): string {
  return /^[\t\r+\-=@]/.test(value) ? `'${value}` : value;
}

export function evidenceByIds(
  evidence: ProspectEvidence[],
  ids: string[],
): ProspectEvidence[] {
  const allowed = new Set(ids);
  return evidence.filter((item) => allowed.has(item.id));
}
