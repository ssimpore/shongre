import {
  CountryMarketDefinition,
  DeliveryType,
} from "../../../shared/types/index.js";
import {
  COUNTRY_REGISTRY,
  getDefaultCountryConfig,
  getCountryConfig,
  type CountryConfig,
} from "@shongre/contracts";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";
import type { Json } from "../../../generated/database.types.js";
import { randomUUID } from "node:crypto";
import { AppError } from "../../../shared/errors/app-error.js";

export interface MarketConfigurationChangeRequest {
  id: string;
  marketCode: string;
  requestedBy: string;
  baseVersion: number;
  changedFields: string[];
  reason: string;
  candidate: CountryMarketDefinition;
  status: "pending" | "approved" | "rejected" | "stale";
  reviewedBy?: string;
  reviewReason?: string;
  createdAt: string;
}

export interface IMarketRepository {
  getAll(): Promise<CountryMarketDefinition[]>;
  getByCode(code: string): Promise<CountryMarketDefinition | null>;
  getActive(): Promise<CountryMarketDefinition>;
  setActive(code: string): Promise<CountryMarketDefinition>;
  getEffective(code: string): Promise<CountryMarketDefinition>;
  requestConfigurationChange(
    code: string,
    input: {
      current: CountryMarketDefinition;
      candidate: CountryMarketDefinition;
      changedFields: string[];
      expectedVersion: number;
      reason: string;
    },
    actorId: string,
  ): Promise<MarketConfigurationChangeRequest>;
  listConfigurationChanges(
    code: string,
  ): Promise<MarketConfigurationChangeRequest[]>;
  approveConfigurationChange(
    requestId: string,
    reviewerId: string,
    reason: string,
  ): Promise<CountryMarketDefinition>;
  rejectConfigurationChange(
    requestId: string,
    reviewerId: string,
    reason: string,
  ): Promise<void>;
}

function marketGovernanceFailure(operation: string, error: unknown): never {
  const message = String(
    (error as { message?: unknown } | null)?.message || "",
  );
  if (/four-eyes|requester cannot|different administrator/i.test(message)) {
    throw new AppError({
      code: "FORBIDDEN",
      statusCode: 403,
      message: "La demande doit être examinée par un autre administrateur.",
      originalError: error,
    });
  }
  if (/stale|version conflict|configuration version/i.test(message)) {
    throw new AppError({
      code: "CONFLICT",
      statusCode: 409,
      message:
        "La configuration du marché a changé. Créez une nouvelle demande.",
      originalError: error,
    });
  }
  if (
    /pending market configuration request not found|request not found/i.test(
      message,
    )
  ) {
    throw new AppError({
      code: "NOT_FOUND",
      statusCode: 404,
      message: "Demande de configuration introuvable.",
      originalError: error,
    });
  }
  databaseFailure(operation, error);
}

const SAFE_UNAVAILABLE_COMMERCIAL_POLICY = {
  protectionFeeRate: 0,
  protectionFixedFee: 0,
  freeListingsLimit: 0,
  reservationDepositRateBps: 0,
  reservationDepositMinimumMinor: 0,
  reservationDepositMaximumMinor: 0,
  allowedDeliveryMethods: [] as DeliveryType[],
};

const demoCommercialPolicies: Record<
  string,
  Pick<
    CountryMarketDefinition,
    | "protectionFeeRate"
    | "protectionFixedFee"
    | "freeListingsLimit"
    | "reservationDepositRateBps"
    | "reservationDepositMinimumMinor"
    | "reservationDepositMaximumMinor"
    | "allowedDeliveryMethods"
  >
> = {
  FR: {
    protectionFeeRate: 0.04,
    protectionFixedFee: 0.7,
    freeListingsLimit: 10,
    reservationDepositRateBps: 1_000,
    reservationDepositMinimumMinor: 500,
    reservationDepositMaximumMinor: 20_000,
    allowedDeliveryMethods: ["hand_delivery", "relay_point", "home_delivery"],
  },
  BE: {
    protectionFeeRate: 0.045,
    protectionFixedFee: 0.8,
    freeListingsLimit: 10,
    reservationDepositRateBps: 1_000,
    reservationDepositMinimumMinor: 500,
    reservationDepositMaximumMinor: 20_000,
    allowedDeliveryMethods: ["hand_delivery", "relay_point", "home_delivery"],
  },
  CH: {
    protectionFeeRate: 0.035,
    protectionFixedFee: 1,
    freeListingsLimit: 5,
    reservationDepositRateBps: 1_000,
    reservationDepositMinimumMinor: 500,
    reservationDepositMaximumMinor: 20_000,
    allowedDeliveryMethods: ["hand_delivery", "home_delivery"],
  },
  LU: {
    protectionFeeRate: 0.04,
    protectionFixedFee: 0.7,
    freeListingsLimit: 10,
    reservationDepositRateBps: 1_000,
    reservationDepositMinimumMinor: 500,
    reservationDepositMaximumMinor: 20_000,
    allowedDeliveryMethods: ["hand_delivery", "relay_point", "home_delivery"],
  },
};

function fromCountryConfig(country: CountryConfig): CountryMarketDefinition {
  const commercial =
    demoCommercialPolicies[country.marketCode] ||
    SAFE_UNAVAILABLE_COMMERCIAL_POLICY;
  return {
    ...country,
    supportedLocales: [...country.supportedLocales],
    payments: {
      ...country.payments,
      providerIds: [...country.payments.providerIds],
    },
    taxes: { ...country.taxes },
    monetization: { ...country.monetization },
    locale: country.defaultLocale,
    currencySymbol: country.currencySymbol || country.currency,
    ...commercial,
    allowedDeliveryMethods: [...commercial.allowedDeliveryMethods],
    isBaseMarket: country.isDefault,
    isActive:
      country.enabled &&
      country.launchStatus === "active" &&
      country.marketplace.enabled,
    version: 1,
  };
}

export const CANONICAL_DEMO_MARKETS: Record<string, CountryMarketDefinition> =
  Object.fromEntries(
    COUNTRY_REGISTRY.map((country) => [
      country.code,
      fromCountryConfig(country),
    ]),
  );

export class DemoMarketRepository implements IMarketRepository {
  private markets: Map<string, CountryMarketDefinition> = new Map();
  private changes = new Map<string, MarketConfigurationChangeRequest>();
  private activeCode = getDefaultCountryConfig().marketCode;

  constructor(
    initialMarkets: Record<
      string,
      CountryMarketDefinition
    > = CANONICAL_DEMO_MARKETS,
  ) {
    this.reset(initialMarkets);
  }

  reset(
    initialMarkets: Record<
      string,
      CountryMarketDefinition
    > = CANONICAL_DEMO_MARKETS,
  ) {
    this.markets.clear();
    this.changes.clear();
    Object.values(initialMarkets).forEach((m) =>
      this.markets.set(m.code, { ...m }),
    );
    this.activeCode = getDefaultCountryConfig().marketCode;
  }

  async getAll(): Promise<CountryMarketDefinition[]> {
    return Array.from(this.markets.values()).map((m) => ({ ...m }));
  }

  async getByCode(code: string): Promise<CountryMarketDefinition | null> {
    const upper = (code || "").toUpperCase();
    const market = this.markets.get(upper);
    return market ? { ...market } : null;
  }

  async getActive(): Promise<CountryMarketDefinition> {
    return this.getEffective(this.activeCode);
  }

  async setActive(code: string): Promise<CountryMarketDefinition> {
    const effective = await this.getEffective(code);
    this.activeCode = effective.code;
    return effective;
  }

  async getEffective(code: string): Promise<CountryMarketDefinition> {
    const targetCode = String(code || "")
      .trim()
      .toUpperCase();
    const targetMarket = this.markets.get(targetCode);
    if (!targetMarket) throw new Error(`Unknown market: ${targetCode}`);
    return {
      ...targetMarket,
      supportedLocales: [...targetMarket.supportedLocales],
      supportedCurrencies: [...targetMarket.supportedCurrencies],
      locationHierarchy: [...targetMarket.locationHierarchy],
      payments: {
        ...targetMarket.payments,
        providerIds: [...targetMarket.payments.providerIds],
      },
      allowedDeliveryMethods: [...targetMarket.allowedDeliveryMethods],
    };
  }

  async requestConfigurationChange(
    code: string,
    input: {
      current: CountryMarketDefinition;
      candidate: CountryMarketDefinition;
      changedFields: string[];
      expectedVersion: number;
      reason: string;
    },
    actorId: string,
  ): Promise<MarketConfigurationChangeRequest> {
    const current = await this.getByCode(code);
    if (!current) throw new Error(`Unknown market: ${code}`);
    if ((current.version || 1) !== input.expectedVersion)
      throw new Error("market configuration version conflict");
    const request: MarketConfigurationChangeRequest = {
      id: randomUUID(),
      marketCode: current.code,
      requestedBy: actorId,
      baseVersion: input.expectedVersion,
      changedFields: [...input.changedFields],
      reason: input.reason,
      candidate: structuredClone(input.candidate),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.changes.set(request.id, request);
    return structuredClone(request);
  }

  async listConfigurationChanges(
    code: string,
  ): Promise<MarketConfigurationChangeRequest[]> {
    return [...this.changes.values()]
      .filter((request) => request.marketCode === code.toUpperCase())
      .map((request) => structuredClone(request));
  }

  async approveConfigurationChange(
    requestId: string,
    reviewerId: string,
    reason: string,
  ): Promise<CountryMarketDefinition> {
    const request = this.changes.get(requestId);
    if (!request || request.status !== "pending")
      throw new Error("pending market configuration request not found");
    if (request.requestedBy === reviewerId)
      throw new Error("four-eyes approval required");
    const current = await this.getByCode(request.marketCode);
    if (!current || (current.version || 1) !== request.baseVersion) {
      request.status = "stale";
      throw new Error("market configuration version conflict");
    }
    const updated = {
      ...structuredClone(request.candidate),
      version: request.baseVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    this.markets.set(request.marketCode, updated);
    request.status = "approved";
    request.reviewedBy = reviewerId;
    request.reviewReason = reason;
    return structuredClone(updated);
  }

  async rejectConfigurationChange(
    requestId: string,
    reviewerId: string,
    reason: string,
  ): Promise<void> {
    const request = this.changes.get(requestId);
    if (!request || request.status !== "pending")
      throw new Error("pending market configuration request not found");
    if (request.requestedBy === reviewerId)
      throw new Error("four-eyes approval required");
    request.status = "rejected";
    request.reviewedBy = reviewerId;
    request.reviewReason = reason;
  }
}

export class PostgresMarketRepository implements IMarketRepository {
  private activeCode = getDefaultCountryConfig().marketCode;

  private mapRowToMarket(row: any): CountryMarketDefinition {
    const bootstrap = getCountryConfig(String(row.code || "").toUpperCase());
    if (!bootstrap) {
      databaseFailure("markets.mapRowToMarket.unknownMarket");
    }
    return {
      ...bootstrap,
      code: String(row.code).toUpperCase(),
      slug: row.slug || bootstrap.slug,
      name: row.name || bootstrap.name,
      nativeName: row.native_name || bootstrap.nativeName,
      enabled: row.enabled ?? bootstrap.enabled,
      launchStatus: row.launch_status || bootstrap.launchStatus,
      canonicalDomainMode:
        row.canonical_domain_mode || bootstrap.canonicalDomainMode,
      basePath: row.base_path || bootstrap.basePath,
      defaultLocale:
        row.default_locale || row.locale || bootstrap.defaultLocale,
      supportedLocales: row.supported_locales || [
        ...bootstrap.supportedLocales,
      ],
      currency: row.currency || bootstrap.currency,
      currencySymbol:
        row.currency_symbol || bootstrap.currencySymbol || bootstrap.currency,
      locale: row.default_locale || row.locale || bootstrap.defaultLocale,
      timezone: row.timezone || bootstrap.timezone,
      phoneCountryCode: row.phone_country_code || bootstrap.phoneCountryCode,
      addressFormat: row.address_format || bootstrap.addressFormat,
      legalEntity: row.legal_entity || bootstrap.legalEntity,
      seo: row.seo_policy || bootstrap.seo,
      marketplace: row.marketplace_policy || bootstrap.marketplace,
      payments: row.payment_policy || bootstrap.payments,
      taxes: row.tax_policy || bootstrap.taxes,
      monetization: row.monetization_policy || bootstrap.monetization,
      compliance: row.compliance_policy || bootstrap.compliance,
      launchContent: row.launch_content || bootstrap.launchContent,
      gatewayVisible: row.gateway_visible ?? bootstrap.gatewayVisible,
      displayOrder: Number(row.display_order ?? bootstrap.displayOrder),
      protectionFeeRate: Number(row.protection_fee_rate ?? 0),
      protectionFixedFee: Number(row.protection_fixed_fee ?? 0),
      freeListingsLimit: Number(row.free_listings_limit ?? 0),
      reservationDepositRateBps: Number(row.reservation_deposit_rate_bps ?? 0),
      reservationDepositMinimumMinor: Number(
        row.reservation_deposit_minimum_minor ?? 0,
      ),
      reservationDepositMaximumMinor: Number(
        row.reservation_deposit_maximum_minor ?? 0,
      ),
      allowedDeliveryMethods:
        (row.allowed_delivery_methods as DeliveryType[]) || [],
      isBaseMarket: Boolean(row.is_base_market),
      isActive:
        row.enabled !== undefined
          ? Boolean(
              row.enabled &&
              row.launch_status === "active" &&
              (row.marketplace_policy?.enabled ?? row.is_active),
            )
          : Boolean(row.is_active),
      version: Number(row.version || 1),
      updatedAt: row.updated_at,
    };
  }

  async getAll(): Promise<CountryMarketDefinition[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .order("code");
      if (error || !data) databaseFailure("markets.getAll", error);
      return data.map((r: any) => this.mapRowToMarket(r));
    } catch (error) {
      databaseFailure("markets.getAll", error);
    }
  }

  async getByCode(code: string): Promise<CountryMarketDefinition | null> {
    const upper = (code || "").toUpperCase();
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("code", upper)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        databaseFailure("markets.getByCode", error);
      }
      if (!data) return null;
      return this.mapRowToMarket(data);
    } catch (error) {
      databaseFailure("markets.getByCode", error);
    }
  }

  async getActive(): Promise<CountryMarketDefinition> {
    return this.getEffective(this.activeCode);
  }

  async setActive(code: string): Promise<CountryMarketDefinition> {
    const effective = await this.getEffective(code);
    this.activeCode = effective.code;
    return effective;
  }

  async getEffective(code: string): Promise<CountryMarketDefinition> {
    const target = await this.getByCode(String(code || "").toUpperCase());
    if (!target) throw new Error(`Unknown market: ${code}`);
    return target;
  }

  private mapChangeRequest(row: any): MarketConfigurationChangeRequest {
    return {
      id: String(row.id),
      marketCode: String(row.market_code),
      requestedBy: String(row.requested_by),
      baseVersion: Number(row.base_version),
      changedFields: (row.changed_fields || []).map(String),
      reason: String(row.reason),
      candidate: row.candidate_snapshot as CountryMarketDefinition,
      status: row.status,
      reviewedBy: row.reviewed_by || undefined,
      reviewReason: row.review_reason || undefined,
      createdAt: String(row.created_at),
    };
  }

  async requestConfigurationChange(
    code: string,
    input: {
      current: CountryMarketDefinition;
      candidate: CountryMarketDefinition;
      changedFields: string[];
      expectedVersion: number;
      reason: string;
    },
    actorId: string,
  ): Promise<MarketConfigurationChangeRequest> {
    try {
      const { data: id, error } = await (getSupabaseAdminClient() as any).rpc(
        "request_market_configuration_change",
        {
          p_market_code: code,
          p_requested_by: actorId,
          p_base_version: input.expectedVersion,
          p_changed_fields: input.changedFields,
          p_reason: input.reason,
          p_before_snapshot: input.current as unknown as Json,
          p_candidate_snapshot: input.candidate as unknown as Json,
        },
      );
      if (error || !id)
        databaseFailure("markets.requestConfigurationChange", error);
      const { data: row, error: readError } = await getSupabaseAdminClient()
        .from("market_configuration_change_requests" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (readError || !row)
        databaseFailure("markets.requestConfigurationChange.read", readError);
      return this.mapChangeRequest(row);
    } catch (error) {
      databaseFailure("markets.requestConfigurationChange", error);
    }
  }

  async listConfigurationChanges(
    code: string,
  ): Promise<MarketConfigurationChangeRequest[]> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from("market_configuration_change_requests" as any)
        .select("*")
        .eq("market_code", code.toUpperCase())
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) databaseFailure("markets.listConfigurationChanges", error);
      return ((data || []) as any[]).map((row) => this.mapChangeRequest(row));
    } catch (error) {
      databaseFailure("markets.listConfigurationChanges", error);
    }
  }

  async approveConfigurationChange(
    requestId: string,
    reviewerId: string,
    reason: string,
  ): Promise<CountryMarketDefinition> {
    try {
      const { data, error } = await (getSupabaseAdminClient() as any).rpc(
        "approve_market_configuration_change",
        {
          p_request_id: requestId,
          p_reviewer: reviewerId,
          p_review_reason: reason,
        },
      );
      if (error)
        marketGovernanceFailure("markets.approveConfigurationChange", error);
      if (!data?.[0]) {
        const { data: request, error: readError } =
          await getSupabaseAdminClient()
            .from("market_configuration_change_requests" as any)
            .select("status")
            .eq("id", requestId)
            .maybeSingle();
        if (readError)
          databaseFailure("markets.approveConfigurationChange.read", readError);
        if ((request as { status?: string } | null)?.status === "stale") {
          throw new AppError({
            code: "CONFLICT",
            statusCode: 409,
            message:
              "La configuration du marché a changé. Créez une nouvelle demande.",
          });
        }
        throw new AppError({
          code: "NOT_FOUND",
          statusCode: 404,
          message: "Demande de configuration introuvable.",
        });
      }
      return this.mapRowToMarket(data[0]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      databaseFailure("markets.approveConfigurationChange", error);
    }
  }

  async rejectConfigurationChange(
    requestId: string,
    reviewerId: string,
    reason: string,
  ): Promise<void> {
    try {
      const { data, error } = await (getSupabaseAdminClient() as any).rpc(
        "reject_market_configuration_change",
        {
          p_request_id: requestId,
          p_reviewer: reviewerId,
          p_review_reason: reason,
        },
      );
      if (error)
        marketGovernanceFailure("markets.rejectConfigurationChange", error);
      if (data !== true) {
        throw new AppError({
          code: "NOT_FOUND",
          statusCode: 404,
          message: "Demande de configuration introuvable.",
        });
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      databaseFailure("markets.rejectConfigurationChange", error);
    }
  }
}
