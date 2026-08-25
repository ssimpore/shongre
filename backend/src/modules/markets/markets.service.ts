import { CountryMarketDefinition } from "../../shared/types/index.js";
import { z } from "zod";
import {
  countryCodeSchema,
  marketLaunchStatusSchema,
} from "@shongre/contracts";
import {
  IMarketRepository,
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
    primaryDomain: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/)
      .optional(),
    basePath: z
      .string()
      .regex(/^\/$|^\/[a-z0-9-]+$/)
      .optional(),
    defaultLocale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
    supportedLocales: z
      .array(z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/))
      .min(1)
      .max(12)
      .optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    currencySymbol: z.string().trim().min(1).max(10).optional(),
    timezone: z.string().trim().min(3).max(80).optional(),
    phoneCountryCode: z.string().regex(/^\+[1-9]\d{0,3}$/).optional(),
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

export class MarketsService {
  constructor(private marketRepo: IMarketRepository = repositories.markets) {}

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
    return this.marketRepo.getEffective(code);
  }

  async updateCountryConfiguration(
    code: string,
    input: unknown,
    actorId: string,
  ): Promise<CountryMarketDefinition> {
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
    const patch = countryConfigurationPatchSchema.parse(input || {});
    const candidate = { ...current, ...patch } as CountryMarketDefinition;

    if (!candidate.supportedLocales.includes(candidate.defaultLocale)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La langue par défaut doit faire partie des langues activées.",
      });
    }
    if (candidate.code === "FR" && candidate.basePath !== "/") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La France doit conserver la racine canonique de shongre.fr.",
      });
    }
    if (candidate.code !== "FR" && candidate.basePath === "/") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La racine internationale est réservée au portail global.",
      });
    }
    if (
      candidate.launchStatus === "active" &&
      candidate.compliance.legalReviewRequired &&
      candidate.compliance.legalReviewStatus !== "approved"
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "La revue juridique doit être approuvée avant l’activation.",
      });
    }
    if (candidate.payments.enabled && candidate.payments.providerIds.length === 0) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un marché avec paiements actifs doit déclarer un fournisseur.",
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
        market.primaryDomain === candidate.primaryDomain &&
        market.basePath === candidate.basePath,
    );
    if (duplicate) {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette combinaison domaine/chemin est déjà utilisée.",
      });
    }

    const updated = await this.marketRepo.updateConfiguration(
      normalizedCode,
      patch as Partial<CountryMarketDefinition>,
    );
    await this.marketRepo.recordConfigurationAudit({
      marketCode: normalizedCode,
      actorId,
      changedFields: Object.keys(patch),
      previousVersion: current.version || 1,
      newVersion: updated.version || (current.version || 1) + 1,
    });
    logger.info(
      JSON.stringify({
        event: "market.configuration.updated",
        country: normalizedCode,
        actorId,
        version: updated.version,
      }),
    );
    return updated;
  }
}

export const marketsService = new MarketsService();
