import {
  Market,
  MarketConfiguration,
  MarketGeography,
  MarketStatus,
  SettingResolution,
  MarketInheritanceMetrics
  
} from './market.types';
import { INITIAL_MARKETS } from './market.defaults';
import {
  marketResolver,
  setNestedValue,
  deleteNestedValue,
  getNestedValue,
} from './market.resolver';
import { storageService } from '../../services/storage.service';
import { auditService } from '../../security/audit.service';
import { taxonomyService } from '../taxonomy/taxonomy.service';
import {
  MarketEligibilityResult,
  MultiMarketValidationResult,
  PublicationDraftState,
  ValidationError,
} from '../publication/publication.types';
import { UserProfile } from '../../types';

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
    return this.getMarkets().filter((m) => m.status === 'active');
  }

  /**
   * Retrieves a market by its country/market code (e.g. 'FR', 'BE', 'ES', 'CH')
   */
  public getMarket(code?: string): Market {
    const markets = this.getMarkets();
    const normalized = (code || 'FR').toUpperCase();
    const found = markets.find((m) => m.code.toUpperCase() === normalized);
    return found || this.getDefaultMarket();
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
   * Returns the canonical default market (France, FR)
   */
  public getDefaultMarket(): Market {
    const markets = this.getMarkets();
    const defaultMarket = markets.find((m) => m.isDefault && m.code === 'FR');
    if (defaultMarket) return defaultMarket;
    return markets.find((m) => m.code === 'FR') || INITIAL_MARKETS[0];
  }

  /**
   * Resolves the complete effective MarketConfiguration for a given market code
   */
  public getEffectiveConfig(marketCode?: string): MarketConfiguration {
    const targetMarket = this.getMarket(marketCode);
    const franceMarket = this.getDefaultMarket();
    return marketResolver.resolveEffectiveConfig(targetMarket, franceMarket);
  }

  /**
   * Resolves a single setting with full provenance metadata
   */
  public resolveSetting<T = any>(marketCode: string, path: string): SettingResolution<T> {
    const targetMarket = this.getMarket(marketCode);
    const franceMarket = this.getDefaultMarket();
    return marketResolver.resolveSetting<T>(targetMarket, franceMarket, path);
  }

  /**
   * Returns inheritance metrics (total, inherited, overridden, %)
   */
  public getInheritanceMetrics(marketCode: string): MarketInheritanceMetrics {
    const targetMarket = this.getMarket(marketCode);
    const franceMarket = this.getDefaultMarket();
    return marketResolver.getInheritanceMetrics(targetMarket, franceMarket);
  }

  /**
   * Identifies which other markets inherit a specific setting
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
    actor?: { id: string; name: string; role: string }
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex((m) => m.code.toUpperCase() === marketCode.toUpperCase());
    if (targetIdx < 0) {
      throw new Error(`Market [${marketCode}] not found.`);
    }

    const market = markets[targetIdx];
    const prevValue = getNestedValue(market.overrides, path);
    const updatedOverrides = { ...market.overrides };
    setNestedValue(updatedOverrides, path, value);

    const updatedMarket: Market = {
      ...market,
      overrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      version: market.version + 1,
    };

    markets[targetIdx] = updatedMarket;
    storageService.saveMarkets(markets);

    // Audit log
    auditService.logEvent({
      actorId: actor?.id || 'admin-system',
      actorName: actor?.name || 'Administrateur',
      actorRole: (actor?.role as any) || 'admin',
      action: 'market_scope_updated',
      details: `Surcharge configurée pour le marché [${market.name}] sur la clé [${path}] : ${JSON.stringify(value)}`,
      previousValue: prevValue,
      newValue: value,
      market: market.code,
    });

    return updatedMarket;
  }

  /**
   * Resets an override (deletes the local difference so it resumes dynamic inheritance from France)
   */
  public resetMarketOverride(
    marketCode: string,
    path: string,
    actor?: { id: string; name: string; role: string }
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex((m) => m.code.toUpperCase() === marketCode.toUpperCase());
    if (targetIdx < 0) {
      throw new Error(`Market [${marketCode}] not found.`);
    }

    const market = markets[targetIdx];
    if (market.isDefault || market.code === 'FR') {
      throw new Error('Cannot reset overrides on the canonical default France market.');
    }

    const prevValue = getNestedValue(market.overrides, path);
    const updatedOverrides = { ...market.overrides };
    deleteNestedValue(updatedOverrides, path);

    const updatedMarket: Market = {
      ...market,
      overrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
      version: market.version + 1,
    };

    markets[targetIdx] = updatedMarket;
    storageService.saveMarkets(markets);

    // Audit log
    auditService.logEvent({
      actorId: actor?.id || 'admin-system',
      actorName: actor?.name || 'Administrateur',
      actorRole: (actor?.role as any) || 'admin',
      action: 'market_scope_updated',
      details: `Réinitialisation de la surcharge sur [${path}] pour [${market.name}]. Reprise dynamique de l'héritage France.`,
      previousValue: prevValue,
      newValue: 'INHERITED_FROM_FRANCE',
      market: market.code,
    });

    return updatedMarket;
  }

  /**
   * Resets all overrides for a market, restoring 100% inheritance from France
   */
  public resetAllOverridesToFrance(
    marketCode: string,
    actor?: { id: string; name: string; role: string }
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex((m) => m.code.toUpperCase() === marketCode.toUpperCase());
    if (targetIdx < 0) {
      throw new Error(`Market [${marketCode}] not found.`);
    }

    const market = markets[targetIdx];
    if (market.isDefault || market.code === 'FR') {
      throw new Error('Cannot reset canonical France market.');
    }

    const updatedMarket: Market = {
      ...market,
      overrides: {},
      updatedAt: new Date().toISOString(),
      version: market.version + 1,
    };

    markets[targetIdx] = updatedMarket;
    storageService.saveMarkets(markets);

    auditService.logEvent({
      actorId: actor?.id || 'admin-system',
      actorName: actor?.name || 'Administrateur',
      actorRole: (actor?.role as any) || 'admin',
      action: 'market_scope_updated',
      details: `Toutes les surcharges du marché [${market.name}] ont été réinitialisées sur la France (100% hérité).`,
      market: market.code,
    });

    return updatedMarket;
  }

  /**
   * Updates market lifecycle status (draft, configured, coming_soon, active, paused, archived)
   */
  public updateMarketStatus(
    marketCode: string,
    status: MarketStatus,
    actor?: { id: string; name: string; role: string }
  ): Market {
    const markets = this.getMarkets();
    const targetIdx = markets.findIndex((m) => m.code.toUpperCase() === marketCode.toUpperCase());
    if (targetIdx < 0) {
      throw new Error(`Market [${marketCode}] not found.`);
    }

    const market = markets[targetIdx];
    if (market.isDefault && status !== 'active') {
      throw new Error('The default reference market (France) must always remain active.');
    }

    const updatedMarket: Market = {
      ...market,
      status,
      updatedAt: new Date().toISOString(),
    };

    markets[targetIdx] = updatedMarket;
    storageService.saveMarkets(markets);

    auditService.logEvent({
      actorId: actor?.id || 'admin-system',
      actorName: actor?.name || 'Administrateur',
      actorRole: (actor?.role as any) || 'admin',
      action: 'market_scope_updated',
      details: `Statut du marché [${market.name}] mis à jour : [${status.toUpperCase()}]`,
      previousValue: market.status,
      newValue: status,
      market: market.code,
    });

    return updatedMarket;
  }

  /**
   * Creates a new market inheriting 100% from France by default
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
      timezone?: string;
      status?: MarketStatus;
      geography?: MarketGeography;
    },
    actor?: { id: string; name: string; role: string }
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
      flag: data.flag || '🌐',
      status: data.status || 'draft',
      isDefault: false,
      defaultLocale: data.defaultLocale || 'fr-FR',
      supportedLocales: data.supportedLocales || [data.defaultLocale || 'fr-FR'],
      currency: data.currency.toUpperCase() || 'EUR',
      currencySymbol: data.currencySymbol || (data.currency === 'EUR' ? '€' : data.currency),
      timezone: data.timezone || 'Europe/Paris',
      geography: data.geography || {
        allCountryEnabled: true,
        regions: [],
        popularCities: [],
      },
      overrides: {
        general: {
          name: data.name.trim(),
          supportEmail: `support@shongre.${normalizedCode.toLowerCase()}`,
        },
        localization: {
          defaultLocale: data.defaultLocale,
          defaultCurrency: data.currency.toUpperCase(),
          currencySymbol: data.currencySymbol || (data.currency === 'EUR' ? '€' : data.currency),
          timezone: data.timezone || 'Europe/Paris',
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    markets.push(newMarket);
    storageService.saveMarkets(markets);

    auditService.logEvent({
      actorId: actor?.id || 'admin-system',
      actorName: actor?.name || 'Administrateur',
      actorRole: (actor?.role as any) || 'admin',
      action: 'market_scope_updated',
      details: `Création du nouveau marché [${newMarket.name}] (${newMarket.code}) avec héritage France`,
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
  public isCategoryEnabledInMarket(marketCode: string, categoryIdOrSlug: string): boolean {
    const config = this.getEffectiveConfig(marketCode);
    const disabledSlugs = (config.taxonomy?.disabledCategorySlugs || []).map((s) => s.toLowerCase());
    const disabledSubSlugs = (config.taxonomy?.disabledSubCategorySlugs || []).map((s) => s.toLowerCase());

    const targetKey = categoryIdOrSlug.toLowerCase();
    if (disabledSlugs.includes(targetKey) || disabledSubSlugs.includes(targetKey)) {
      return false;
    }

    // Resolve node and check its ancestors
    const node = taxonomyService.getNode(categoryIdOrSlug) || taxonomyService.getNodeBySlug(categoryIdOrSlug);
    if (!node) return true;

    if (disabledSlugs.includes(node.slug.toLowerCase()) || disabledSlugs.includes(node.id.toLowerCase())) {
      return false;
    }
    if (disabledSubSlugs.includes(node.slug.toLowerCase()) || disabledSubSlugs.includes(node.id.toLowerCase())) {
      return false;
    }

    // Check ancestors
    const ancestors = taxonomyService.getAncestors(node.id);
    for (const anc of ancestors) {
      if (disabledSlugs.includes(anc.slug.toLowerCase()) || disabledSlugs.includes(anc.id.toLowerCase())) {
        return false;
      }
      if (disabledSubSlugs.includes(anc.slug.toLowerCase()) || disabledSubSlugs.includes(anc.id.toLowerCase())) {
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
    actor?: { id: string; name: string; role: string }
  ): Market {
    const market = this.getMarket(marketCode);
    const currentOverrides = market.overrides || {};
    const currentTaxonomy = currentOverrides.taxonomy || {};
    const disabledCategories = new Set(currentTaxonomy.disabledCategorySlugs || []);
    const disabledSubCategories = new Set(currentTaxonomy.disabledSubCategorySlugs || []);

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
      'taxonomy',
      updatedTaxonomy,
      actor
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
      if (market.status !== 'active') {
        isEligible = false;
        ineligibilityReason =
          market.status === 'coming_soon'
            ? 'Marché en cours de lancement'
            : market.status === 'paused'
            ? 'Marché temporairement suspendu'
            : 'Marché inactif (brouillon ou archivé)';
      }

      // 2. Category Availability in Market Check
      if (isEligible && effectiveCategoryKey) {
        const isCatEnabled = this.isCategoryEnabledInMarket(market.code, effectiveCategoryKey);
        if (!isCatEnabled) {
          isEligible = false;
          ineligibilityReason = `La catégorie sélectionnée n'est pas ouverte sur le marché ${market.name}.`;
        }
      }

      // 3. Pro Requirements & Legal verification
      const isProSeller = params.isPro || params.seller?.role === 'pro_seller' || params.seller?.accountType === 'professional';
      if (isEligible && isProSeller && config.pro?.requireKbis && !params.seller?.isVerified) {
        warnings.push(`Vérification pro requise (${config.pro.businessIdentifierLabel})`);
      }

      // 4. Currency warning if different from default EUR
      if (config.localization.defaultCurrency !== 'EUR') {
        warnings.push(`Devise locale : ${config.localization.defaultCurrency} (${config.localization.currencySymbol})`);
      }

      // 5. Reservation warning if disabled
      if (!config.reservation.enabled) {
        warnings.push('Réservation avec acompte non disponible sur ce marché.');
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
          directPurchase: config.payments?.enabled ?? true,
          reservation: config.reservation?.enabled ?? true,
          handDelivery: config.delivery?.handDeliveryEnabled ?? true,
          parcelShipping: (config.delivery?.enabled ?? true) && ((config.delivery?.carriers?.mondialRelay?.enabled ?? false) || (config.delivery?.carriers?.colissimo?.enabled ?? false)),
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
    const marketResults: MultiMarketValidationResult['marketResults'] = {};
    const globalErrors: ValidationError[] = [];
    const globalWarnings: string[] = [];

    if (!marketCodes || marketCodes.length === 0) {
      globalErrors.push({
        field: 'selectedMarkets',
        code: 'NO_MARKETS_SELECTED',
        message: 'Veuillez sélectionner au moins un marché de diffusion.',
      });
    }

    const eligibilities = this.getEligibleMarketsForListing({
      seller,
      categoryId: draft.taxonomyNodeId,
      isPro: seller?.role === 'pro_seller',
    });

    const eligMap = new Map(eligibilities.map((e) => [e.marketCode.toUpperCase(), e]));

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
          code: 'MARKET_INELIGIBLE',
          message: eligibility?.ineligibilityReason || `Le marché ${market.name} n'est pas éligible.`,
        });
      }

      // Check category in this specific market
      if (draft.taxonomyNodeId && !this.isCategoryEnabledInMarket(normalizedCode, draft.taxonomyNodeId)) {
        errors.push({
          field: `markets.${normalizedCode}.category`,
          code: 'CATEGORY_DISABLED_IN_MARKET',
          message: `La catégorie choisie n'est pas ouverte sur le marché ${market.name}.`,
        });
      }

      // Check transaction compatibility
      if (draft.transaction?.allowReservation && !eligibility?.features.reservation) {
        warnings.push(`La réservation sera désactivée pour ${market.name} (non supportée).`);
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
