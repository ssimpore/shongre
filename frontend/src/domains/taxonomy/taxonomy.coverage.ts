import { TaxonomyService, taxonomyService } from "./taxonomy.service";
import { TaxonomyLevel, TaxonomyNode } from "./taxonomy.types";
import {
  CANONICAL_TAXONOMY_ALIASES,
  CANONICAL_TAXONOMY_IDENTITIES,
  CANONICAL_TAXONOMY_IDENTITY_BY_ID,
} from "@shongre/contracts/taxonomy-catalog";
import { INITIAL_LISTINGS } from "../../mocks/initialDemoData";
import { TaxonomyMigration } from "./taxonomy.migration";

export interface TaxonomyCoverageRow {
  nodeId: string;
  category: string;
  subcategory: string;
  type: string;
  subtype: string;
  schema: boolean;
  publicationFlow: boolean;
  card: boolean;
  detailPage: boolean;
  filters: boolean;
  comparison: boolean;
  primaryCta: string;
  privateEligible: boolean;
  professionalEligible: boolean;
  standardPublication: boolean;
  moderation: boolean;
  translations: boolean;
  status: "complete" | "incomplete";
  missing: string[];
}

export interface TaxonomyDuplicateGroup {
  normalizedConcept: string;
  nodeIds: string[];
  labels: string[];
}

export interface TaxonomyCoverageReport {
  generatedAt: string;
  taxonomyVersion: number;
  totals: {
    roots: number;
    nodes: number;
    publishableLeaves: number;
    attributes: number;
    completeLeaves: number;
    demoListings: number;
    blockingIssues: number;
  };
  rows: TaxonomyCoverageRow[];
  duplicateCandidates: TaxonomyDuplicateGroup[];
  blockingIssues: string[];
}

function normalizeConcept(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(d|de|des|du|la|le|les)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lineageByLevel(
  service: TaxonomyService,
  node: TaxonomyNode,
): Partial<Record<TaxonomyLevel, string>> {
  return [...service.getAncestors(node.id), node].reduce<
    Partial<Record<TaxonomyLevel, string>>
  >((result, entry) => {
    result[entry.level] = entry.name;
    return result;
  }, {});
}

function duplicateCandidates(nodes: TaxonomyNode[]): TaxonomyDuplicateGroup[] {
  const groups = new Map<string, TaxonomyNode[]>();
  nodes
    .filter((node) => node.status === "active")
    .forEach((node) => {
      const normalized = normalizeConcept(node.name);
      groups.set(normalized, [...(groups.get(normalized) || []), node]);
    });

  return Array.from(groups.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([normalizedConcept, entries]) => ({
      normalizedConcept,
      nodeIds: entries.map((entry) => entry.id),
      labels: entries.map((entry) => entry.name),
    }));
}

export function buildTaxonomyCoverageReport(
  service: TaxonomyService = taxonomyService,
): TaxonomyCoverageReport {
  const nodes = service.getAllNodes();
  const leaves = service.getPublishableLeaves();
  const integrity = service.validateIntegrity();
  const duplicates = duplicateCandidates(nodes);
  const identityIssues = CANONICAL_TAXONOMY_IDENTITIES.flatMap((identity) => {
    const node = service.getNode(identity.id);
    if (!node) return [`Shared identity ${identity.id} is missing from the demo taxonomy`];
    const mismatches = [
      node.code !== identity.code ? "code" : "",
      node.slug !== identity.slug ? "slug" : "",
      node.parentId !== identity.parentId ? "parentId" : "",
      node.level !== identity.level ? "level" : "",
    ].filter(Boolean);
    return mismatches.length
      ? [`${identity.id}: shared identity drift in ${mismatches.join(", ")}`]
      : [];
  });
  const aliasIssues = Object.entries(CANONICAL_TAXONOMY_ALIASES).flatMap(
    ([alias, nodeId]) =>
      CANONICAL_TAXONOMY_IDENTITY_BY_ID.has(nodeId)
        ? []
        : [`Alias ${alias} targets missing node ${nodeId}`],
  );
  const listingReferenceIssues = TaxonomyMigration.buildDryRunReport(
    INITIAL_LISTINGS,
  )
    .filter((entry) => entry.status === "ambiguous")
    .map(
      (entry) =>
        `Demo listings ${entry.affectedListingIds.join(", ")} reference unresolved taxonomy value ${entry.source}`,
    );

  const rows = leaves.map<TaxonomyCoverageRow>((node) => {
    const schema = service.resolvePublicationSchema(node.id);
    const lineage = lineageByLevel(service, node);
    const checks = {
      schema: Boolean(schema?.schemaVersion && schema.attributes.length),
      publicationFlow: Boolean(schema?.publication.steps.length),
      card: Boolean(schema?.presentation?.cardAttributeIds?.length),
      detailPage: Boolean(schema?.presentation?.detailGroupOrder?.length),
      filters: Boolean(service.resolveSearchFilters(node.id).length),
      comparison: Boolean(service.getComparisonAttributes(node.id).length),
      primaryCta: schema?.publication.primaryCta || "",
      privateEligible: schema?.sellerEligibility.individualAllowed === true,
      professionalEligible: schema?.sellerEligibility.proAllowed === true,
      standardPublication:
        schema?.publication.standardPolicy.enabled === true &&
        schema.publication.standardPolicy.paidUpgradesOptional === true,
      moderation: Boolean(schema?.moderation.policyId),
      translations: Boolean(node.labels["fr-FR"] && node.labels["en-US"]),
    };
    const requiredChecks = [
      "schema",
      "publicationFlow",
      "card",
      "detailPage",
      "filters",
      "comparison",
      "primaryCta",
      "standardPublication",
      "moderation",
      "translations",
    ] as const;
    const missing = requiredChecks.filter(
      (key) => checks[key] === false || checks[key] === "",
    );

    return {
      nodeId: node.id,
      category: lineage.category || "",
      subcategory: lineage.subcategory || "",
      type: lineage.type || "",
      subtype: lineage.subtype || "",
      ...checks,
      status: missing.length === 0 ? "complete" : "incomplete",
      missing,
    };
  });
  const blockingIssues = [
    ...integrity.errors,
    ...identityIssues,
    ...aliasIssues,
    ...listingReferenceIssues,
    ...duplicates.map(
      (group) =>
        `Duplicate taxonomy concept ${group.normalizedConcept}: ${group.nodeIds.join(", ")}`,
    ),
    ...rows
      .filter((row) => row.status === "incomplete")
      .map(
        (row) =>
          `${row.nodeId}: missing ${row.missing.join(", ")}`,
      ),
  ];

  return {
    generatedAt: new Date().toISOString(),
    taxonomyVersion: Math.max(...nodes.map((node) => node.taxonomyVersion || 1)),
    totals: {
      roots: service.getRootCategories().length,
      nodes: nodes.length,
      publishableLeaves: leaves.length,
      attributes: service.getAllAttributes().length,
      completeLeaves: rows.filter((row) => row.status === "complete").length,
      demoListings: INITIAL_LISTINGS.length,
      blockingIssues: blockingIssues.length,
    },
    rows,
    duplicateCandidates: duplicates,
    blockingIssues,
  };
}

export function formatTaxonomyCoverageMarkdown(
  report: TaxonomyCoverageReport,
): string {
  const header =
    "| Category | Subcategory | Type | Subtype | Schema | Publication flow | Card | Detail page | Filters | Comparison | CTA | Private | Professional | Standard | Moderation | Status |";
  const divider =
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |";
  const lines = report.rows.map((row) =>
    [
      row.category,
      row.subcategory,
      row.type,
      row.subtype,
      row.schema ? "yes" : "no",
      row.publicationFlow ? "yes" : "no",
      row.card ? "yes" : "no",
      row.detailPage ? "yes" : "no",
      row.filters ? "yes" : "no",
      row.comparison ? "yes" : "no",
      row.primaryCta,
      row.privateEligible ? "yes" : "no",
      row.professionalEligible ? "yes" : "no",
      row.standardPublication ? "yes" : "no",
      row.moderation ? "yes" : "no",
      row.status,
    ]
      .map((value) => String(value).replace(/\|/g, "\\|"))
      .join(" | ")
      .replace(/^/, "| ")
      .replace(/$/, " |"),
  );
  return [header, divider, ...lines].join("\n");
}
