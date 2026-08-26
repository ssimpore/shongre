import {
  Market,
  MarketConfiguration,
  MarketGeography,
  MarketStatus,
  SettingResolution,
  MarketInheritanceMetrics,
} from "./market.types";
import {
  createSafeMarketPolicy,
  INITIAL_MARKETS,
} from "./market.defaults";
import {
  normalizePriceFilterStops,
  normalizeRecentSearchesLimit,
} from "./market.constants";
import {
  marketResolver,
  setNestedValue,
  getNestedValue,
} from "./market.resolver";
import { storageService } from "../../services/storage.service";
import { auditService } from "../../security/audit.service";
import { taxonomyService } from "../taxonomy/taxonomy.service";
import {
  MarketEligibilityResult,
  MultiMarketValidationResult,
  PublicationDraftState,
  ValidationError,
} from "../publication/publication.types";
import { UserProfile } from "../../types";

/**
 * Market Service - High Level Business Engine for Market Management & Resolution
 */
export class MarketService {
  /**
   * Retrieves all registered markets with persistence from storage
   */
  public getMarkets(): Market[] {
    const markets = storageService.getMarkets();
    if (!markets || markets.length === 0) {
      storageService.saveMarkets(INITIAL_MARKETS);
      return INITIAL_MARKETS;
    }
    return markets;
  }

  /**
   * Returns only publicly active markets
   */
  public getActiveMarkets(): Market[] {
    return this.getMarkets().filter(
      (market) => market.status === "active" || market.status === "beta",
    );
  }

  /**
   * Retrieves a market by its country/market code (e.g. 'FR', 'BE', 'ES', 'CH')
   */
  public getMarket(code?: string): Market {
    const markets = this.getMarkets();
    const normalized = (code || this.getDefaultMarket().code).toUpperCase();
    const found = markets.find((m) => m.code.toUpperCase() === normalized);
    if (!found) throw new Error(`Unsupported market [${normalized}].`);
    return found;
  }

  /**
   * Retrieves a market by code (alias for getMarket)
   */
  public getMarketByCode(code?: string): Market | undefined {
    if (!code) return undefined;
    const markets = this.getMarkets();
    const normalized = code.toUpperCase();
    return markets.find((m) => m.code.toUpperCase() === normalized);
  }

  /**
   * Returns the canonical default market configured by the market registry.
   */
  public getDefaultMarket(): Market {
    const markets = this.getMarkets();
    const defaultMarket = markets.find((m) => m.isDefault);
    if (defaultMarket) return defaultMarket;
    return (
      INITIAL_MARKETS.find((market) => market.isDefault) || INITIAL_MARKETS[0]
    );
  }

  /**
   * Resolves the complete effective MarketConfiguration for a given market code
   */
  public getEffectiveConfig(marketCode?: string): MarketConfiguration {
    const targetMarket = this.getMarket(marketCode);
    const resolved = marketResolver.resolveEffectiveConfig(targetMarket);
    return {
      ...resolved,
      search: {
        ...resolved.search,
        priceFilterStopsMajor: normalizePriceFilterStops(
          resolved.search?.priceFilterStopsMajor,
        ),
      },
    };
  }

  /**
   * Resolves a single setting with full provenance metadata
   */
  public resolveSetting<T = any>(
    marketCode: string,
    path: string,
  ): SettingResolution<T> {
    const targetMarket = this.getMarket(marketCode);
    const baselineMarket = this.getDefaultMarket();
    return marketResolver.resolveSetting<T>(targetMarket, baselineMarket, path);
  }

  /**
   * Returns explicit-configuration coverage metrics for the admin UI.
   */
  public getInheritanceMetrics(marketCode: string): MarketInheritanceMetrics {
    const targetMarket = this.getMarket(marketCode);
    return marketResolver.getInheritanceMetrics(targetMarket);
  }

  /**
   * Explicit market policies never propagate a change to another market.
   */
  public getImpactedMarkets(settingPath: string): string[] {
    const allMarkets = this.getMarkets();
    return marketResolver.getImpactedMarkets(settingPath, allMarkets);
  }

  /**
   * Updates or sets an override on a specific setting path
   */
  public updateMarketOverride(
    marketCode: string,
    path: string,
    value: any,
    actor?: { id: string; name: string; role: string },
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex(
      (m) => m.code.toUpperCase() === marketCode.toUpperCase(),
    );
    if (targetIdx < 0) {
      throw new Error(`Market [${marketCode}] not found.`);
    }

    const market = markets[targetIdx];
    const valueToPersist =
      path === "features.recentSearchesLimit"
        ? normalizeRecentSearchesLimit(value)
        : path === "search.priceFilterStopsMajor"
          ? normalizePriceFilterStops(value)
          : value;
    const prevValue = getNestedValue(market.configuration, path);
    const updatedConfiguration = structuredClone(market.configuration);
    setNestedValue(updatedConfiguration, path, valueToPersist);

    const updatedMarket: Market = {
      ...market,
      configuration: updatedConfiguration,
      updatedAt: new Date().toISOString(),
      version: market.version + 1,
    };

    markets[targetIdx] = updatedMarket;
    storageService.saveMarkets(markets);

    // Audit log
    auditService.logEvent({
      actorId: actor?.id || "admin-system",
      actorName: actor?.name || "Administrateur",
      actorRole: (actor?.role as any) || "admin",
      action: "market_scope_updated",
      details: `Surcharge configurée pour le marché [${market.name}] sur la clé [${path}] : ${JSON.stringify(valueToPersist)}`,
      previousValue: prevValue,
      newValue: valueToPersist,
      market: market.code,
    });

    return updatedMarket;
  }

  /**
   * Restores one setting from this market's reviewed seed policy.
   */
  public resetMarketOverride(
    marketCode: string,
    path: string,
    actor?: { id: string; name: string; role: string },
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex(
      (m) => m.code.toUpperCase() === marketCode.toUpperCase(),
    );
    if (targetIdx < 0) {
      throw new Error(`Market [${marketCode}] not found.`);
    }

    const market = markets[targetIdx];
    if (market.isDefault) {
      throw new Error(
        "Cannot reset overrides on the canonical default market.",
      );
    }

    const seed = INITIAL_MARKETS.find((entry) => entry.code === market.code);
    const seedValue = seed
      ? getNestedValue(seed.configuration, path)
      : undefined;
    if (seedValue === undefined)
      throw new Error(`No safe seed value exists for [${path}].`);
    const prevValue = getNestedValue(market.configuration, path);
    const updatedConfiguration = structuredClone(market.configuration);
    setNestedValue(updatedConfiguration, path, structuredClone(seedValue));

    const updatedMarket: Market = {
      ...market,
      configuration: updatedConfiguration,
      updatedAt: new Date().toISOString(),
      version: market.version + 1,
    };

    markets[targetIdx] = updatedMarket;
    storageService.saveMarkets(markets);

    // Audit log
    auditService.logEvent({
      actorId: actor?.id || "admin-system",
      actorName: actor?.name || "Administrateur",
      actorRole: (actor?.role as any) || "admin",
      action: "market_scope_updated",
      details: `Réinitialisation de [${path}] sur la politique locale validée de [${market.name}].`,
      previousValue: prevValue,
      newValue: seedValue,
      market: market.code,
    });

    return updatedMarket;
  }

  /**
   * Restores the complete reviewed seed policy for one market.
   */
  public resetAllOverridesToBaseline(
    marketCode: string,
    actor?: { id: string; name: string; role: string },
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex(
      (m) => m.code.toUpperCase() === marketCode.toUpperCase(),
    );
    if (targetIdx < 0) {
      throw new Error(`Market [${marketCode}] not found.`);
    }

    const market = markets[targetIdx];
    if (market.isDefault) {
      throw new Error("Cannot reset the canonical default market.");
    }

    const seed = INITIAL_MARKETS.find((entry) => entry.code === market.code);
    if (!seed)
      throw new Error(`No safe seed policy exists for [${market.code}].`);
    const updatedMarket: Market = {
      ...market,
      configuration: structuredClone(seed.configuration),
      updatedAt: new Date().toISOString(),
      version: market.version + 1,
    };

    markets[targetIdx] = updatedMarket;
    storageService.saveMarkets(markets);

    auditService.logEvent({
      actorId: actor?.id || "admin-system",
      actorName: actor?.name || "Administrateur",
      actorRole: (actor?.role as any) || "admin",
      action: "market_scope_updated",
      details: `La politique du marché [${market.name}] a été restaurée depuis sa configuration locale validée.`,
      market: market.code,
    });

    return updatedMarket;
  }

  /**
   * Updates the complete market lifecycle exposed by the country registry.
   */
  public updateMarketStatus(
    marketCode: string,
    status: MarketStatus,
    actor?: { id: string; name: string; role: string },
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex(
      (m) => m.code.toUpperCase() === marketCode.toUpperCase(),
    );
    if (targetIdx < 0) {
      throw new Error(`Market [${marketCode}] not found.`);
    }

    const market = markets[targetIdx];
    if (market.isDefault && status !== "active") {
      throw new Error(
        "The configured default market must always remain active.",
      );
    }

    const updatedMarket: Market = {
      ...market,
      status,
      updatedAt: new Date().toISOString(),
    };

    markets[targetIdx] = updatedMarket;
    storageService.saveMarkets(markets);

    auditService.logEvent({
      actorId: actor?.id || "admin-system",
      actorName: actor?.name || "Administrateur",
      actorRole: (actor?.role as any) || "admin",
      action: "market_scope_updated",
      details: `Statut du marché [${market.name}] mis à jour : [${status.toUpperCase()}]`,
      previousValue: market.status,
      newValue: status,
      market: market.code,
    });

    return updatedMarket;
  }

  public updateMarketRouting(
    marketCode: string,
    routing: NonNullable<Market["routing"]>,
    actor?: { id: string; name: string; role: string },
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex(
      (market) => market.code === marketCode.toUpperCase(),
    );
    if (targetIdx < 0) throw new Error(`Market [${marketCode}] not found.`);
    const primaryDomain = routing.primaryDomain.trim().toLowerCase();
    const basePath = routing.basePath.trim() || "/";
    if (
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(
        primaryDomain,
      )
    ) {
      throw new Error("Le domaine public n’est pas valide.");
    }
    if (!/^\/$|^\/[a-z0-9-]+$/.test(basePath)) {
      throw new Error("Le préfixe doit être / ou /code-pays.");
    }
    if (markets[targetIdx].isDefault && basePath !== "/") {
      throw new Error(
        "Le marché par défaut doit rester publié à la racine de son domaine.",
      );
    }
    if (!markets[targetIdx].isDefault && basePath === "/") {
      throw new Error("La racine shongre.com est réservée au portail global.");
    }
    if (
      markets.some(
        (market, index) =>
          index !== targetIdx &&
          market.routing?.primaryDomain === primaryDomain &&
          market.routing?.basePath === basePath,
      )
    ) {
      throw new Error("Cette combinaison domaine/chemin est déjà utilisée.");
    }
    const current = markets[targetIdx];
    const updated: Market = {
      ...current,
      routing: { ...routing, primaryDomain, basePath },
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };
    markets[targetIdx] = updated;
    storageService.saveMarkets(markets);
    auditService.logEvent({
      actorId: actor?.id || "admin-system",
      actorName: actor?.name || "Administrateur",
      actorRole: (actor?.role as any) || "admin",
      action: "market_scope_updated",
      details: `Routage canonique du marché [${current.code}] mis à jour.`,
      previousValue: current.routing,
      newValue: updated.routing,
      market: current.code,
    });
    return updated;
  }

  /**
   * Creates a fail-closed draft with a complete local policy.
   */
  public createMarket(
    data: {
      code: string;
      name: string;
      flag: string;
      defaultLocale: string;
      supportedLocales?: string[];
      currency: string;
      currencySymbol?: string;
      timezone: string;
      status?: MarketStatus;
      geography?: MarketGeography;
    },
    actor?: { id: string; name: string; role: string },
  ): Market {
    const markets = this.getMarkets();
    const normalizedCode = data.code.toUpperCase().trim();

    if (markets.some((m) => m.code === normalizedCode)) {
      throw new Error(`A market with code [${normalizedCode}] already exists.`);
    }

    const newMarket: Market = {
      id: `market-${normalizedCode.toLowerCase()}`,
      code: normalizedCode,
      countryCode: normalizedCode,
      name: data.name.trim(),
      flag: data.flag || "🌐",
      status: data.status || "draft",
      isDefault: false,
      defaultLocale: data.defaultLocale,
      supportedLocales: data.supportedLocales || [
        data.defaultLocale,
      ],
      currency: data.currency.toUpperCase(),
      currencySymbol:
        data.currencySymbol || data.currency.toUpperCase(),
      timezone: data.timezone,
      routing: {
        primaryDomain: "shongre.com",
        basePath: `/${normalizedCode.toLowerCase()}`,
        gatewayVisible: false,
        seoIndexable: false,
      },
      geography: data.geography || {
        allCountryEnabled: true,
        regions: [],
        popularCities: [],
      },
      configuration: createSafeMarketPolicy({
        name: data.name.trim(),
        defaultLocale: data.defaultLocale,
        supportedLocales: data.supportedLocales || [data.defaultLocale],
        currency: data.currency.toUpperCase(),
        currencySymbol: data.currencySymbol || data.currency.toUpperCase(),
        timezone: data.timezone,
        supportEmail: `support@shongre.com`,
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    markets.push(newMarket);
    storageService.saveMarkets(markets);

    auditService.logEvent({
      actorId: actor?.id || "admin-system",
      actorName: actor?.name || "Administrateur",
      actorRole: (actor?.role as any) || "admin",
      action: "market_scope_updated",
      details: `Création du nouveau marché [${newMarket.name}] (${newMarket.code}) avec capacités réglementées désactivées par défaut`,
      newValue: newMarket,
      market: newMarket.code,
    });

    return newMarket;
  }

  // ==========================================
  // TAXONOMY PER MARKET & MULTI-MARKET ELIGIBILITY
  // ==========================================

  /**
   * Checks whether a given taxonomy category / subcategory node is available in a market
   */
  public isCategoryEnabledInMarket(
    marketCode: string,
    categoryIdOrSlug: string,
  ): boolean {
    const config = this.getEffectiveConfig(marketCode);
    const disabledSlugs = (config.taxonomy?.disabledCategorySlugs || []).map(
      (s) => s.toLowerCase(),
    );
    const disabledSubSlugs = (
      config.taxonomy?.disabledSubCategorySlugs || []
    ).map((s) => s.toLowerCase());

    const targetKey = categoryIdOrSlug.toLowerCase();
    if (
      disabledSlugs.includes(targetKey) ||
      disabledSubSlugs.includes(targetKey)
    ) {
      return false;
    }

    // Resolve node and check its ancestors
    const node =
      taxonomyService.getNode(categoryIdOrSlug) ||
      taxonomyService.getNodeBySlug(categoryIdOrSlug);
    if (!node) return true;

    if (
      disabledSlugs.includes(node.slug.toLowerCase()) ||
      disabledSlugs.includes(node.id.toLowerCase())
    ) {
      return false;
    }
    if (
      disabledSubSlugs.includes(node.slug.toLowerCase()) ||
      disabledSubSlugs.includes(node.id.toLowerCase())
    ) {
      return false;
    }

    // Check ancestors
    const ancestors = taxonomyService.getAncestors(node.id);
    for (const anc of ancestors) {
      if (
        disabledSlugs.includes(anc.slug.toLowerCase()) ||
        disabledSlugs.includes(anc.id.toLowerCase())
      ) {
        return false;
      }
      if (
        disabledSubSlugs.includes(anc.slug.toLowerCase()) ||
        disabledSubSlugs.includes(anc.id.toLowerCase())
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sets category availability in a market (adds or removes from disabled lists)
   */
  public setCategoryEnabledInMarket(
    marketCode: string,
    categorySlugOrId: string,
    enabled: boolean,
    isSubCategory = false,
    actor?: { id: string; name: string; role: string },
  ): Market {
    const market = this.getMarket(marketCode);
    const currentTaxonomy = market.configuration.taxonomy;
    const disabledCategories = new Set(
      currentTaxonomy.disabledCategorySlugs || [],
    );
    const disabledSubCategories = new Set(
      currentTaxonomy.disabledSubCategorySlugs || [],
    );

    const targetKey = categorySlugOrId.trim();

    if (isSubCategory) {
      if (enabled) {
        disabledSubCategories.delete(targetKey);
      } else {
        disabledSubCategories.add(targetKey);
      }
    } else {
      if (enabled) {
        disabledCategories.delete(targetKey);
      } else {
        disabledCategories.add(targetKey);
      }
    }

    const updatedTaxonomy = {
      ...currentTaxonomy,
      disabledCategorySlugs: Array.from(disabledCategories),
      disabledSubCategorySlugs: Array.from(disabledSubCategories),
    };

    return this.updateMarketOverride(
      marketCode,
      "taxonomy",
      updatedTaxonomy,
      actor,
    );
  }

  /**
   * Resolves list of all markets and their eligibility for a specific listing draft or seller
   */
  public getEligibleMarketsForListing(params: {
    seller?: UserProfile | null;
    categoryId?: string;
    subcategoryId?: string;
    subtypeId?: string;
    isPro?: boolean;
  }): MarketEligibilityResult[] {
    const allMarkets = this.getMarkets();
    const effectiveCategoryKey = params.subcategoryId || params.categoryId;

    return allMarkets.map((market) => {
      const config = this.getEffectiveConfig(market.code);
      const warnings: string[] = [];
      let isEligible = true;
      let ineligibilityReason: string | undefined;

      // 1. Market Status Check
      if (market.status !== "active" && market.status !== "beta") {
        isEligible = false;
        ineligibilityReason =
          market.status === "coming_soon"
            ? "Marché en cours de lancement"
            : market.status === "paused"
              ? "Marché temporairement suspendu"
              : "Marché inactif (brouillon ou archivé)";
      }

      // 2. Category Availability in Market Check
      if (isEligible && effectiveCategoryKey) {
        const isCatEnabled = this.isCategoryEnabledInMarket(
          market.code,
          effectiveCategoryKey,
        );
        if (!isCatEnabled) {
          isEligible = false;
          ineligibilityReason = `La catégorie sélectionnée n'est pas ouverte sur le marché ${market.name}.`;
        }
      }

      // 3. Pro Requirements & Legal verification
      const isProSeller =
        params.isPro ||
        params.seller?.role === "pro_seller" ||
        params.seller?.accountType === "professional";
      if (
        isEligible &&
        isProSeller &&
        config.pro?.requireKbis &&
        !params.seller?.isVerified
      ) {
        warnings.push(
          `Vérification pro requise (${config.pro.businessIdentifierLabel})`,
        );
      }

      // 4. Currency warning if different from default EUR
      if (
        config.localization.defaultCurrency !==
        this.getEffectiveConfig(this.getDefaultMarket().code).localization
          .defaultCurrency
      ) {
        warnings.push(
          `Devise locale : ${config.localization.defaultCurrency} (${config.localization.currencySymbol})`,
        );
      }

      // 5. Reservation warning if disabled
      if (!config.reservation.enabled) {
        warnings.push("Réservation avec acompte non disponible sur ce marché.");
      }

      return {
        marketCode: market.code,
        marketName: market.name,
        countryCode: market.countryCode,
        flag: market.flag,
        currency: config.localization.defaultCurrency,
        currencySymbol: config.localization.currencySymbol,
        status: market.status,
        isDefault: market.isDefault,
        isEligible,
        ineligibilityReason,
        warnings,
        features: {
          directPurchase: config.payments.enabled,
          reservation: config.reservation.enabled,
          handDelivery: config.delivery.handDeliveryEnabled,
          parcelShipping:
            config.delivery.enabled &&
            (config.delivery.carriers.mondialRelay.enabled ||
              config.delivery.carriers.colissimo.enabled),
          crossBorderDeliverySupported: true,
        },
      };
    });
  }

  /**
   * Validates a listing draft across multiple target markets
   */
  public validateListingForMarkets(params: {
    draft: Partial<PublicationDraftState>;
    marketCodes: string[];
    seller?: UserProfile | null;
  }): MultiMarketValidationResult {
    const { draft, marketCodes, seller } = params;
    const marketResults: MultiMarketValidationResult["marketResults"] = {};
    const globalErrors: ValidationError[] = [];
    const globalWarnings: string[] = [];

    if (!marketCodes || marketCodes.length === 0) {
      globalErrors.push({
        field: "selectedMarkets",
        code: "NO_MARKETS_SELECTED",
        message: "Veuillez sélectionner au moins un marché de diffusion.",
      });
    }

    const eligibilities = this.getEligibleMarketsForListing({
      seller,
      categoryId: draft.taxonomyNodeId,
      isPro: seller?.role === "pro_seller",
    });

    const eligMap = new Map(
      eligibilities.map((e) => [e.marketCode.toUpperCase(), e]),
    );

    let allMarketsValid = globalErrors.length === 0;

    marketCodes.forEach((mCode) => {
      const normalizedCode = mCode.toUpperCase();
      const market = this.getMarket(normalizedCode);
      const eligibility = eligMap.get(normalizedCode);
      const errors: ValidationError[] = [];
      const warnings: string[] = eligibility ? [...eligibility.warnings] : [];

      if (!eligibility || !eligibility.isEligible) {
        errors.push({
          field: `markets.${normalizedCode}`,
          code: "MARKET_INELIGIBLE",
          message:
            eligibility?.ineligibilityReason ||
            `Le marché ${market.name} n'est pas éligible.`,
        });
      }

      // Check category in this specific market
      if (
        draft.taxonomyNodeId &&
        !this.isCategoryEnabledInMarket(normalizedCode, draft.taxonomyNodeId)
      ) {
        errors.push({
          field: `markets.${normalizedCode}.category`,
          code: "CATEGORY_DISABLED_IN_MARKET",
          message: `La catégorie choisie n'est pas ouverte sur le marché ${market.name}.`,
        });
      }

      // Check transaction compatibility
      if (
        draft.transaction?.allowReservation &&
        !eligibility?.features.reservation
      ) {
        warnings.push(
          `La réservation sera désactivée pour ${market.name} (non supportée).`,
        );
      }

      const isMarketValid = errors.length === 0;
      if (!isMarketValid) {
        allMarketsValid = false;
      }

      marketResults[normalizedCode] = {
        marketCode: normalizedCode,
        marketName: market.name,
        flag: market.flag,
        isValid: isMarketValid,
        errors,
        warnings,
      };
    });

    return {
      isValid: allMarketsValid && globalErrors.length === 0,
      marketResults,
      globalErrors,
      globalWarnings,
    };
  }
}

export const marketService = new MarketService();
