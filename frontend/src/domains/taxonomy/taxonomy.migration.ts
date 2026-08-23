/**
 * SHONGRE TAXONOMY MIGRATION UTILITY
 * Seamlessly maps legacy slugs/categories into canonical taxonomy nodes and preserves backward compatibility.
 */

import { taxonomyService } from "./taxonomy.service";
import { getTaxonomyLabel } from "./taxonomy.labels";
import { TaxonomyNode } from "./taxonomy.types";
import { CANONICAL_TAXONOMY_ALIASES } from "@shongre/contracts/taxonomy-catalog";

export const LEGACY_CATEGORY_SLUG_MAP: Record<string, string> = {
  ...CANONICAL_TAXONOMY_ALIASES,
};

export interface TaxonomyMigrationListingReference {
  id: string;
  categorySlug?: string;
  subCategorySlug?: string;
}

export interface TaxonomyMigrationDryRunEntry {
  source: string;
  canonicalNodeId?: string;
  affectedListingIds: string[];
  status: "canonical" | "mapped" | "ambiguous";
}

function normalizeLookup(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Preserve malformed legacy input for the unresolved dry-run report.
  }
  return decoded
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/^\/+|\/+$/g, "");
}

export class TaxonomyMigration {
  /**
   * Resolves any legacy slug or modern nodeId into a canonical TaxonomyNode
   */
  static resolveCanonicalNode(slugOrId?: string): TaxonomyNode | undefined {
    if (!slugOrId) return undefined;
    const clean = normalizeLookup(slugOrId);

    // 1. Direct ID match
    const direct = taxonomyService.getNode(clean);
    if (direct) return direct;

    // 2. Direct Slug match
    const slugMatch = taxonomyService.getNodeBySlug(clean);
    if (slugMatch) return slugMatch;

    // 3. Legacy mapping
    const mappedId = LEGACY_CATEGORY_SLUG_MAP[clean];
    if (mappedId) {
      return taxonomyService.getNode(mappedId);
    }

    // Admin-managed aliases remain attached to their canonical record. They
    // are resolved after explicit legacy mappings so an old URL can never
    // shadow a deliberate migration decision.
    const aliasMatch = taxonomyService
      .getAllNodes()
      .find((node) =>
        [...(node.aliases || []), ...(node.synonyms || [])].some(
          (alias) => normalizeLookup(alias) === clean,
        ),
      );
    if (aliasMatch) return aliasMatch;

    return undefined;
  }

  static resolveCanonicalRedirect(
    slugOrId?: string,
  ): { node: TaxonomyNode; redirectPath?: string } | undefined {
    const node = this.resolveCanonicalNode(slugOrId);
    if (!node) return undefined;
    const clean = slugOrId ? normalizeLookup(slugOrId) : "";
    return {
      node,
      redirectPath:
        clean && clean !== normalizeLookup(node.slug)
          ? `/categorie/${node.slug}`
          : undefined,
    };
  }

  static buildDryRunReport(
    listings: TaxonomyMigrationListingReference[],
  ): TaxonomyMigrationDryRunEntry[] {
    const entries = new Map<string, TaxonomyMigrationDryRunEntry>();
    listings.forEach((listing) => {
      const source =
        listing.subCategorySlug?.trim() || listing.categorySlug?.trim() || "";
      if (!source) return;
      const node = this.resolveCanonicalNode(source);
      const directCanonical =
        node &&
        [node.id, node.slug]
          .map(normalizeLookup)
          .includes(normalizeLookup(source));
      const key = `${source}:${node?.id || "ambiguous"}`;
      const current = entries.get(key) || {
        source,
        canonicalNodeId: node?.id,
        affectedListingIds: [],
        status: node ? (directCanonical ? "canonical" : "mapped") : "ambiguous",
      };
      current.affectedListingIds.push(listing.id);
      entries.set(key, current);
    });
    return Array.from(entries.values()).sort((left, right) =>
      left.source.localeCompare(right.source),
    );
  }

  /**
   * Normalizes listing category fields
   */
  static normalizeListingCategory(listing: {
    categorySlug?: string;
    subCategorySlug?: string;
    categoryLabel?: string;
    subCategoryLabel?: string;
  }) {
    const node =
      this.resolveCanonicalNode(listing.subCategorySlug) ||
      this.resolveCanonicalNode(listing.categorySlug);

    if (!node) {
      const unresolvedId =
        listing.subCategorySlug || listing.categorySlug || "unclassified";
      return {
        categoryId: unresolvedId,
        categorySlug: listing.categorySlug || "autres",
        categoryLabel: listing.categoryLabel || "Autres",
        subCategorySlug: listing.subCategorySlug || "non-classee",
        subCategoryLabel: listing.subCategoryLabel || "À reclasser",
      };
    }

    const rootAncestor =
      node?.ancestorIds && node.ancestorIds.length > 0
        ? taxonomyService.getNode(node.ancestorIds[0])
        : node;

    return {
      categoryId: node.id,
      categorySlug: rootAncestor?.slug || node.slug,
      categoryLabel: getTaxonomyLabel(rootAncestor, "compact") || node.name,
      subCategorySlug: node.slug,
      subCategoryLabel: getTaxonomyLabel(node, "compact") || node.name,
    };
  }
}
