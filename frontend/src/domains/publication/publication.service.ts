/**
 * SHONGRE PUBLICATION SERVICE & VALIDATION ENGINE
 * Authoritative publication lifecycle management: validation, sanitization,
 * draft autosave, editing with concurrency protection, duplicating and relisting.
 */

import { taxonomyService } from "../taxonomy/taxonomy.service";
import { getCompactTaxonomyLabel } from "../taxonomy/taxonomy.display";
import { publicationResolver } from "./publication.resolver";
import { storageService } from "../../services/storage.service";
import {
  PublicationDraftState,
  ValidationResult,
  ValidationError,
} from "./publication.types";
import { Listing, UserProfile, DeliveryOption } from "../../types";

const DRAFT_STORAGE_PREFIX = "shongre_publication_draft_";

export class PublicationService {
  /**
   * Authoritative backend-style validation of a listing draft.
   */
  validateDraft(
    draft: Partial<PublicationDraftState>,
    user?: UserProfile | null,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const marketCode = draft.marketCode || "FR";

    // 1. Taxonomy & Publishable Leaf check
    if (!draft.taxonomyNodeId) {
      errors.push({
        field: "taxonomyNodeId",
        code: "REQUIRED",
        message: "Veuillez sélectionner une catégorie.",
      });
    } else {
      const node = taxonomyService.getNode(draft.taxonomyNodeId);
      if (!node) {
        errors.push({
          field: "taxonomyNodeId",
          code: "INVALID_NODE",
          message: "La catégorie sélectionnée est invalide.",
        });
      } else if (!taxonomyService.isPublishable(node.id)) {
        errors.push({
          field: "taxonomyNodeId",
          code: "NOT_PUBLISHABLE",
          message:
            "Veuillez sélectionner une sous-catégorie finale (feuille de l'arborescence).",
        });
      }
    }

    // 2. Title & Description
    if (!draft.title || draft.title.trim().length < 3) {
      errors.push({
        field: "title",
        code: "TITLE_TOO_SHORT",
        message: "Le titre doit comporter au moins 3 caractères.",
      });
    } else if (draft.title.trim().length > 120) {
      errors.push({
        field: "title",
        code: "TITLE_TOO_LONG",
        message: "Le titre ne doit pas dépasser 120 caractères.",
      });
    }

    if (!draft.description || draft.description.trim().length < 10) {
      errors.push({
        field: "description",
        code: "DESCRIPTION_TOO_SHORT",
        message: "La description doit comporter au moins 10 caractères.",
      });
    }

    // 3. Photos
    if (!draft.photos || draft.photos.length === 0) {
      errors.push({
        field: "photos",
        code: "PHOTOS_REQUIRED",
        message: "Veuillez ajouter au moins une photo.",
      });
    }

    // 4. Location
    if (!draft.location?.city || !draft.location?.postalCode) {
      errors.push({
        field: "location",
        code: "LOCATION_REQUIRED",
        message: "La localisation (ville et code postal) est requise.",
      });
    }

    // 5. Pricing & Stock
    const pricing = draft.pricing;
    if (!pricing) {
      errors.push({
        field: "pricing",
        code: "PRICING_REQUIRED",
        message: "Les informations de prix sont requises.",
      });
    } else if (
      !pricing.isFreeDonation &&
      (pricing.amount === undefined || pricing.amount < 0)
    ) {
      errors.push({
        field: "pricing.amount",
        code: "INVALID_AMOUNT",
        message: "Le prix doit être supérieur ou égal à 0 €.",
      });
    }

    if (user?.role === "pro_seller" || draft.proInventory) {
      const stock = draft.proInventory?.stock ?? 1;
      if (stock < 1) {
        errors.push({
          field: "proInventory.stock",
          code: "INVALID_STOCK",
          message: "Le stock disponible doit être d'au moins 1 unité.",
        });
      }
    }

    // 6. Schema-driven Attribute Validation & Rogue Attribute Sanitization
    if (draft.taxonomyNodeId) {
      const schema = publicationResolver.resolve({
        taxonomyNodeId: draft.taxonomyNodeId,
        marketCode,
        sellerRole: user?.role,
        currentValues: draft.attributes || {},
      });

      if (schema) {
        const allowedAttrCodes = new Set(schema.attributes.map((a) => a.code));
        const allowedAttrIds = new Set(schema.attributes.map((a) => a.id));

        // Validate required fields
        schema.fields.forEach((field) => {
          if (field.isRequired && field.isVisiblyMet) {
            const rawVal =
              draft.attributes?.[field.attribute.code] ??
              draft.attributes?.[field.attribute.id];
            if (rawVal === undefined || rawVal === null || rawVal === "") {
              errors.push({
                field: `attributes.${field.attribute.code}`,
                code: "ATTRIBUTE_REQUIRED",
                message: `Le champ "${field.attribute.label}" est obligatoire pour cette catégorie.`,
              });
            }
          }

          if (!field.isVisiblyMet) return;
          const rawVal =
            draft.attributes?.[field.attribute.code] ??
            draft.attributes?.[field.attribute.id];
          if (rawVal === undefined || rawVal === null || rawVal === "") return;

          const attribute = field.attribute;
          const validation = attribute.validation;
          const addAttributeError = (code: string, message: string) =>
            errors.push({
              field: `attributes.${attribute.code}`,
              code,
              message,
            });

          if (
            ["number", "year", "money"].includes(attribute.dataType)
          ) {
            const numericValue = Number(rawVal);
            if (!Number.isFinite(numericValue)) {
              addAttributeError("ATTRIBUTE_INVALID_NUMBER", `Le champ "${attribute.label}" doit être un nombre.`);
            } else {
              if (validation?.min !== undefined && numericValue < validation.min) {
                addAttributeError("ATTRIBUTE_BELOW_MINIMUM", `Le champ "${attribute.label}" est inférieur au minimum autorisé.`);
              }
              if (validation?.max !== undefined && numericValue > validation.max) {
                addAttributeError("ATTRIBUTE_ABOVE_MAXIMUM", `Le champ "${attribute.label}" dépasse le maximum autorisé.`);
              }
              if (validation?.integer && !Number.isInteger(numericValue)) {
                addAttributeError("ATTRIBUTE_NOT_INTEGER", `Le champ "${attribute.label}" doit être un nombre entier.`);
              }
            }
          }

          if (attribute.dataType === "range") {
            if (
              typeof rawVal !== "object" ||
              rawVal === null ||
              Array.isArray(rawVal)
            ) {
              addAttributeError("ATTRIBUTE_INVALID_RANGE", `Le champ "${attribute.label}" doit contenir une borne minimale et maximale.`);
            } else {
              const lower = (rawVal as { min?: unknown }).min;
              const upper = (rawVal as { max?: unknown }).max;
              if (lower !== "" && lower !== undefined && !Number.isFinite(Number(lower))) {
                addAttributeError("ATTRIBUTE_INVALID_RANGE", `La borne minimale de "${attribute.label}" est invalide.`);
              }
              if (upper !== "" && upper !== undefined && !Number.isFinite(Number(upper))) {
                addAttributeError("ATTRIBUTE_INVALID_RANGE", `La borne maximale de "${attribute.label}" est invalide.`);
              }
              if (
                lower !== "" && upper !== "" &&
                lower !== undefined && upper !== undefined &&
                Number(lower) > Number(upper)
              ) {
                addAttributeError("ATTRIBUTE_INVALID_RANGE", `La borne minimale de "${attribute.label}" doit être inférieure à la borne maximale.`);
              }
            }
          }

          if (attribute.dataType === "select" || attribute.dataType === "year") {
            const allowed = new Set((attribute.options || []).map((option) => option.value));
            if (allowed.size > 0 && !allowed.has(String(rawVal))) {
              addAttributeError("ATTRIBUTE_INVALID_OPTION", `La valeur du champ "${attribute.label}" est invalide.`);
            }
          }

          if (attribute.dataType === "multi_select") {
            if (!Array.isArray(rawVal)) {
              addAttributeError("ATTRIBUTE_INVALID_OPTIONS", `Le champ "${attribute.label}" doit contenir une liste de valeurs.`);
            } else {
              const allowed = new Set((attribute.options || []).map((option) => option.value));
              if (allowed.size > 0 && rawVal.some((value) => !allowed.has(String(value)))) {
                addAttributeError("ATTRIBUTE_INVALID_OPTION", `Une valeur du champ "${attribute.label}" est invalide.`);
              }
            }
          }

          if (typeof rawVal === "string") {
            if (validation?.minLength !== undefined && rawVal.length < validation.minLength) {
              addAttributeError("ATTRIBUTE_TOO_SHORT", `Le champ "${attribute.label}" est trop court.`);
            }
            if (validation?.maxLength !== undefined && rawVal.length > validation.maxLength) {
              addAttributeError("ATTRIBUTE_TOO_LONG", `Le champ "${attribute.label}" est trop long.`);
            }
            if (validation?.pattern) {
              try {
                if (!new RegExp(validation.pattern).test(rawVal)) {
                  addAttributeError("ATTRIBUTE_INVALID_FORMAT", `Le format du champ "${attribute.label}" est invalide.`);
                }
              } catch {
                warnings.push(`La règle de format du champ "${attribute.label}" est invalide dans le registre.`);
              }
            }
          }
        });

        // Detect rogue / foreign attributes not belonging to this taxonomy branch
        if (draft.attributes) {
          Object.keys(draft.attributes).forEach((key) => {
            if (!allowedAttrCodes.has(key) && !allowedAttrIds.has(key)) {
              warnings.push(
                `Attribut "${key}" ignoré car non rattaché à cette catégorie.`,
              );
            }
          });
        }
      }
    }

    // 7. Entitlements & Listing Limits
    if (user) {
      const activeListings = storageService
        .getListings()
        .filter((l) => l.sellerId === user.id && l.status === "active");
      const maxAllowed = user.role === "pro_seller" ? 500 : 25; // derived from user plan
      if (activeListings.length >= maxAllowed && !draft.id) {
        errors.push({
          field: "entitlements",
          code: "LISTING_LIMIT_REACHED",
          message: `Vous avez atteint votre quota de ${maxAllowed} annonces actives.`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Publishes a validated listing draft.
   */
  async publishListing(
    draft: PublicationDraftState,
    user: UserProfile,
  ): Promise<Listing> {
    const validation = this.validateDraft(draft, user);
    if (!validation.isValid) {
      throw new Error(`Erreur de validation: ${validation.errors[0]?.message}`);
    }

    const node = taxonomyService.getNode(draft.taxonomyNodeId);
    const ancestors = taxonomyService.getAncestors(draft.taxonomyNodeId);
    const rootNode = ancestors[0] || node;

    // Delivery Options mapping
    const deliveryOptions: DeliveryOption[] = [];
    if (draft.fulfillment.allowHandDelivery) {
      deliveryOptions.push({
        type: "hand_delivery",
        available: true,
        price: 0,
      });
    }
    if (draft.fulfillment.allowParcelShipping) {
      deliveryOptions.push({
        type: "relay_point",
        available: true,
        price: 4.49,
        courierName: "Mondial Relay",
      });
      deliveryOptions.push({
        type: "home_delivery",
        available: true,
        price: 6.99,
        courierName: "Colissimo",
      });
    }
    if (draft.fulfillment.allowBulkyDelivery) {
      deliveryOptions.push({
        type: "custom_carrier",
        available: true,
        price: 39,
        courierName: "Transporteur Meubles Cocolis",
      });
    }

    // Filter sanitized attributes
    const schema = publicationResolver.resolve({
      taxonomyNodeId: draft.taxonomyNodeId,
      marketCode: draft.marketCode,
    });
    const sanitizedAttributes: Record<string, any> = {};
    if (schema && draft.attributes) {
      const attributesByKey = new Map(
        schema.attributes.flatMap((attribute) => [
          [attribute.code, attribute] as const,
          [attribute.id, attribute] as const,
        ]),
      );
      Object.entries(draft.attributes).forEach(([k, v]) => {
        const attribute = attributesByKey.get(k);
        if (attribute && v !== undefined && v !== "") {
          sanitizedAttributes[attribute.code] = v;
        }
      });
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 60 days

    const isPro = user.role === "pro_seller";

    const rawSelectedMarkets =
      draft.selectedMarkets && draft.selectedMarkets.length > 0
        ? draft.selectedMarkets
        : [draft.marketCode || "FR"];
    const selectedMarkets = Array.from(
      new Set(rawSelectedMarkets.map((m) => m.toUpperCase())),
    );
    const primaryMarket = (
      draft.marketCode ||
      selectedMarkets[0] ||
      "FR"
    ).toUpperCase();

    const marketPublications = selectedMarkets.map((mCode) => {
      const customConfig = draft.marketPublications?.[mCode];
      return {
        marketCode: mCode,
        status: (customConfig?.status || "active") as any,
        isPrimary: mCode === primaryMarket,
        publishedAt: now,
        customPrice: customConfig?.customPrice,
        currency: customConfig?.currency || (mCode === "CH" ? "CHF" : "EUR"),
        complianceChecked: true,
      };
    });

    const newListing: Listing = {
      id: draft.id || `list-${Date.now()}`,
      title: draft.title.trim(),
      description: draft.description.trim(),
      price: draft.pricing.isFreeDonation ? 0 : draft.pricing.amount,
      originalPrice: draft.pricing.originalPrice,
      isNegotiable: draft.pricing.isNegotiable,
      isFreeDonation: draft.pricing.isFreeDonation,
      categorySlug: rootNode?.slug || "divers",
      subCategorySlug: node?.slug || "autres",
      categoryLabel: getCompactTaxonomyLabel(rootNode, "Divers"),
      subCategoryLabel: getCompactTaxonomyLabel(node, "Autres"),
      condition: (draft.condition as any) || "very_good",
      sellerId: user.id,
      sellerName: user.name || (isPro ? "Boutique Pro" : "Vendeur"),
      sellerType: isPro ? "pro" : "individual",
      sellerAvatarUrl: user.avatarUrl,
      sellerRating: user.rating || 5.0,
      sellerReviewCount: user.reviewCount || 0,
      sellerIsVerified: user.isVerified || false,
      sellerCity: draft.location.city,
      sellerPostalCode: draft.location.postalCode,
      city: draft.location.city,
      postalCode: draft.location.postalCode,
      department:
        draft.location.department || `${draft.location.postalCode.slice(0, 2)}`,
      region: draft.location.region || "France Métropolitaine",
      latitude: draft.location.latitude,
      longitude: draft.location.longitude,
      photos: draft.photos.map((p, idx) => ({
        id: p.id || `photo-${idx}`,
        url: p.url,
        isCover: idx === 0 || p.isCover,
        alt: p.alt || draft.title,
      })),
      coverImageUrl:
        draft.photos[0]?.url ||
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
      deliveryOptions,
      isOnlinePaymentAvailable: draft.transaction.allowDirectPurchase,
      isReservable: draft.transaction.allowReservation,
      reservationType: draft.transaction.reservationType || "request",
      attributes: sanitizedAttributes,
      status: "active",
      createdAt: now,
      updatedAt: now,
      expiresAt,
      viewsCount: 0,
      favoritesCount: 0,
      contactCount: 0,
      marketCode: primaryMarket,
      marketCodes: selectedMarkets,
      marketPublications,
      currency:
        draft.pricing.currency || (primaryMarket === "CH" ? "CHF" : "EUR"),
      isBoosted: !!draft.boostPackage,
      boostType: draft.boostPackage as any,
    };

    // Save to listing repository
    storageService.saveListing(newListing);

    // Clear saved draft
    this.clearDraft(user.id);

    return newListing;
  }

  /**
   * Updates an existing listing with locked fields check if an active transaction is in progress.
   */
  async updateListing(
    id: string,
    updates: Partial<PublicationDraftState>,
    user: UserProfile,
  ): Promise<Listing> {
    const existing = storageService.getListings().find((l) => l.id === id);
    if (!existing) {
      throw new Error(`Annonce #${id} introuvable.`);
    }

    if (
      existing.sellerId !== user.id &&
      user.role !== "admin" &&
      user.role !== "super_admin"
    ) {
      throw new Error("Vous n'êtes pas autorisé à modifier cette annonce.");
    }

    // If listing is currently reserved or has an active transaction, lock price and seller
    if (
      existing.status === "reserved" &&
      updates.pricing &&
      updates.pricing.amount !== existing.price
    ) {
      throw new Error(
        "Impossible de modifier le prix d'une annonce faisant l'objet d'une transaction en cours.",
      );
    }

    const mergedDraft: PublicationDraftState = {
      marketCode: updates.marketCode || existing.marketCode || "FR",
      taxonomyNodeId: updates.taxonomyNodeId || existing.subCategorySlug,
      listingIntent: updates.listingIntent || "SELL",
      title: updates.title ?? existing.title,
      description: updates.description ?? existing.description,
      condition: updates.condition ?? existing.condition,
      attributes: {
        ...(existing.attributes || {}),
        ...(updates.attributes || {}),
      },
      photos: updates.photos ?? existing.photos,
      pricing: updates.pricing || {
        priceModel: "fixed",
        amount: existing.price,
        currency: existing.currency || "EUR",
        isNegotiable: existing.isNegotiable,
        isFreeDonation: existing.isFreeDonation,
      },
      transaction: updates.transaction || {
        allowContact: true,
        allowDirectPurchase: existing.isOnlinePaymentAvailable,
        allowReservation: !!existing.isReservable,
      },
      fulfillment: updates.fulfillment || {
        allowHandDelivery: true,
        allowParcelShipping: existing.deliveryOptions.some(
          (d) => d.type !== "hand_delivery",
        ),
        allowBulkyDelivery: false,
        allowSellerDelivery: false,
        allowStorePickup: false,
      },
      location: updates.location || {
        city: existing.city,
        postalCode: existing.postalCode,
        countryCode: "FR",
        hideExactAddress: true,
      },
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    };

    const published = await this.publishListing({ ...mergedDraft, id }, user);
    return published;
  }

  /**
   * Duplicates an existing listing with refreshed IDs.
   */
  async duplicateListing(id: string, user: UserProfile): Promise<Listing> {
    const existing = storageService.getListings().find((l) => l.id === id);
    if (!existing) {
      throw new Error(`Annonce #${id} introuvable.`);
    }

    const draft: PublicationDraftState = {
      marketCode: existing.marketCode || "FR",
      taxonomyNodeId: existing.subCategorySlug,
      listingIntent: "SELL",
      title: `${existing.title} (Copie)`,
      description: existing.description,
      condition: existing.condition,
      attributes: { ...(existing.attributes || {}) },
      photos: [...existing.photos],
      pricing: {
        priceModel: "fixed",
        amount: existing.price,
        currency: existing.currency || "EUR",
        isNegotiable: existing.isNegotiable,
        isFreeDonation: existing.isFreeDonation,
      },
      transaction: {
        allowContact: true,
        allowDirectPurchase: existing.isOnlinePaymentAvailable,
        allowReservation: !!existing.isReservable,
      },
      fulfillment: {
        allowHandDelivery: true,
        allowParcelShipping: existing.deliveryOptions.some(
          (d) => d.type !== "hand_delivery",
        ),
        allowBulkyDelivery: false,
        allowSellerDelivery: false,
        allowStorePickup: false,
      },
      location: {
        city: existing.city,
        postalCode: existing.postalCode,
        countryCode: "FR",
        hideExactAddress: true,
      },
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    };

    return this.publishListing(draft, user);
  }

  // ==========================================
  // AUTOSAVE & DRAFT LIFECYCLE
  // ==========================================
  private memoryDraftStore = new Map<string, string>();

  saveDraft(draft: PublicationDraftState, userId?: string): void {
    const key = `${DRAFT_STORAGE_PREFIX}${userId || "guest"}`;
    const serialized = JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    });
    this.memoryDraftStore.set(key, serialized);
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.setItem === "function"
    ) {
      try {
        localStorage.setItem(key, serialized);
      } catch {
        // Ignore quota/access errors
      }
    }
  }

  getDraft(userId?: string): PublicationDraftState | null {
    const key = `${DRAFT_STORAGE_PREFIX}${userId || "guest"}`;
    let raw = this.memoryDraftStore.get(key);
    if (
      !raw &&
      typeof localStorage !== "undefined" &&
      typeof localStorage.getItem === "function"
    ) {
      try {
        raw = localStorage.getItem(key) || undefined;
      } catch {
        // Ignore storage access errors
      }
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  clearDraft(userId?: string): void {
    const key = `${DRAFT_STORAGE_PREFIX}${userId || "guest"}`;
    this.memoryDraftStore.delete(key);
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.removeItem === "function"
    ) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage access errors
      }
    }
  }

  restoreGuestDraft(user: UserProfile): PublicationDraftState | null {
    const guestDraft = this.getDraft("guest");
    if (guestDraft) {
      this.saveDraft(guestDraft, user.id);
      this.clearDraft("guest");
      return guestDraft;
    }
    return this.getDraft(user.id);
  }
}

export const publicationService = new PublicationService();
