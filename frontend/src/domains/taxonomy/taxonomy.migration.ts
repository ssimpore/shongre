/**
 * SHONGRE TAXONOMY MIGRATION UTILITY
 * Seamlessly maps legacy slugs/categories into canonical taxonomy nodes and preserves backward compatibility.
 */

import { taxonomyService } from "./taxonomy.service";
import { getTaxonomyLabel } from "./taxonomy.labels";
import { TaxonomyNode } from "./taxonomy.types";

export const LEGACY_CATEGORY_SLUG_MAP: Record<string, string> = {
  // Top-level mappings
  vehicules: "vehicles",
  voitures: "vehicles.cars",
  motos: "vehicles.motos",
  immobilier: "real_estate",
  "ventes-immobilieres": "real_estate.sales",
  locations: "real_estate.rentals",
  multimedia: "electronics",
  smartphones: "electronics.smartphones",
  "electronics.telephony.smartphones": "electronics.smartphones",
  informatique: "electronics.computers",
  "consoles-jeux": "electronics.gaming",
  "maison-deco": "home_garden",
  mobilier: "home_garden.furniture",
  electromenager: "home_garden.appliances",
  "bricolage-jardin": "home_garden.diy_garden",
  mode: "fashion",
  "mode-beaute": "fashion",
  "mode-accessoires": "fashion",
  "vetements-femme": "fashion.women",
  "vetements-homme": "fashion.men",
  "loisirs-sport": "leisure_culture",
  "sports-plein-air": "sports_outdoors",
  services: "services",
  "materiel-pro": "professional_btp",
  "materiel-professionnel-btp": "professional_btp",
  emploi: "jobs",
  animaux: "pets",
  sports: "sports_outdoors",
  "sports-loisirs": "sports_outdoors",
  "sports-hobbies": "sports_outdoors",
  "bons-plans": "deals_donations",
};

export class TaxonomyMigration {
  /**
   * Resolves any legacy slug or modern nodeId into a canonical TaxonomyNode
   */
  static resolveCanonicalNode(slugOrId?: string): TaxonomyNode | undefined {
    if (!slugOrId) return undefined;
    const clean = slugOrId.toLowerCase().trim();

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

    return undefined;
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
      this.resolveCanonicalNode(listing.categorySlug) ||
      taxonomyService.getNode("home_garden");

    const rootAncestor =
      node?.ancestorIds && node.ancestorIds.length > 0
        ? taxonomyService.getNode(node.ancestorIds[0])
        : node;

    return {
      categoryId: node?.id || "home_garden",
      categorySlug: rootAncestor?.slug || "maison-jardin",
      categoryLabel:
        getTaxonomyLabel(rootAncestor, "compact") || "Maison, Meubles & Jardin",
      subCategorySlug: node?.slug || "mobilier",
      subCategoryLabel: getTaxonomyLabel(node, "compact") || "Mobilier",
    };
  }
}
