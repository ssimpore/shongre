import { CountryMarketDefinition } from "../../shared/types/index.js";
import { z } from "zod";
import {
  countryCodeSchema,
  getDefaultCountryConfig,
  MARKET_CONFIGURATION_REASON_MAX_LENGTH,
  MARKET_CONFIGURATION_REASON_MIN_LENGTH,
  marketActivationIssues,
  marketLaunchStatusSchema,
} from "@shongre/contracts";
import {
  IMarketRepository,
  ICurrencyRepository,
  MarketConfigurationChangeRequest,
  repositories,
  CANONICAL_DEMO_MARKETS,
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../infrastructure/logging/logger.js";

export const CANONICAL_MARKETS = CANONICAL_DEMO_MARKETS;

const countryConfigurationPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    nativeName: z.string().trim().min(2).max(120).optional(),
    enabled: z.boolean().optional(),
    launchStatus: marketLaunchStatusSchema.optional(),
    canonicalDomainMode: z.enum(["france", "international"]).optional(),
    basePath: z
      .string()
      .regex(/^\/$|^\/[a-z0-9-]+$/)
      .optional(),
    defaultLocale: z
      .string()
      .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/)
      .optional(),
    supportedLocales: z
      .array(z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/))
      .min(1)
      .max(12)
      .optional(),
    supportedCurrencies: z
      .array(z.string().regex(/^[A-Z]{3}$/))
      .min(1)
      .max(24)
      .refine((values) => new Set(values).size === values.length)
      .optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    currencySymbol: z.string().trim().min(1).max(10).optional(),
    timezone: z.string().trim().min(3).max(80).optional(),
    phoneCountryCode: z
      .string()
      .regex(/^\+[1-9]\d{0,3}$/)
      .optional(),
    addressFormat: z.string().trim().min(3).max(200).optional(),
    legalEntity: z.string().trim().min(2).max(160).optional(),
    seo: z
      .object({
        indexable: z.boolean(),
        hreflang: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
      })
      .optional(),
    marketplace: z
      .object({
        enabled: z.boolean(),
        crossBorderSearch: z.boolean(),
      })
      .optional(),
    payments: z
      .object({
        enabled: z.boolean(),
        providerIds: z.array(z.string().regex(/^[a-z0-9._-]+$/)).max(20),
      })
      .optional(),
    taxes: z
      .object({
        mode: z.enum(["configured", "legal_review_required"]),
        pricingIncludesTax: z.boolean(),
        defaultVatRateBps: z.number().int().min(0).max(10_000).nullable(),
      })
      .optional(),
    monetization: z
      .object({
        enabled: z.boolean(),
        catalogMarketCode: countryCodeSchema,
      })
      .optional(),
    compliance: z
      .object({
        legalReviewRequired: z.boolean(),
        legalReviewStatus: z.enum(["approved", "pending"]),
        minimumAge: z.number().int().min(13).max(21),
        kycPolicy: z.enum(["progressive", "restricted"]),
      })
      .optional(),
    launchContent: z
      .object({
        title: z.string().trim().min(3).max(120),
        description: z.string().trim().min(10).max(500),
        earlyAccessEnabled: z.boolean(),
      })
      .optional(),
    gatewayVisible: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(10_000).optional(),
    protectionFeeRate: z.number().min(0).max(1).optional(),
    protectionFixedFee: z.number().min(0).max(10_000).optional(),
    freeListingsLimit: z.number().int().min(0).max(1_000_000).optional(),
    reservationDepositRateBps: z.number().int().min(0).max(10_000).optional(),
    reservationDepositMinimumMinor: z.number().int().min(0).optional(),
    reservationDepositMaximumMinor: z.number().int().min(0).optional(),
    allowedDeliveryMethods: z
      .array(
        z.enum([
          "hand_delivery",
          "relay_point",
          "home_delivery",
          "cocolis",
          "express",
        ]),
      )
      .min(1)
      .optional(),
  })
  .strict();

const marketConfigurationReasonSchema = z
  .string()
  .trim()
  .min(MARKET_CONFIGURATION_REASON_MIN_LENGTH)
  .max(MARKET_CONFIGURATION_REASON_MAX_LENGTH);

const countryConfigurationChangeSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    reason: marketConfigurationReasonSchema,
    patch: countryConfigurationPatchSchema.refine(
      (value) => Object.keys(value).length > 0,
      "Au moins un champ doit être modifié.",
    ),
  })
  .strict();

const marketReviewSchema = z
  .object({ reason: marketConfigurationReasonSchema })
  .strict();

export class MarketsService {
  constructor(
    private marketRepo: IMarketRepository = repositories.markets,
    private currencyRepo: ICurrencyRepository = repositories.currencies,
  ) {}

  async getAllMarkets(): Promise<CountryMarketDefinition[]> {
    return this.marketRepo.getAll();
  }

  async getMarketByCode(code: string): Promise<CountryMarketDefinition | null> {
    return this.marketRepo.getByCode(code);
  }

  async getActiveMarket(): Promise<CountryMarketDefinition> {
    return this.marketRepo.getActive();
  }

  async setActiveMarket(code: string): Promise<CountryMarketDefinition> {
    return this.marketRepo.setActive(code);
  }

  async getEffectiveMarketConfig(
    code: string,
  ): Promise<CountryMarketDefinition> {
    const normalizedCode = countryCodeSchema.parse(
      String(code || "")
        .trim()
        .toUpperCase(),
    );
    const market = await this.marketRepo.getByCode(normalizedCode);
    if (!market) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Marché introuvable.",
      });
    }
    return this.marketRepo.getEffective(normalizedCode);
  }

  async updateCountryConfiguration(
    code: string,
    input: unknown,
    actorId: string,
  ): Promise<MarketConfigurationChangeRequest> {
    const normalizedCode = countryCodeSchema.parse(
      String(code || "").toUpperCase(),
    );
    const current = await this.marketRepo.getByCode(normalizedCode);
    if (!current) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Marché introuvable.",
      });
    }
    const change = countryConfigurationChangeSchema.parse(input || {});
    if ((current.version || 1) !== change.expectedVersion) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "La configuration du marché a changé. Rechargez-la avant de continuer.",
      });
    }
    const patch = change.patch;
    const candidate = { ...current, ...patch } as CountryMarketDefinition;

    if (!candidate.supportedLocales.includes(candidate.defaultLocale)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La langue par défaut doit faire partie des langues activées.",
      });
    }
    if (!candidate.supportedCurrencies.includes(candidate.currency)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La devise par défaut doit faire partie des devises d’affichage activées pour ce marché.",
      });
    }
    const currencyCatalog = await this.currencyRepo.getCatalog(true);
    const enabledCurrencies = new Set(
      currencyCatalog.currencies
        .filter((currency) => currency.enabled)
        .map((currency) => currency.code),
    );
    const unavailableCurrencies = candidate.supportedCurrencies.filter(
      (currency) => !enabledCurrencies.has(currency),
    );
    if (unavailableCurrencies.length > 0) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Les devises suivantes sont inconnues ou désactivées : ${unavailableCurrencies.join(", ")}.`,
      });
    }
    if (candidate.isDefault && candidate.basePath !== "/") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le marché par défaut doit conserver la racine canonique.",
      });
    }
    const defaultCountry = getDefaultCountryConfig();
    if (
      (candidate.isDefault &&
        candidate.canonicalDomainMode !== defaultCountry.canonicalDomainMode) ||
      (!candidate.isDefault &&
        candidate.canonicalDomainMode === defaultCountry.canonicalDomainMode)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le mode de domaine canonique ne correspond pas au marché.",
      });
    }
    if (!candidate.isDefault && candidate.basePath === "/") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La racine internationale est réservée au portail global.",
      });
    }
    const activationIssues = marketActivationIssues(candidate);
    if (activationIssues.length > 0) {
      throw new AppError({
        code: "CONFLICT",
        message: `Le marché ne peut pas être activé. La revue juridique et les autres contrôles de préparation doivent être approuvés. Configuration incomplète : ${activationIssues.join(", ")}.`,
      });
    }
    if (
      candidate.payments.enabled &&
      candidate.payments.providerIds.length === 0
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Un marché avec paiements actifs doit déclarer un fournisseur.",
      });
    }
    if (
      candidate.reservationDepositMinimumMinor >
      candidate.reservationDepositMaximumMinor
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le dépôt minimum ne peut pas dépasser le dépôt maximum.",
      });
    }

    const duplicate = (await this.marketRepo.getAll()).find(
      (market) =>
        market.code !== candidate.code &&
        market.canonicalDomainMode === candidate.canonicalDomainMode &&
        market.basePath === candidate.basePath,
    );
    if (duplicate) {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette combinaison domaine/chemin est déjà utilisée.",
      });
    }

    const request = await this.marketRepo.requestConfigurationChange(
      normalizedCode,
      {
        current,
        candidate,
        changedFields: Object.keys(patch),
        expectedVersion: change.expectedVersion,
        reason: change.reason,
      },
      actorId,
    );
    logger.info(
      JSON.stringify({
        event: "market.configuration.change_requested",
        country: normalizedCode,
        actorId,
        requestId: request.id,
        baseVersion: request.baseVersion,
      }),
    );
    return request;
  }

  async listCountryConfigurationChanges(code: string) {
    const normalizedCode = countryCodeSchema.parse(
      String(code || "").toUpperCase(),
    );
    return this.marketRepo.listConfigurationChanges(normalizedCode);
  }

  async approveCountryConfigurationChange(
    requestId: string,
    actorId: string,
    input: unknown,
  ): Promise<CountryMarketDefinition> {
    const review = marketReviewSchema.parse(input || {});
    const updated = await this.marketRepo.approveConfigurationChange(
      requestId,
      actorId,
      review.reason,
    );
    logger.info("market_configuration_change_approved", {
      requestId,
      actorId,
      marketCode: updated.code,
      version: updated.version,
    });
    return updated;
  }

  async rejectCountryConfigurationChange(
    requestId: string,
    actorId: string,
    input: unknown,
  ): Promise<{ rejected: true }> {
    const review = marketReviewSchema.parse(input || {});
    await this.marketRepo.rejectConfigurationChange(
      requestId,
      actorId,
      review.reason,
    );
    logger.info("market_configuration_change_rejected", {
      requestId,
      actorId,
    });
    return { rejected: true };
  }
}

export const marketsService = new MarketsService();
