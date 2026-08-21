/**
 * SHONGRE LISTING DISPLAY & CHARACTERISTICS RESOLVER
 * Authoritative engine translating raw listing attributes and taxonomy metadata
 * into structured, grouped, unit-aware, and localized presentation models.
 */

import { Listing, UserProfile } from "../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
  ListingFamily,
} from "../taxonomy/taxonomy.types";
import { taxonomyService } from "../taxonomy/taxonomy.service";
import { ATTRIBUTE_REGISTRY } from "../taxonomy/attribute.registry";
import { CONDITION_SCHEMES } from "../taxonomy/condition.schemes";
import { CONDITION_OPTIONS } from "../../configuration/market.config";
import { MarketConfiguration } from "../market/market.types";
import { activeDataLocale } from "../../i18n/localized";

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
      taxonomyService.getNode(listing.subCategorySlug) ||
      taxonomyService.getNode(listing.categorySlug);
    const family: ListingFamily = effectiveNode
      ? taxonomyService.getFamily(effectiveNode.id)
      : "physical_product";

    // 1. Domain-specific prioritizations
    if (family === "vehicle") {
      if (attrs.year) summary.push(`${attrs.year}`);
      if (attrs.mileage !== undefined) {
        const formattedKm = String(attrs.mileage).replace(
          /\B(?=(\d{3})+(?!\d))/g,
          " ",
        );
        summary.push(`${formattedKm} km`);
      }
      if (attrs.fuel) summary.push(this.formatOptionLabel("fuel", attrs.fuel));
      if (attrs.gearbox)
        summary.push(this.formatOptionLabel("gearbox", attrs.gearbox));
      if (attrs.critair) summary.push(`Crit'Air ${attrs.critair}`);
    } else if (family === "real_estate") {
      if (attrs.property_type)
        summary.push(
          this.formatOptionLabel("property_type", attrs.property_type),
        );
      if (attrs.surface !== undefined) summary.push(`${attrs.surface} m²`);
      if (attrs.rooms !== undefined)
        summary.push(`${attrs.rooms} pièce${attrs.rooms > 1 ? "s" : ""}`);
      if (attrs.bedrooms !== undefined) summary.push(`${attrs.bedrooms} ch.`);
      if (attrs.energy_class)
        summary.push(`DPE ${String(attrs.energy_class).toUpperCase()}`);
    } else if (family === "service") {
      if (attrs.service_type)
        summary.push(
          this.formatOptionLabel("service_type", attrs.service_type),
        );
      if (attrs.location_type)
        summary.push(
          this.formatOptionLabel("location_type", attrs.location_type),
        );
      if (attrs.experience_years)
        summary.push(`${attrs.experience_years} ans d'exp.`);
    } else if (family === "job") {
      if (attrs.contract_type)
        summary.push(
          this.formatOptionLabel("contract_type", attrs.contract_type),
        );
      if (attrs.work_rhythm)
        summary.push(this.formatOptionLabel("work_rhythm", attrs.work_rhythm));
      if (attrs.remote_policy)
        summary.push(
          this.formatOptionLabel("remote_policy", attrs.remote_policy),
        );
    } else {
      // Physical Products (Smartphones, Furniture, Fashion, Appliances)
      if (attrs.storage_capacity) {
        const optLabel = this.formatOptionLabel(
          "storage_capacity",
          attrs.storage_capacity,
        );
        summary.push(
          optLabel.includes("Go") || optLabel.includes("To")
            ? optLabel
            : `${optLabel} Go`,
        );
      }
      if (attrs.material)
        summary.push(this.formatOptionLabel("material", attrs.material));
      if (attrs.size) summary.push(`Taille ${attrs.size}`);
      if (attrs.dimensions) summary.push(String(attrs.dimensions));
      if (attrs.color)
        summary.push(this.formatOptionLabel("color", attrs.color));
    }

    // 2. Condition fallback if not yet full and condition exists
    if (
      listing.condition &&
      family === "physical_product" &&
      summary.length < 3
    ) {
      const conditionLabel = this.resolveConditionLabel(
        listing.condition,
        effectiveNode,
      );
      if (conditionLabel && !summary.includes(conditionLabel)) {
        summary.push(conditionLabel);
      }
    }

    // 3. Fallback to node's summaryAttributeIds if summary is still empty
    if (summary.length === 0 && effectiveNode?.summaryAttributeIds) {
      effectiveNode.summaryAttributeIds.forEach((attrId) => {
        const attrDef = ATTRIBUTE_REGISTRY[attrId];
        const code = attrDef ? attrDef.code : attrId.split(".").pop() || attrId;
        const val = attrs[code] ?? attrs[attrId];
        if (val !== undefined && val !== null && val !== "") {
          summary.push(this.formatAttributeValue(attrDef, val));
        }
      });
    }

    return summary.slice(0, 5);
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
      taxonomyService.getNode(listing.subCategorySlug) ||
      taxonomyService.getNode(listing.categorySlug);
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
    };

    const result: GroupedCharacteristics[] = [];
    const orderedGroupKeys = [
      "general",
      "performance",
      "engine",
      "specifications",
      "technical",
      "property",
      "energy",
      "dimensions",
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

    if (attrDef?.options) {
      const opt = attrDef.options.find(
        (o) =>
          o.value === val ||
          String(o.value).toLowerCase() === String(val).toLowerCase(),
      );
      if (opt) return opt.label;
    }

    if (typeof val === "number") {
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

    return this.formatOptionLabel(attrDef?.id || "", val);
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

    const valStr = String(value).toLowerCase();
    if (quickDict[valStr]) {
      return quickDict[valStr];
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
    const clean = key.replace(
      /^(product|vehicle|real_estate|electronics|home|fashion|service|job)\./,
      "",
    );
    return clean.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
      "EUR";
    const photos = listing.photos
      .map((p) => (typeof p === "string" ? p : p.url))
      .filter(Boolean);
    const listingUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `https://shongre.fr/annonce/${listing.id}`;

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
      "EUR";
    const priceStr = listing.isFreeDonation
      ? "Don gratuit"
      : `${listing.price} ${currency === "EUR" ? "€" : currency}`;
    const categoryName = node?.name || listing.categoryLabel;
    const listingUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `https://shongre.fr/annonce/${listing.id}`;

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
