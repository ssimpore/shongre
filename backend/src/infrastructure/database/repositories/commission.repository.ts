import {
  commissionAnalyticsRowSchema,
  commissionCalculationSchema,
  commissionReversalSchema,
  type CommissionAnalyticsQuery,
  type CommissionAnalyticsRow,
  type CommissionCalculation,
  type CommissionReversal,
} from "@shongre/contracts/monetization";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";

export interface CommissionRepository {
  getCalculation(id: string): Promise<CommissionCalculation | null>;
  getCalculationByIdempotency(
    idempotencyKey: string,
  ): Promise<CommissionCalculation | null>;
  saveCalculation(
    calculation: CommissionCalculation,
  ): Promise<CommissionCalculation>;
  saveReversal(reversal: CommissionReversal): Promise<CommissionReversal>;
  getReversalByIdempotency(
    idempotencyKey: string,
  ): Promise<CommissionReversal | null>;
  getReversalTotals(calculationId: string): Promise<CommissionReversalTotals>;
  listAnalytics(
    query: CommissionAnalyticsQuery,
  ): Promise<CommissionAnalyticsRow[]>;
}

export interface CommissionReversalTotals {
  baseMinor: number;
  commissionMinor: number;
  taxMinor: number;
  sellerCreditMinor: number;
  buyerCreditMinor: number;
  revenueMinor: number;
}

const EMPTY_REVERSAL_TOTALS: CommissionReversalTotals = {
  baseMinor: 0,
  commissionMinor: 0,
  taxMinor: 0,
  sellerCreditMinor: 0,
  buyerCreditMinor: 0,
  revenueMinor: 0,
};

export class DemoCommissionRepository implements CommissionRepository {
  private readonly calculations = new Map<string, CommissionCalculation>();
  private readonly calculationKeys = new Map<string, string>();
  private readonly reversals = new Map<string, CommissionReversal>();

  async getCalculation(id: string) {
    const calculation = this.calculations.get(id);
    return calculation ? structuredClone(calculation) : null;
  }

  async getCalculationByIdempotency(idempotencyKey: string) {
    const id = this.calculationKeys.get(idempotencyKey);
    return id ? this.getCalculation(id) : null;
  }

  async saveCalculation(calculation: CommissionCalculation) {
    if (calculation.idempotencyKey) {
      const existing = await this.getCalculationByIdempotency(
        calculation.idempotencyKey,
      );
      if (existing) return existing;
      this.calculationKeys.set(calculation.idempotencyKey, calculation.id);
    }
    this.calculations.set(calculation.id, structuredClone(calculation));
    return structuredClone(calculation);
  }

  async saveReversal(reversal: CommissionReversal) {
    const existing = await this.getReversalByIdempotency(
      reversal.idempotencyKey,
    );
    if (existing) return structuredClone(existing);
    this.reversals.set(reversal.id, structuredClone(reversal));
    return structuredClone(reversal);
  }

  async getReversalByIdempotency(idempotencyKey: string) {
    const reversal = [...this.reversals.values()].find(
      (candidate) => candidate.idempotencyKey === idempotencyKey,
    );
    return reversal ? structuredClone(reversal) : null;
  }

  async getReversalTotals(calculationId: string) {
    return [...this.reversals.values()]
      .filter(
        (reversal) =>
          reversal.calculationId === calculationId &&
          reversal.state !== "manual_review",
      )
      .reduce<CommissionReversalTotals>(
        (total, reversal) => ({
          baseMinor: total.baseMinor + reversal.reversedBaseMinor,
          commissionMinor:
            total.commissionMinor + reversal.reversedCommissionMinor,
          taxMinor: total.taxMinor + reversal.reversedTaxMinor,
          sellerCreditMinor:
            total.sellerCreditMinor + reversal.sellerCreditMinor,
          buyerCreditMinor: total.buyerCreditMinor + reversal.buyerCreditMinor,
          revenueMinor:
            total.revenueMinor + reversal.platformRevenueReversalMinor,
        }),
        { ...EMPTY_REVERSAL_TOTALS },
      );
  }

  async listAnalytics(query: CommissionAnalyticsQuery) {
    const rows = new Map<string, CommissionAnalyticsRow>();
    for (const calculation of this.calculations.values()) {
      if (
        !["earned", "partially_reversed", "reversed"].includes(
          calculation.state,
        )
      )
        continue;
      const input = calculation.inputSnapshot;
      const date = calculation.calculatedAt.slice(0, 10);
      if (date < query.from || date > query.to) continue;
      if (query.marketCode !== "ALL" && input.marketCode !== query.marketCode)
        continue;
      if (query.currency !== calculation.currency) continue;
      if (query.verticalId && input.verticalId !== query.verticalId) continue;
      if (query.categoryId && input.categoryId !== query.categoryId) continue;
      if (query.planId && input.planId !== query.planId) continue;
      const key = [
        date,
        input.marketCode,
        input.verticalId,
        input.categoryId,
        input.planId,
        calculation.currency,
      ].join(":");
      const row = rows.get(key) || {
        date,
        marketCode: input.marketCode,
        verticalId: input.verticalId,
        categoryId: input.categoryId,
        planId: input.planId,
        currency: calculation.currency,
        transactionCount: 0,
        gmvMinor: 0,
        grossCommissionMinor: 0,
        commissionDiscountMinor: 0,
        commissionRevenueMinor: 0,
        commissionRefundMinor: 0,
        effectiveTakeRateBps: 0,
      };
      row.transactionCount += 1;
      row.gmvMinor += input.itemSubtotalMinor;
      row.grossCommissionMinor += calculation.grossCommissionMinor;
      row.commissionDiscountMinor += calculation.adjustmentMinor;
      row.commissionRevenueMinor += calculation.platformRevenueMinor;
      rows.set(key, row);
    }
    for (const reversal of this.reversals.values()) {
      const calculation = this.calculations.get(reversal.calculationId);
      if (!calculation || reversal.state === "manual_review") continue;
      const date = calculation.calculatedAt.slice(0, 10);
      const row = [...rows.values()].find(
        (candidate) =>
          candidate.date === date &&
          candidate.marketCode === calculation.inputSnapshot.marketCode &&
          candidate.verticalId === calculation.inputSnapshot.verticalId &&
          candidate.categoryId === calculation.inputSnapshot.categoryId &&
          candidate.planId === calculation.inputSnapshot.planId &&
          candidate.currency === calculation.currency,
      );
      if (row)
        row.commissionRefundMinor += reversal.platformRevenueReversalMinor;
    }
    return [...rows.values()].map((row) =>
      commissionAnalyticsRowSchema.parse({
        ...row,
        effectiveTakeRateBps:
          row.gmvMinor === 0
            ? 0
            : Math.round(
                ((row.commissionRevenueMinor - row.commissionRefundMinor) *
                  10_000) /
                  row.gmvMinor,
              ),
      }),
    );
  }
}

function calculationFromRow(row: any) {
  return commissionCalculationSchema.parse(row.snapshot);
}

export class PostgresCommissionRepository implements CommissionRepository {
  private get client(): any {
    return getSupabaseAdminClient() as any;
  }

  async getCalculation(id: string) {
    const { data, error } = await this.client
      .from("commission_calculations")
      .select("snapshot")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? calculationFromRow(data) : null;
  }

  async getCalculationByIdempotency(idempotencyKey: string) {
    const { data, error } = await this.client
      .from("commission_calculations")
      .select("snapshot")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (error) throw error;
    return data ? calculationFromRow(data) : null;
  }

  async saveCalculation(calculation: CommissionCalculation) {
    if (calculation.idempotencyKey) {
      const existing = await this.getCalculationByIdempotency(
        calculation.idempotencyKey,
      );
      if (existing) return existing;
    }
    const input = calculation.inputSnapshot;
    const { error } = await this.client.from("commission_calculations").insert({
      id: calculation.id,
      idempotency_key: calculation.idempotencyKey || null,
      configuration_version_id: calculation.configurationVersionId,
      transaction_id: calculation.transactionId || null,
      order_id: calculation.orderId || null,
      account_id: input.sellerAccountId || null,
      organization_id: input.organizationId || null,
      policy_id: calculation.appliedPolicyId || null,
      policy_version_id: calculation.appliedPolicyVersionId || null,
      rule_id: calculation.appliedRuleId || null,
      state: calculation.state,
      eligible: calculation.eligible,
      reason_code: calculation.reasonCode,
      currency: calculation.currency,
      base_amount_minor: calculation.baseAmountMinor,
      gross_commission_minor: calculation.grossCommissionMinor,
      adjustment_minor: calculation.adjustmentMinor,
      net_commission_excluding_tax_minor:
        calculation.netCommissionExcludingTaxMinor,
      commission_tax_minor: calculation.commissionTaxMinor,
      total_commission_minor: calculation.totalCommissionMinor,
      seller_charge_minor: calculation.sellerChargeMinor,
      buyer_charge_minor: calculation.buyerChargeMinor,
      platform_absorbed_minor: calculation.platformAbsorbedMinor,
      platform_revenue_minor: calculation.platformRevenueMinor,
      seller_payable_minor: calculation.sellerPayableMinor,
      buyer_total_minor: calculation.buyerTotalMinor,
      applied_adjustment_rule_ids: calculation.appliedAdjustmentRuleIds,
      snapshot: calculation,
      snapshot_hash: calculation.snapshotHash,
      calculated_at: calculation.calculatedAt,
      expires_at: calculation.expiresAt || null,
    });
    if (error) {
      if (error.code === "23505" && calculation.idempotencyKey) {
        const existing = await this.getCalculationByIdempotency(
          calculation.idempotencyKey,
        );
        if (existing) return existing;
      }
      throw error;
    }
    return calculation;
  }

  async saveReversal(reversal: CommissionReversal) {
    const existing = await this.getReversalByIdempotency(
      reversal.idempotencyKey,
    );
    if (existing) return existing;
    const { error } = await this.client.from("commission_reversals").insert({
      id: reversal.id,
      calculation_id: reversal.calculationId,
      idempotency_key: reversal.idempotencyKey,
      reversed_base_minor: reversal.reversedBaseMinor,
      reversed_commission_minor: reversal.reversedCommissionMinor,
      reversed_tax_minor: reversal.reversedTaxMinor,
      seller_credit_minor: reversal.sellerCreditMinor,
      buyer_credit_minor: reversal.buyerCreditMinor,
      platform_revenue_reversal_minor: reversal.platformRevenueReversalMinor,
      state: reversal.state,
      snapshot: reversal,
      snapshot_hash: reversal.snapshotHash,
      occurred_at: reversal.occurredAt,
    });
    if (error) {
      if (error.code === "23505") {
        const raced = await this.getReversalByIdempotency(
          reversal.idempotencyKey,
        );
        if (raced) return raced;
      }
      throw error;
    }
    return reversal;
  }

  async getReversalByIdempotency(idempotencyKey: string) {
    const { data, error } = await this.client
      .from("commission_reversals")
      .select("snapshot")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (error) throw error;
    return data ? commissionReversalSchema.parse(data.snapshot) : null;
  }

  async getReversalTotals(calculationId: string) {
    const { data, error } = await this.client
      .from("commission_reversals")
      .select(
        "reversed_base_minor,reversed_commission_minor,reversed_tax_minor,seller_credit_minor,buyer_credit_minor,platform_revenue_reversal_minor",
      )
      .eq("calculation_id", calculationId)
      .neq("state", "manual_review");
    if (error) throw error;
    return (data || []).reduce(
      (total: CommissionReversalTotals, row: any) => ({
        baseMinor: total.baseMinor + Number(row.reversed_base_minor),
        commissionMinor:
          total.commissionMinor + Number(row.reversed_commission_minor),
        taxMinor: total.taxMinor + Number(row.reversed_tax_minor),
        sellerCreditMinor:
          total.sellerCreditMinor + Number(row.seller_credit_minor),
        buyerCreditMinor:
          total.buyerCreditMinor + Number(row.buyer_credit_minor),
        revenueMinor:
          total.revenueMinor + Number(row.platform_revenue_reversal_minor),
      }),
      { ...EMPTY_REVERSAL_TOTALS },
    );
  }

  async listAnalytics(query: CommissionAnalyticsQuery) {
    let request = this.client
      .from("commission_analytics_daily")
      .select("*")
      .eq("currency", query.currency)
      .gte("date", query.from)
      .lte("date", query.to)
      .order("date", { ascending: true });
    if (query.marketCode !== "ALL")
      request = request.eq("market_code", query.marketCode);
    if (query.verticalId) request = request.eq("vertical_id", query.verticalId);
    if (query.categoryId) request = request.eq("category_id", query.categoryId);
    if (query.planId) request = request.eq("plan_id", query.planId);
    const { data, error } = await request;
    if (error) throw error;
    return (data || []).map((row: any) =>
      commissionAnalyticsRowSchema.parse({
        date: row.date,
        marketCode: row.market_code,
        verticalId: row.vertical_id || undefined,
        categoryId: row.category_id || undefined,
        planId: row.plan_id || undefined,
        currency: row.currency,
        transactionCount: Number(row.transaction_count),
        gmvMinor: Number(row.gmv_minor),
        grossCommissionMinor: Number(row.gross_commission_minor),
        commissionDiscountMinor: Number(row.commission_discount_minor),
        commissionRevenueMinor: Number(row.commission_revenue_minor),
        commissionRefundMinor: Number(row.commission_refund_minor),
        effectiveTakeRateBps: Number(row.effective_take_rate_bps),
      }),
    );
  }
}
