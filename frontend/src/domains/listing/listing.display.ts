/**
 * SHONGRE LISTING DISPLAY & CHARACTERISTICS RESOLVER
 * Authoritative engine translating raw listing attributes and taxonomy metadata
 * into structured, grouped, unit-aware, and localized presentation models.
 */

import { Listing, UserProfile } from "../../types";
import { TaxonomyNode, TaxonomyAttribute } from "../taxonomy/taxonomy.types";
import { taxonomyService } from "../taxonomy/taxonomy.service";
import { TaxonomyMigration } from "../taxonomy/taxonomy.migration";
import { ATTRIBUTE_REGISTRY } from "../taxonomy/attribute.registry";
import { CONDITION_SCHEMES } from "../taxonomy/condition.schemes";
import { CONDITION_OPTIONS } from "../../configuration/market.config";
import { MarketConfiguration } from "../market/market.types";
import { activeDataLocale } from "../../i18n/localized";
import {
  currentBrowserMarketCode,
  publicListingUrl,
} from "../market/market-routing";
import { getCountryConfig, getDefaultCountryConfig } from "@shongre/contracts";

/**
 * Demo and imported listings can contain attributes that are not yet present
 * in the taxonomy registry. They still need to read like product data rather
 * than storage keys on a public detail page. Keep this fallback map here, at
 * the presentation boundary, so cards, details and future HTTP data share the
 * same graceful behaviour without teaching components about raw DTO shapes.
 */
const FALLBACK_ATTRIBUTE_LABELS: Record<string, string> = {
  brand: "Marque",
  model: "Modèle",
  storage: "Stockage",
  color: "Couleur",
  bike_type: "Type de vélo",
  frame_size: "Taille du cadre",
  furniture_type: "Type de meuble",
  clothing_category: "Catégorie",
  size: "Taille",
  platform: "Plateforme",
  instrument_type: "Type d'instrument",
  appliance_type: "Type d'appareil",
  tool_type: "Type d'outil",
  sport: "Sport",
  pet_type: "Type d'animal",
  equipment_type: "Type d'équipement",
  service_type: "Type de service",
  contract_type: "Type de contrat",
  property_type: "Type de bien",
};

const FALLBACK_VALUE_LABELS: Record<string, string> = {
  apple: "Apple",
  appartement: "Appartement",
  canape: "Canapé",
  cdi: "CDI",
  chene: "Chêne",
  electroportatif: "Électroportatif",
  essence: "Essence",
  gravel: "Gravel",
  guitare: "Guitare",
  jardinage: "Jardinage",
  laser: "Laser",
  musique: "Musique",
  peugeot: "Peugeot",
  ps5: "PlayStation 5",
  robot: "Robot ménager",
  surf: "Surf",
  table: "Table",
  tissu: "Tissu",
  velours: "Velours",
};

/**
 * Compatibility priorities for demo/imported records that still carry legacy
 * root slugs or attribute keys. Canonical v4 `cardAttributeIds` always run
 * first; these values only fill an otherwise sparse card and can disappear as
 * those records are migrated.
 */
const LEGACY_CARD_ATTRIBUTE_PRIORITIES: Record<string, string[]> = {
  immobilier: ["property_type", "living_area", "rooms"],
  vehicules: ["model_year", "mileage", "fuel_type", "transmission"],
  mode: ["size", "brand", "clothingCategory", "clothing_category"],
  electronique: ["storage_capacity_gb", "storage", "brand", "model"],
  "maison-deco": [
    "furniture_type",
    "material",
    "dimensions_width",
    "dimensions_length",
  ],
  maison: [
    "furniture_type",
    "material",
    "dimensions_width",
    "dimensions_length",
  ],
  emploi: ["contract_type", "remote_work", "working_arrangement"],
  "outils-pro": ["equipment_type", "brand", "model"],
  "bebe-famille": ["size", "age_range", "brand"],
  "loisirs-culture": ["instrument_type", "platform", "brand"],
  education: ["service_type", "delivery_modes", "level"],
  autres: ["brand", "model", "material"],
};

export interface FormattedCharacteristicItem {
  code: string;
  label: string;
  value: string;
  unit?: string;
  groupKey: string;
  isHighlight?: boolean;
}

export interface GroupedCharacteristics {
  groupKey: string;
  groupTitle: string;
  items: FormattedCharacteristicItem[];
}

export interface ListingSeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  jsonLd: Record<string, any>;
}

export class ListingDisplayResolver {
  /**
   * Resolves the 3-5 most critical decision-making summary attributes
   * displayed prominently directly below the title and price.
   */
  resolveSummaryAttributes(
    listing: Listing,
    node?: TaxonomyNode | null,
  ): string[] {
    const summary: string[] = [];
    const attrs = listing.attributes || {};
    const effectiveNode =
      node ||
      TaxonomyMigration.resolveCanonicalNode(listing.subCategorySlug) ||
      TaxonomyMigration.resolveCanonicalNode(listing.categorySlug) ||
      taxonomyService.getNode(listing.subCategorySlug) ||
      taxonomyService.getNodeBySlug(listing.subCategorySlug) ||
      taxonomyService.getNode(listing.categorySlug) ||
      taxonomyService.getNodeBySlug(listing.categorySlug);

    // Card priorities are taxonomy metadata. New branches therefore work
    // without another domain-specific conditional in the UI.
    const configuredCardAttributeIds =
      effectiveNode?.presentation?.cardAttributeIds;
    const summaryIds = configuredCardAttributeIds?.length
      ? configuredCardAttributeIds
      : Array.from(
          new Set([
            ...(effectiveNode?.summaryAttributeIds || []),
            ...(effectiveNode?.filterFacetIds || []),
            ...(effectiveNode?.attributeIds || []),
          ]),
        );
    summaryIds.forEach((attrId) => {
      const attrDef = this.findAttributeDefinition(attrId);
      const code = attrDef?.code || attrId.split(".").pop() || attrId;
      const val = attrs[code] ?? attrs[attrId];
      // Price has a dedicated, locale-aware card field. Internal money units
      // must never leak into decision chips or duplicate the displayed price.
      if (attrDef?.unit === "currency_minor") return;
      if (val !== undefined && val !== null && val !== "") {
        const formattedValue = this.formatAttributeValue(attrDef, val);
        summary.push(
          this.compactEmploymentCardValue(effectiveNode, code, formattedValue),
        );
      }
    });

    const legacyPriorities =
      LEGACY_CARD_ATTRIBUTE_PRIORITIES[listing.categorySlug] ||
      LEGACY_CARD_ATTRIBUTE_PRIORITIES[listing.subCategorySlug] ||
      [];
    for (const attributeKey of legacyPriorities) {
      if (summary.length >= 3) break;
      const rawValue = attrs[attributeKey];
      if (rawValue === undefined || rawValue === null || rawValue === "") {
        continue;
      }
      const attribute = this.findAttributeDefinition(attributeKey);
      if (attribute?.unit === "currency_minor") continue;
      const formatted = this.formatAttributeValue(attribute, rawValue);
      if (
        formatted &&
        !summary.some(
          (existing) =>
            existing.toLocaleLowerCase("fr-FR") ===
            formatted.toLocaleLowerCase("fr-FR"),
        )
      ) {
        summary.push(formatted);
      }
    }

    if (listing.condition && summary.length < 3) {
      const conditionLabel = this.resolveConditionLabel(
        listing.condition,
        effectiveNode,
      );
      if (conditionLabel && !summary.includes(conditionLabel))
        summary.push(conditionLabel);
    }

    return summary.slice(0, 5);
  }

  /**
   * Employment taxonomy labels remain descriptive in forms, filters and detail
   * views. Cards compact the work-arrangement label so the essential chips stay
   * readable without depending on CSS truncation.
   */
  private compactEmploymentCardValue(
    node: TaxonomyNode | null | undefined,
    attributeCode: string,
    formattedValue: string,
  ): string {
    if (node?.verticalType !== "employment") return formattedValue;

    if (attributeCode === "telework") {
      return formattedValue.replace(/\s*\([^)]*\)\s*$/u, "").trim();
    }

    return formattedValue;
  }

  /**
   * Resolves structured, categorized detailed characteristics.
   * Hides absent/empty attributes, maps options, and attaches units.
   */
  resolveGroupedCharacteristics(
    listing: Listing,
    node?: TaxonomyNode | null,
  ): GroupedCharacteristics[] {
    const attrs = listing.attributes || {};
    const effectiveNode =
      node ||
      TaxonomyMigration.resolveCanonicalNode(listing.subCategorySlug) ||
      TaxonomyMigration.resolveCanonicalNode(listing.categorySlug) ||
      taxonomyService.getNode(listing.subCategorySlug) ||
      taxonomyService.getNodeBySlug(listing.subCategorySlug) ||
      taxonomyService.getNode(listing.categorySlug) ||
      taxonomyService.getNodeBySlug(listing.categorySlug);
    const groupsMap = new Map<string, FormattedCharacteristicItem[]>();

    const getOrCreateGroup = (groupKey: string) => {
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, []);
      }
      return groupsMap.get(groupKey)!;
    };

    // 1. Add condition if valid physical/vehicle/real_estate
    if (listing.condition) {
      const conditionLabel = this.resolveConditionLabel(
        listing.condition,
        effectiveNode,
      );
      getOrCreateGroup("general").push({
        code: "condition",
        label: "État général",
        value: conditionLabel,
        groupKey: "general",
        isHighlight: true,
      });
    }

    // 2. Iterate all populated attributes
    Object.entries(attrs).forEach(([key, rawValue]) => {
      if (rawValue === undefined || rawValue === null || rawValue === "")
        return;

      // Find attribute definition in registry
      const attrDef =
        Object.values(ATTRIBUTE_REGISTRY).find(
          (a) => a.code === key || a.id === key || a.id.endsWith(`.${key}`),
        ) || taxonomyService.getAttribute(key);

      if (attrDef?.privacy === "moderator_only") return;

      const groupKey = attrDef?.publicationGroup || this.inferGroupKey(key);
      const label = attrDef?.label || this.formatFallbackLabel(key);
      const formattedValue = this.formatAttributeValue(attrDef, rawValue);

      getOrCreateGroup(groupKey).push({
        code: key,
        label,
        value: formattedValue,
        unit: attrDef?.unit,
        groupKey,
        isHighlight: attrDef?.filterable,
      });
    });

    // 3. Map group keys to localized human-readable titles
    const groupTitles: Record<string, string> = {
      general: "Informations Générales",
      performance: "Motorisation & Performance",
      engine: "Motorisation & Performance",
      specifications: "Spécifications & Équipements",
      technical: "Caractéristiques Techniques",
      property: "Caractéristiques du Bien",
      energy: "Diagnostic Énergétique & DPE",
      dimensions: "Dimensions & Matières",
      employment: "Conditions du Poste",
      compliance: "Conformité & Normes",
      logistics: "Logistique & Conditionnement",
      legal: "Conformité & Informations légales",
    };

    const result: GroupedCharacteristics[] = [];
    const configuredGroupOrder = effectiveNode?.presentation
      ?.detailGroupOrder || [
      "general",
      "specifications",
      "dimensions",
      "performance",
      "legal",
    ];
    const orderedGroupKeys = [
      ...configuredGroupOrder,
      "engine",
      "technical",
      "property",
      "energy",
      "employment",
      "compliance",
      "logistics",
    ];

    orderedGroupKeys.forEach((gKey) => {
      const items = groupsMap.get(gKey);
      if (items && items.length > 0) {
        result.push({
          groupKey: gKey,
          groupTitle: groupTitles[gKey] || "Détails complémentaires",
          items,
        });
      }
    });

    // Add any remaining groups
    groupsMap.forEach((items, gKey) => {
      if (!orderedGroupKeys.includes(gKey) && items.length > 0) {
        result.push({
          groupKey: gKey,
          groupTitle: groupTitles[gKey] || "Détails complémentaires",
          items,
        });
      }
    });

    return result;
  }

  /**
   * Resolves human-readable condition label based on node's scheme or global options.
   */
  resolveConditionLabel(
    conditionValue: string,
    node?: TaxonomyNode | null,
  ): string {
    /* Services, jobs and rentals carry `not_applicable`, which is a storage
       value, not something to show a buyer. Printing "Non applicable" where the
       condition goes made a piano lesson look like a defective product — and it
       landed in the card's accessible name too. Returning empty lets every call
       site's existing `if (conditionLabel)` guard drop the row. */
    if (!conditionValue || conditionValue === "not_applicable") return "";
    /* Condition tiers already ship `labels: { 'fr-FR', 'en-US' }`; only the flat
       `label` was ever read, so the English strings sat in the data unused.
       Preferring the map costs nothing and duplicates nothing. */
    const locale = activeDataLocale();
    const localized = (option: {
      label: string;
      labels?: Record<string, string>;
    }): string => option.labels?.[locale]?.trim() || option.label;

    const schemeKey = node?.conditionScheme;
    if (schemeKey && CONDITION_SCHEMES[schemeKey]) {
      const found = CONDITION_SCHEMES[schemeKey].find(
        (c) => c.value === conditionValue,
      );
      if (found) return localized(found);
    }

    const globalFound = CONDITION_OPTIONS.find(
      (c) => c.value === conditionValue,
    );
    if (globalFound) return localized(globalFound);

    // Fallback dictionary
    const fallbackLabels: Record<string, string> = {
      new_with_tag: "Neuf avec étiquette",
      new_without_tag: "Neuf sans étiquette",
      very_good: "Très bon état",
      good: "Bon état",
      fair: "État satisfaisant",
      refurbished: "Reconditionné",
      for_parts: "Pour pièces / Réparation",
      excellent: "Excellent état",
      to_renovate: "À rénover",
    };

    return fallbackLabels[conditionValue] || conditionValue;
  }

  /**
   * Formats raw attribute value into localized display string.
   */
  formatAttributeValue(attrDef?: TaxonomyAttribute, val?: any): string {
    if (val === undefined || val === null) return "";

    if (typeof val === "boolean") {
      return val ? "Oui" : "Non";
    }

    if (Array.isArray(val) && attrDef?.options) {
      return val
        .map(
          (entry) =>
            attrDef.options?.find(
              (option) =>
                option.value === entry ||
                String(option.value).toLowerCase() ===
                  String(entry).toLowerCase(),
            )?.label || String(entry),
        )
        .join(", ");
    }

    if (attrDef?.options) {
      const displayOptionLabel = Object.entries(
        attrDef.displayOptionLabels || {},
      ).find(([key]) => key.toLowerCase() === String(val).toLowerCase())?.[1];
      if (displayOptionLabel) {
        return `${attrDef.displayPrefix || ""}${displayOptionLabel}`;
      }
      const opt = attrDef.options.find(
        (o) =>
          o.value === val ||
          String(o.value).toLowerCase() === String(val).toLowerCase(),
      );
      if (opt) return `${attrDef.displayPrefix || ""}${opt.label}`;
    }

    if (typeof val === "number") {
      if (attrDef?.dataType === "year") return String(val);
      if (attrDef?.code === "rooms") {
        return `${val} pièce${val > 1 ? "s" : ""}`;
      }
      const formattedNum = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      return attrDef?.unit ? `${formattedNum} ${attrDef.unit}` : formattedNum;
    }

    if (Array.isArray(val)) {
      return val.join(", ");
    }

    if (typeof val === "string" && attrDef?.code) {
      const label = this.formatOptionLabel(attrDef.code, val);
      if (label !== val) return label;
    }

    const formatted = this.formatOptionLabel(attrDef?.id || "", val);
    return attrDef?.displayPrefix
      ? `${attrDef.displayPrefix}${formatted}`
      : formatted;
  }

  private findAttributeDefinition(
    attributeIdOrCode: string,
  ): TaxonomyAttribute | undefined {
    return (
      ATTRIBUTE_REGISTRY[attributeIdOrCode] ||
      Object.values(ATTRIBUTE_REGISTRY).find(
        (attribute) =>
          attribute.code === attributeIdOrCode ||
          attribute.id === attributeIdOrCode ||
          attribute.id.endsWith(`.${attributeIdOrCode}`),
      ) ||
      taxonomyService.getAttribute(attributeIdOrCode)
    );
  }

  private formatOptionLabel(attributeId: string, value: any): string {
    const cleanKey = attributeId.replace(
      /^(product|vehicle|real_estate|electronics|home|fashion|service|job)\./,
      "",
    );
    const attr =
      ATTRIBUTE_REGISTRY[attributeId] ||
      Object.values(ATTRIBUTE_REGISTRY).find(
        (a) =>
          a.code === attributeId ||
          a.code === cleanKey ||
          a.id === attributeId ||
          a.id.endsWith(`.${cleanKey}`),
      );

    if (attr?.options) {
      const opt = attr.options.find(
        (o) =>
          o.value === value ||
          String(o.value).toLowerCase() === String(value).toLowerCase(),
      );
      if (opt) return opt.label;
    }

    // Direct fallback mapping for high frequency options
    const quickDict: Record<string, string> = {
      electrique: "Électrique",
      essence: "Essence",
      diesel: "Diesel",
      hybride: "Hybride",
      automatique: "Automatique",
      manuelle: "Manuelle",
      appartement: "Appartement",
      maison: "Maison",
      terrain: "Terrain",
      bois_massif: "Bois massif",
      velours: "Velours",
      cuir: "Cuir",
      tissu: "Tissu",
      metal: "Métal",
      cdi: "CDI",
      cdd: "CDD",
      temps_plein: "Temps plein",
      sur_place: "Sur place / À domicile",
      en_ligne: "En ligne / À distance",
    };

    const valStr = String(value).trim().toLowerCase();
    if (quickDict[valStr]) {
      return quickDict[valStr];
    }

    if (FALLBACK_VALUE_LABELS[valStr]) {
      return FALLBACK_VALUE_LABELS[valStr];
    }

    // Unknown imported enums should still be readable. Preserve meaningful
    // punctuation while turning storage values such as `m_38` into `M 38`.
    const readable = String(value)
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
    if (readable && readable === readable.toLowerCase()) {
      return readable.replace(/^([a-zà-ÿ])/u, (letter) => letter.toUpperCase());
    }

    return String(value);
  }

  private inferGroupKey(key: string): string {
    if (
      key.startsWith("vehicle.") ||
      key.includes("mileage") ||
      key.includes("fuel") ||
      key.includes("gearbox")
    )
      return "performance";
    if (
      key.startsWith("real_estate.") ||
      key.includes("surface") ||
      key.includes("rooms") ||
      key.includes("floor")
    )
      return "property";
    if (key.includes("energy") || key.includes("ges") || key.includes("dpe"))
      return "energy";
    if (
      key.includes("width") ||
      key.includes("height") ||
      key.includes("depth") ||
      key.includes("dimensions") ||
      key.includes("material")
    )
      return "dimensions";
    if (
      key.includes("salary") ||
      key.includes("contract") ||
      key.includes("experience")
    )
      return "employment";
    if (
      key.includes("power") ||
      key.includes("storage") ||
      key.includes("ram") ||
      key.includes("battery")
    )
      return "technical";
    return "general";
  }

  private formatFallbackLabel(key: string): string {
    const clean = key
      .replace(
        /^(product|vehicle|real_estate|electronics|home|fashion|service|job)\./,
        "",
      )
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[-\s]+/g, "_")
      .toLowerCase();

    if (FALLBACK_ATTRIBUTE_LABELS[clean]) {
      return FALLBACK_ATTRIBUTE_LABELS[clean];
    }

    return clean
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  /**
   * Generates Schema.org compliant JSON-LD structured data for SEO.
   */
  generateListingStructuredData(
    listing: Listing,
    seller?: UserProfile | null,
    effectiveMarket?: MarketConfiguration,
  ): Record<string, any> {
    const currency =
      listing.currency ||
      effectiveMarket?.localization.defaultCurrency ||
      getCountryConfig(
        listing.marketCode ||
          currentBrowserMarketCode() ||
          getDefaultCountryConfig().marketCode,
      )?.currency ||
      getDefaultCountryConfig().currency;
    const photos = listing.photos
      .map((p) => (typeof p === "string" ? p : p.url))
      .filter(Boolean);
    const listingUrl = publicListingUrl({
      listingId: listing.id,
      countryCode:
        listing.marketCode ||
        currentBrowserMarketCode() ||
        getDefaultCountryConfig().marketCode,
    });

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: listing.title,
      description: listing.description,
      image: photos,
      sku: listing.id,
      offers: {
        "@type": "Offer",
        url: listingUrl,
        priceCurrency: currency,
        price: listing.price,
        availability:
          listing.status === "active"
            ? "https://schema.org/InStock"
            : "https://schema.org/SoldOut",
        itemCondition:
          listing.condition === "new_with_tag"
            ? "https://schema.org/NewCondition"
            : "https://schema.org/UsedCondition",
        seller: {
          "@type": seller?.role === "pro_seller" ? "Organization" : "Person",
          name: seller?.name || listing.sellerName,
        },
      },
    };
  }

  /**
   * Generates SEO meta tags (title, description, canonical).
   */
  generateListingSeoMeta(
    listing: Listing,
    node?: TaxonomyNode | null,
    effectiveMarket?: MarketConfiguration,
  ): ListingSeoMetadata {
    const currency =
      listing.currency ||
      effectiveMarket?.localization.defaultCurrency ||
      getCountryConfig(
        listing.marketCode ||
          currentBrowserMarketCode() ||
          getDefaultCountryConfig().marketCode,
      )?.currency ||
      getDefaultCountryConfig().currency;
    const priceStr = listing.isFreeDonation
      ? "Don gratuit"
      : `${listing.price} ${currency === "EUR" ? "€" : currency}`;
    const categoryName = node?.name || listing.categoryLabel;
    const listingUrl = publicListingUrl({
      listingId: listing.id,
      countryCode:
        listing.marketCode ||
        currentBrowserMarketCode() ||
        getDefaultCountryConfig().marketCode,
    });

    const title = `${listing.title} - ${priceStr} à ${listing.city} | Shongre`;
    const description = `${listing.title} en vente à ${listing.city} (${listing.postalCode}) pour ${priceStr}. Retrouvez toutes les annonces ${categoryName} sur Shongre.`;

    return {
      title,
      description,
      canonicalUrl: listingUrl,
      jsonLd: this.generateListingStructuredData(
        listing,
        null,
        effectiveMarket,
      ),
    };
  }
}

export const listingDisplayResolver = new ListingDisplayResolver();
