import {
  TaxonomyNode,
  TaxonomyAttribute,
  ResolvedPublicationSchema,
  SearchFacetDefinition,
  TaxonomyCapabilities,
  SellerEligibilityRules,
  ConditionOption,
  ListingFamily,
  TaxonomyLabelMode,
  TaxonomyLabelOptions,
} from "./taxonomy.types";
import { CANONICAL_TAXONOMY } from "./taxonomy.data";
import { getTaxonomyLabel } from "./taxonomy.labels";
// Re-exported so the many existing `from './taxonomy.service'` imports keep working.
export { getTaxonomyLabel } from "./taxonomy.labels";
import { ATTRIBUTE_REGISTRY } from "./attribute.registry";
import { CONDITION_SCHEMES } from "./condition.schemes";
import { activeDataLocale } from "../../i18n/localized";
import {
  normalizeSearchText,
  searchTextIncludes,
} from "../../utilities/search-text";

export type { TaxonomyLabelMode, TaxonomyLabelOptions };

/**
 * Universal taxonomy label resolution helper.
 * - In 'full' mode (default): returns canonical full label.
 * - In 'compact' mode: returns shortLabel ?? label ?? name.
 *
 * Rules:
 * - Never returns undefined or blank string for valid nodes.
 * - Uses nullish coalescing (??), not OR (||).
 * - shortLabel is strictly a presentation alias and must never be used as an identifier.
 */

export class TaxonomyService {
  private nodesMap: Map<string, TaxonomyNode> = new Map();
  private slugMap: Map<string, TaxonomyNode> = new Map();
  private rootNodes: TaxonomyNode[] = [];

  constructor() {
    this.buildIndex(CANONICAL_TAXONOMY);
  }

  private buildIndex(nodes: TaxonomyNode[]) {
    const dataLocale = activeDataLocale();
    this.nodesMap.clear();
    this.slugMap.clear();
    this.rootNodes = [];

    const traverse = (
      node: TaxonomyNode,
      parent?: TaxonomyNode,
      ancestors: string[] = [],
    ) => {
      const fullAncestors = parent ? [...ancestors, parent.id] : ancestors;
      /* `name`, `label` and `shortLabel` are the flat mirrors of
         `labels['fr-FR']` / `shortLabels['fr-FR']`, and most call sites read the
         flat field rather than going through `getTaxonomyLabel`. That made the
         French copy the de-facto source and left the `en-US` entries — already
         present in the data — unreachable outside the few callers that asked
         for a locale explicitly.

         Resolving them here keeps one source of truth (the `labels` map) and
         removes the duplication instead of adding a second catalogue: whatever
         a consumer reads, it now reads in the active language. */
      const localizedLabel = getTaxonomyLabel(node, { locale: dataLocale });
      const localizedShort = getTaxonomyLabel(node, {
        locale: dataLocale,
        compact: true,
      });

      const indexedNode: TaxonomyNode = {
        ...node,
        name: localizedLabel || node.name,
        label: localizedLabel || node.label,
        shortLabel: localizedShort || node.shortLabel,
        parentId: parent ? parent.id : node.parentId,
        ancestorIds: fullAncestors,
      };

      this.nodesMap.set(node.id, indexedNode);
      this.slugMap.set(node.slug.toLowerCase(), indexedNode);

      if (!parent) {
        this.rootNodes.push(indexedNode);
      }

      if (node.children && node.children.length > 0) {
        node.children.forEach((child) =>
          traverse(child, indexedNode, fullAncestors),
        );
      }
    };

    nodes.forEach((root) => traverse(root));
  }

  /**
   * Rebuilds the in-memory lookup maps from an updated tree.
   */
  reload(nodes?: TaxonomyNode[]) {
    this.buildIndex(nodes || CANONICAL_TAXONOMY);
  }

  // ==========================================
  // QUERY & TRAVERSAL APIS
  // ==========================================
  getRootCategories(): TaxonomyNode[] {
    return this.rootNodes.filter((n) => n.status === "active");
  }

  getAllNodes(): TaxonomyNode[] {
    return Array.from(this.nodesMap.values());
  }

  getNode(id?: string): TaxonomyNode | undefined {
    if (!id) return undefined;
    return this.nodesMap.get(id);
  }

  getNodeBySlug(slug?: string): TaxonomyNode | undefined {
    if (!slug) return undefined;
    return this.slugMap.get(slug.toLowerCase().trim());
  }

  getChildren(nodeId: string): TaxonomyNode[] {
    const target = this.nodesMap.get(nodeId);
    if (!target || !target.children) return [];
    return target.children.map((c) => this.nodesMap.get(c.id) || c);
  }

  getDescendants(nodeId: string): TaxonomyNode[] {
    const descendants: TaxonomyNode[] = [];
    const visit = (id: string) => {
      this.getChildren(id).forEach((child) => {
        descendants.push(child);
        visit(child.id);
      });
    };
    visit(nodeId);
    return descendants;
  }

  getAncestors(nodeId: string): TaxonomyNode[] {
    const node = this.nodesMap.get(nodeId);
    if (!node || !node.ancestorIds) return [];
    return node.ancestorIds
      .map((ancestorId) => this.nodesMap.get(ancestorId))
      .filter((n): n is TaxonomyNode => n !== undefined);
  }

  getLabel(
    node?: {
      label?: string;
      name?: string;
      shortLabel?: string;
      labels?: Record<string, string>;
      shortLabels?: Record<string, string>;
    } | null,
    modeOrOptions: TaxonomyLabelMode | TaxonomyLabelOptions = "full",
  ): string {
    return getTaxonomyLabel(node, modeOrOptions);
  }

  getBreadcrumbs(
    nodeId: string,
    mode: TaxonomyLabelMode = "full",
  ): { label: string; slug: string; id: string }[] {
    const node = this.nodesMap.get(nodeId);
    if (!node) return [];
    const ancestors = this.getAncestors(nodeId);
    const chain = [...ancestors, node];
    return chain.map((n) => ({
      id: n.id,
      label: getTaxonomyLabel(n, mode),
      slug: n.slug,
    }));
  }

  isPublishable(nodeId: string): boolean {
    const node = this.nodesMap.get(nodeId);
    if (!node || node.status !== "active") return false;
    if (node.publishable === false) return false;
    if (node.publishable === true) return true;
    // By default, leaf nodes (nodes without active children) are publishable
    const children = this.getChildren(nodeId).filter(
      (c) => c.status === "active",
    );
    return children.length === 0;
  }

  getPublishableLeaves(): TaxonomyNode[] {
    return Array.from(this.nodesMap.values()).filter((n) =>
      this.isPublishable(n.id),
    );
  }

  getFamily(nodeId: string): ListingFamily {
    const node = this.nodesMap.get(nodeId);
    if (!node) return "physical_product";
    if (node.listingFamily) return node.listingFamily;

    const ancestors = this.getAncestors(nodeId);
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (ancestors[i].listingFamily) {
        return ancestors[i].listingFamily!;
      }
    }

    // Infer from root ID
    const rootId = ancestors[0]?.id || node.id;
    if (rootId.startsWith("vehicle")) return "vehicle";
    if (rootId.startsWith("real_estate")) return "real_estate";
    if (rootId.startsWith("service")) return "service";
    if (rootId.startsWith("job")) return "job";
    if (rootId.startsWith("pro_")) return "professional_equipment";
    if (rootId.startsWith("digital")) return "digital";

    return "physical_product";
  }

  searchTaxonomy(query: string, limit: number = 8): TaxonomyNode[] {
    /* Folded the same way the listing search folds, so a suggestion can never
       promise a category the results page then fails to match. Before, "velo"
       only scored here because it fell through to the slug, which is already
       ASCII — names, synonyms and aliases all missed. */
    const clean = normalizeSearchText(query);
    if (!clean) return this.getRootCategories().slice(0, limit);

    const matches: { node: TaxonomyNode; score: number }[] = [];

    this.nodesMap.forEach((node) => {
      if (node.status === "disabled") return;
      let score = 0;
      const name = normalizeSearchText(node.name);
      const slug = normalizeSearchText(node.slug);

      if (name === clean) score += 100;
      else if (name.startsWith(clean)) score += 50;
      else if (name.includes(clean)) score += 25;

      // Match shortLabel
      if (node.shortLabel) {
        const shortClean = normalizeSearchText(node.shortLabel);
        if (shortClean === clean) score += 95;
        else if (shortClean.startsWith(clean)) score += 45;
        else if (shortClean.includes(clean)) score += 20;
      }

      if (slug.includes(clean)) score += 15;

      if (node.synonyms?.some((s) => searchTextIncludes(s, clean))) {
        score += 30;
      }
      if (node.aliases?.some((a) => searchTextIncludes(a, clean))) {
        score += 35;
      }

      if (score > 0) {
        matches.push({ node, score });
      }
    });

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((m) => m.node);
  }

  // ==========================================
  // RESOLUTION ENGINES
  // ==========================================
  resolvePublicationSchema(
    nodeId: string,
    marketCode: string = "FR",
  ): ResolvedPublicationSchema | null {
    const node = this.nodesMap.get(nodeId);
    if (!node) return null;

    const ancestors = this.getAncestors(nodeId);
    const hierarchy = [...ancestors, node];

    // 1. Resolve Capabilities (Parent -> Child inheritance)
    const capabilities: TaxonomyCapabilities = {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping"],
    };

    hierarchy.forEach((n) => {
      if (n.capabilities) {
        Object.assign(capabilities, n.capabilities);
      }
      // Apply market override if present
      if (n.marketOverrides && n.marketOverrides[marketCode]?.capabilities) {
        Object.assign(
          capabilities,
          n.marketOverrides[marketCode]!.capabilities,
        );
      }
    });

    // 2. Resolve Seller Eligibility
    const sellerEligibility: SellerEligibilityRules = {
      individualAllowed: true,
      proAllowed: true,
      proVerificationRequired: false,
      proKbisRequired: false,
    };

    hierarchy.forEach((n) => {
      if (n.sellerEligibility) {
        Object.assign(sellerEligibility, n.sellerEligibility);
      }
      if (
        n.marketOverrides &&
        n.marketOverrides[marketCode]?.sellerEligibility
      ) {
        Object.assign(
          sellerEligibility,
          n.marketOverrides[marketCode]!.sellerEligibility,
        );
      }
    });

    // 3. Resolve Condition Scheme
    let conditionSchemeId = node.conditionScheme;
    if (!conditionSchemeId) {
      for (let i = ancestors.length - 1; i >= 0; i--) {
        if (ancestors[i].conditionScheme) {
          conditionSchemeId = ancestors[i].conditionScheme;
          break;
        }
      }
    }
    const conditionOptions: ConditionOption[] =
      CONDITION_SCHEMES[conditionSchemeId || "consumer_product"] ||
      CONDITION_SCHEMES.consumer_product;

    // 4. Resolve Attributes
    const accumulatedAttributeIds = new Set<string>();
    hierarchy.forEach((n) => {
      if (n.attributeIds) {
        n.attributeIds.forEach((attrId) => accumulatedAttributeIds.add(attrId));
      }
      if (
        n.marketOverrides &&
        n.marketOverrides[marketCode]?.additionalAttributeIds
      ) {
        n.marketOverrides[marketCode]!.additionalAttributeIds!.forEach(
          (attrId) => accumulatedAttributeIds.add(attrId),
        );
      }
      if (
        n.marketOverrides &&
        n.marketOverrides[marketCode]?.removedAttributeIds
      ) {
        n.marketOverrides[marketCode]!.removedAttributeIds!.forEach((attrId) =>
          accumulatedAttributeIds.delete(attrId),
        );
      }
    });

    const attributes: TaxonomyAttribute[] = Array.from(accumulatedAttributeIds)
      .map((attrId) => {
        const base = ATTRIBUTE_REGISTRY[attrId];
        if (!base) return null;
        // Check for node-level override
        const override = node.attributeOverrides?.[attrId];
        return override ? { ...base, ...override } : base;
      })
      .filter((a): a is TaxonomyAttribute => a !== null)
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

    // 5. Summary Attributes for card preview
    let summaryIds = node.summaryAttributeIds;
    if (!summaryIds || summaryIds.length === 0) {
      for (let i = ancestors.length - 1; i >= 0; i--) {
        if (
          ancestors[i].summaryAttributeIds &&
          ancestors[i].summaryAttributeIds!.length > 0
        ) {
          summaryIds = ancestors[i].summaryAttributeIds;
          break;
        }
      }
    }

    return {
      node,
      ancestors,
      conditionScheme: conditionOptions,
      attributes,
      capabilities,
      sellerEligibility,
      summaryAttributeIds: summaryIds || [],
      presentation: node.presentation,
      mediaGuidance: node.mediaGuidance,
      schemaVersion: node.schemaVersion || node.taxonomyVersion || 1,
      publication: node.publication!,
      moderation: node.moderation!,
    };
  }

  getComparisonAttributes(nodeId: string): TaxonomyAttribute[] {
    const schema = this.resolvePublicationSchema(nodeId);
    if (!schema) return [];
    return (schema.presentation?.comparisonAttributeIds || [])
      .map((id) => ATTRIBUTE_REGISTRY[id])
      .filter(
        (attribute): attribute is TaxonomyAttribute =>
          attribute !== undefined && attribute.comparable === true,
      );
  }

  canCompare(nodeIds: string[]): boolean {
    if (nodeIds.length < 2) return false;
    const nodes = nodeIds.map((id) => this.getNode(id));
    if (nodes.some((node) => !node || !this.isPublishable(node.id))) {
      return false;
    }

    // A comparison is meaningful only inside the same publishable leaf. This
    // prevents, for example, comparing a parking space with a house merely
    // because both happen to inherit a surface field.
    return nodes.every((node) => node!.id === nodes[0]!.id);
  }

  resolveSearchFilters(
    nodeId?: string,
    marketCode: string = "FR",
  ): SearchFacetDefinition[] {
    if (!nodeId) {
      // Global facets: Price, Condition, Location, SellerType
      return [];
    }

    const schema = this.resolvePublicationSchema(nodeId, marketCode);
    if (!schema) return [];

    return schema.attributes
      .filter((attr) => attr.filterable)
      .map((attr, idx) => {
        let facetType: "range" | "select" | "multi_select" | "boolean" =
          "select";
        if (
          attr.dataType === "number" ||
          attr.dataType === "year" ||
          attr.dataType === "range"
        ) {
          facetType = "range";
        } else if (attr.dataType === "boolean") {
          facetType = "boolean";
        } else if (attr.dataType === "multi_select") {
          facetType = "multi_select";
        }

        return {
          attribute: attr,
          facetType,
          order: attr.displayOrder || idx,
        };
      })
      .sort((a, b) => a.order - b.order);
  }

  getCardSummaryAttributes(nodeId: string): TaxonomyAttribute[] {
    const node = this.nodesMap.get(nodeId);
    if (!node) return [];

    const schema = this.resolvePublicationSchema(nodeId);
    if (!schema || schema.summaryAttributeIds.length === 0) return [];

    return schema.summaryAttributeIds
      .map((id) => ATTRIBUTE_REGISTRY[id])
      .filter((a): a is TaxonomyAttribute => a !== undefined);
  }

  // ==========================================
  // ATTRIBUTE REGISTRY API
  // ==========================================
  getAttribute(id: string): TaxonomyAttribute | undefined {
    return ATTRIBUTE_REGISTRY[id];
  }

  getAllAttributes(): TaxonomyAttribute[] {
    return Object.values(ATTRIBUTE_REGISTRY);
  }

  // ==========================================
  // INTEGRITY & ADMIN VALIDATION
  // ==========================================
  validateIntegrity(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();
    const seenCodes = new Set<string>();
    const seenShortLabels = new Set<string>();

    this.nodesMap.forEach((node) => {
      // 1. Unique ID
      if (seenIds.has(node.id)) {
        errors.push(`Duplicate Node ID: ${node.id}`);
      }
      seenIds.add(node.id);

      if (seenCodes.has(node.code)) {
        errors.push(`Duplicate canonical code: ${node.code}`);
      }
      seenCodes.add(node.code);

      // 2. Unique slug among siblings
      const normalizedSlug = node.slug.toLowerCase().trim();
      if (seenSlugs.has(normalizedSlug)) {
        errors.push(`Duplicate active slug: ${node.slug}`);
      }
      seenSlugs.add(normalizedSlug);

      // 3. Parent exists if parentId set
      if (node.parentId && !this.nodesMap.has(node.parentId)) {
        errors.push(
          `Orphan node: ${node.id} references missing parentId ${node.parentId}`,
        );
      }

      // 4. Attribute references valid
      if (node.attributeIds) {
        node.attributeIds.forEach((attrId) => {
          if (!ATTRIBUTE_REGISTRY[attrId]) {
            errors.push(
              `Node ${node.id} references unknown attribute ${attrId}`,
            );
          }
        });
      }

      // Card, comparison and filter metadata must never point at an unknown
      // registry field. These checks catch incomplete admin edits before they
      // reach publication or search.
      [
        ...(node.summaryAttributeIds || []),
        ...(node.filterFacetIds || []),
      ].forEach((attrId) => {
        if (!ATTRIBUTE_REGISTRY[attrId]) {
          errors.push(
            `Node ${node.id} references unknown presentation attribute ${attrId}`,
          );
        }
      });
      (node.filterFacetIds || []).forEach((attrId) => {
        if (
          ATTRIBUTE_REGISTRY[attrId] &&
          !ATTRIBUTE_REGISTRY[attrId].filterable
        ) {
          errors.push(
            `Node ${node.id} exposes non-filterable attribute ${attrId} as a facet`,
          );
        }
      });

      if (node.presentation?.cardAttributeIds) {
        node.presentation.cardAttributeIds.forEach((attrId) => {
          if (!ATTRIBUTE_REGISTRY[attrId]) {
            errors.push(
              `Node ${node.id} references unknown card attribute ${attrId}`,
            );
          }
        });
      }

      if (this.isPublishable(node.id)) {
        const schema = this.resolvePublicationSchema(node.id);
        if (!schema?.attributes.length) {
          errors.push(
            `Publishable node ${node.id} has no publication attributes`,
          );
        }
        if (!node.supportedIntents?.length) {
          errors.push(`Publishable node ${node.id} has no publication intent`);
        }
        if (!node.publication?.steps.length) {
          errors.push(`Publishable node ${node.id} has no publication steps`);
        }
        if (!node.publication?.primaryCta) {
          errors.push(`Publishable node ${node.id} has no primary CTA`);
        }
        if (!node.publication?.standardPolicy.enabled) {
          errors.push(
            `Publishable node ${node.id} has no standard publication policy`,
          );
        }
        if (!node.moderation?.policyId) {
          errors.push(`Publishable node ${node.id} has no moderation policy`);
        }
        if (!node.labels["fr-FR"] || !node.labels["en-US"]) {
          errors.push(
            `Publishable node ${node.id} has incomplete translations`,
          );
        }
      }

      // 5. shortLabel format check (must not be empty string if defined)
      if (node.shortLabel !== undefined) {
        if (
          typeof node.shortLabel !== "string" ||
          node.shortLabel.trim().length === 0
        ) {
          errors.push(`Node ${node.id} has invalid empty shortLabel`);
        }
      }

      // 6. Check sibling collision for shortLabel
      if (node.shortLabel) {
        const siblingShortKey = `${node.parentId || "root"}:${node.shortLabel.toLowerCase().trim()}`;
        if (seenShortLabels.has(siblingShortKey)) {
          errors.push(
            `Ambiguous duplicate shortLabel "${node.shortLabel}" under parent ${node.parentId || "root"}`,
          );
        }
        seenShortLabels.add(siblingShortKey);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const taxonomyService = new TaxonomyService();
