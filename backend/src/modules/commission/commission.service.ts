import {
  commissionAnalyticsQuerySchema,
  commissionCalculationInputSchema,
  commissionCalculationSchema,
  type CommissionAnalyticsQuery,
  type CommissionCalculationInput,
} from "@shongre/contracts/monetization";
import {
  calculateCommission,
  calculateCommissionReversal,
  commissionSnapshotHash,
} from "@shongre/shared";
import { config } from "../../app/config/index.js";
import {
  DemoCommissionRepository,
  PostgresCommissionRepository,
  type CommissionRepository,
} from "../../infrastructure/database/repositories/commission.repository.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  BusinessRulesService,
  businessRulesService,
} from "../business-rules/business-rules.service.js";

export class CommissionService {
  constructor(
    private readonly repository: CommissionRepository = config.dataMode ===
    "database"
      ? new PostgresCommissionRepository()
      : new DemoCommissionRepository(),
    private readonly commercialRules: Pick<
      BusinessRulesService,
      "getCatalog"
    > = businessRulesService,
  ) {}

  async preview(rawInput: CommissionCalculationInput) {
    const input = commissionCalculationInputSchema.parse({
      ...rawInput,
      transactionId: undefined,
      orderId: rawInput.orderId,
    });
    const catalog = await this.commercialRules.getCatalog(input.marketCode);
    const resolvedInput = commissionCalculationInputSchema.parse({
      ...input,
      verticalId:
        input.verticalId ||
        catalog.verticals.find((vertical) =>
          vertical.categoryIds.includes(input.categoryId || ""),
        )?.id,
    });
    return calculateCommission({
      configurationVersionId: catalog.configurationVersionId,
      policies: catalog.commissionPolicies,
      input: resolvedInput,
    });
  }

  /**
   * Records an earning-event calculation exactly once. Callers are trusted
   * backend domain services; public clients never provide rates or policies.
   */
  async record(rawInput: CommissionCalculationInput) {
    const input = commissionCalculationInputSchema.parse(rawInput);
    if (!input.transactionId || !input.idempotencyKey) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Une transaction et une clé d’idempotence sont requises pour comptabiliser la commission.",
      });
    }
    const existing = await this.repository.getCalculationByIdempotency(
      input.idempotencyKey,
    );
    if (existing) return existing;
    const catalog = await this.commercialRules.getCatalog(input.marketCode);
    const resolvedInput = commissionCalculationInputSchema.parse({
      ...input,
      verticalId:
        input.verticalId ||
        catalog.verticals.find((vertical) =>
          vertical.categoryIds.includes(input.categoryId || ""),
        )?.id,
    });
    const calculation = calculateCommission({
      configurationVersionId: catalog.configurationVersionId,
      policies: catalog.commissionPolicies,
      input: resolvedInput,
    });
    return this.repository.saveCalculation(calculation);
  }

  /**
   * Persists the immutable commercial quote used to price an order. A quote is
   * not revenue and never projects to the finance ledger.
   */
  async quote(rawInput: CommissionCalculationInput) {
    const input = commissionCalculationInputSchema.parse({
      ...rawInput,
      transactionId: undefined,
    });
    if (!input.orderId || !input.idempotencyKey) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Une commande et une clé d’idempotence sont requises pour verrouiller la commission.",
      });
    }
    const existing = await this.repository.getCalculationByIdempotency(
      input.idempotencyKey,
    );
    if (existing) return existing;
    const catalog = await this.commercialRules.getCatalog(input.marketCode);
    const resolvedInput = commissionCalculationInputSchema.parse({
      ...input,
      verticalId:
        input.verticalId ||
        catalog.verticals.find((vertical) =>
          vertical.categoryIds.includes(input.categoryId || ""),
        )?.id,
    });
    const calculation = calculateCommission({
      configurationVersionId: catalog.configurationVersionId,
      policies: catalog.commissionPolicies,
      input: resolvedInput,
    });
    return this.repository.saveCalculation(calculation);
  }

  /**
   * Earns a previously persisted quote without re-resolving today's catalog.
   * This prevents a policy deployment between checkout and payment from
   * changing an accepted commercial price.
   */
  async earnQuote(
    calculationId: string,
    input: {
      transactionId: string;
      idempotencyKey: string;
      effectiveAt: string;
    },
  ) {
    const existing = await this.repository.getCalculationByIdempotency(
      input.idempotencyKey,
    );
    if (existing) return existing;
    const quote = await this.getCalculation(calculationId);
    if (quote.state !== "quoted") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "La commission associée à la commande n’est pas un devis valide.",
      });
    }
    const earnedInput = commissionCalculationInputSchema.parse({
      ...quote.inputSnapshot,
      transactionId: input.transactionId,
      idempotencyKey: input.idempotencyKey,
      effectiveAt: input.effectiveAt,
      quoteExpiresAt: undefined,
    });
    const earnedSnapshot = {
      quoteSnapshotHash: quote.snapshotHash,
      transactionId: input.transactionId,
      idempotencyKey: input.idempotencyKey,
      effectiveAt: input.effectiveAt,
      input: earnedInput,
    };
    const snapshotHash = commissionSnapshotHash(earnedSnapshot);
    const earned = commissionCalculationSchema.parse({
      ...quote,
      id: `commission_${snapshotHash}`,
      idempotencyKey: input.idempotencyKey,
      transactionId: input.transactionId,
      state: "earned",
      inputSnapshot: earnedInput,
      calculatedAt: input.effectiveAt,
      expiresAt: undefined,
      snapshotHash,
    });
    return this.repository.saveCalculation(earned);
  }

  async getCalculation(calculationId: string) {
    const calculation = await this.repository.getCalculation(calculationId);
    if (!calculation) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Calcul de commission introuvable.",
      });
    }
    return calculation;
  }

  async reverse(
    calculationId: string,
    input: {
      refundBaseMinor: number;
      idempotencyKey: string;
      occurredAt?: string;
    },
  ) {
    const existing = await this.repository.getReversalByIdempotency(
      input.idempotencyKey,
    );
    if (existing) return existing;
    const calculation = await this.getCalculation(calculationId);
    const totals = await this.repository.getReversalTotals(calculationId);
    const remainingBaseMinor = Math.max(
      0,
      calculation.baseAmountMinor - totals.baseMinor,
    );
    if (
      input.refundBaseMinor <= 0 ||
      input.refundBaseMinor > remainingBaseMinor
    ) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le montant cumulé des annulations de commission dépasse la base historique restante.",
        details: { remainingBaseMinor },
      });
    }
    const reversal = calculateCommissionReversal({
      calculation,
      refundBaseMinor: input.refundBaseMinor,
      previouslyReversedBaseMinor: totals.baseMinor,
      previouslyReversedCommissionMinor: totals.commissionMinor,
      previouslyReversedTaxMinor: totals.taxMinor,
      previouslyCreditedSellerMinor: totals.sellerCreditMinor,
      previouslyCreditedBuyerMinor: totals.buyerCreditMinor,
      previouslyReversedRevenueMinor: totals.revenueMinor,
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.occurredAt || new Date().toISOString(),
    });
    return this.repository.saveReversal(reversal);
  }

  listAnalytics(rawQuery: CommissionAnalyticsQuery) {
    return this.repository.listAnalytics(
      commissionAnalyticsQuerySchema.parse(rawQuery),
    );
  }
}

export const commissionService = new CommissionService();
