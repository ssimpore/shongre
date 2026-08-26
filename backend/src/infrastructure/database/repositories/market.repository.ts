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
import type { Database, Json } from "../../../generated/database.types.js";

export interface IMarketRepository {
  getAll(): Promise<CountryMarketDefinition[]>;
  getByCode(code: string): Promise<CountryMarketDefinition | null>;
  getActive(): Promise<CountryMarketDefinition>;
  setActive(code: string): Promise<CountryMarketDefinition>;
  getEffective(code: string): Promise<CountryMarketDefinition>;
  updateConfiguration(
    code: string,
    input: Partial<CountryMarketDefinition>,
  ): Promise<CountryMarketDefinition>;
  recordConfigurationAudit(input: {
    marketCode: string;
    actorId: string;
    changedFields: string[];
    previousVersion: number;
    newVersion: number;
  }): Promise<void>;
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

  async updateConfiguration(
    code: string,
    input: Partial<CountryMarketDefinition>,
  ): Promise<CountryMarketDefinition> {
    const current = await this.getByCode(code);
    if (!current) throw new Error(`Unknown market: ${code}`);
    const next: CountryMarketDefinition = {
      ...current,
      ...input,
      code: current.code,
      supportedLocales: input.supportedLocales
        ? [...input.supportedLocales]
        : [...current.supportedLocales],
      payments: input.payments
        ? { ...input.payments, providerIds: [...input.payments.providerIds] }
        : current.payments,
      version: (current.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    this.markets.set(current.code, next);
    return { ...next };
  }

  async recordConfigurationAudit(): Promise<void> {
    return;
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

  async updateConfiguration(
    code: string,
    input: Partial<CountryMarketDefinition>,
  ): Promise<CountryMarketDefinition> {
    const current = await this.getByCode(code);
    if (!current) throw new Error(`Unknown market: ${code}`);
    const update: Database["public"]["Tables"]["markets"]["Update"] = {
      name: input.name,
      native_name: input.nativeName,
      enabled: input.enabled,
      launch_status: input.launchStatus,
      canonical_domain_mode: input.canonicalDomainMode,
      base_path: input.basePath,
      default_locale: input.defaultLocale,
      supported_locales: input.supportedLocales
        ? [...input.supportedLocales]
        : undefined,
      currency: input.currency,
      currency_symbol: input.currencySymbol,
      timezone: input.timezone,
      phone_country_code: input.phoneCountryCode,
      address_format: input.addressFormat,
      legal_entity: input.legalEntity,
      seo_policy: input.seo as Json | undefined,
      marketplace_policy: input.marketplace as Json | undefined,
      payment_policy: input.payments as Json | undefined,
      tax_policy: input.taxes as Json | undefined,
      monetization_policy: input.monetization as Json | undefined,
      compliance_policy: input.compliance as Json | undefined,
      launch_content: input.launchContent as Json | undefined,
      gateway_visible: input.gatewayVisible,
      display_order: input.displayOrder,
      protection_fee_rate: input.protectionFeeRate,
      protection_fixed_fee: input.protectionFixedFee,
      free_listings_limit: input.freeListingsLimit,
      reservation_deposit_rate_bps: input.reservationDepositRateBps,
      reservation_deposit_minimum_minor: input.reservationDepositMinimumMinor,
      reservation_deposit_maximum_minor: input.reservationDepositMaximumMinor,
      allowed_delivery_methods: input.allowedDeliveryMethods
        ? [...input.allowedDeliveryMethods]
        : undefined,
      version: (current.version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    const clean = Object.fromEntries(
      Object.entries(update).filter(([, value]) => value !== undefined),
    ) as Database["public"]["Tables"]["markets"]["Update"];
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from("markets")
        .update(clean)
        .eq("code", current.code)
        .select("*")
        .single();
      if (error || !data) databaseFailure("markets.updateConfiguration", error);
      return this.mapRowToMarket(data);
    } catch (error) {
      databaseFailure("markets.updateConfiguration", error);
    }
  }

  async recordConfigurationAudit(input: {
    marketCode: string;
    actorId: string;
    changedFields: string[];
    previousVersion: number;
    newVersion: number;
  }): Promise<void> {
    try {
      const { error } = await getSupabaseAdminClient()
        .from("market_configuration_audit")
        .insert({
          market_code: input.marketCode,
          actor_id: input.actorId,
          changed_fields: input.changedFields,
          previous_version: input.previousVersion,
          new_version: input.newVersion,
        });
      if (error) databaseFailure("markets.recordConfigurationAudit", error);
    } catch (error) {
      databaseFailure("markets.recordConfigurationAudit", error);
    }
  }
}
