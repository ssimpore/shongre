import { randomUUID } from "node:crypto";
import type {
  FeatureFlagDefinition,
  FeatureFlagDefinitionUpdate,
  FeatureFlagRule,
  FeatureFlagRuleUpdate,
} from "@shongre/contracts/feature-flags";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface IFeatureFlagRepository {
  getDefinition(key: string): Promise<FeatureFlagDefinition | null>;
  listDefinitions(): Promise<FeatureFlagDefinition[]>;
  listRules(key: string): Promise<FeatureFlagRule[]>;
  upsertDefinition(
    key: string,
    input: FeatureFlagDefinitionUpdate,
    actorId: string,
  ): Promise<FeatureFlagDefinition>;
  upsertRule(
    key: string,
    ruleId: string | undefined,
    input: FeatureFlagRuleUpdate,
    actorId: string,
  ): Promise<FeatureFlagRule>;
}

const SEEDED_AT = "2026-08-25T00:00:00.000Z";
const SEEDED_FLAGS: FeatureFlagDefinition[] = [
  {
    key: "support.workspace",
    description: "Expose the canonical support workspace to authorized staff.",
    owner: "Customer Operations",
    defaultEnabled: true,
    exposure: "public",
    lifecycle: "active",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    key: "search.ranking_v2",
    description: "Enables the second-generation marketplace ranking pipeline.",
    owner: "Discovery",
    defaultEnabled: false,
    exposure: "server",
    lifecycle: "active",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    key: "publication.draft_recovery_v2",
    description:
      "Enables resilient publication draft recovery in the web client.",
    owner: "Marketplace Experience",
    defaultEnabled: true,
    exposure: "public",
    lifecycle: "active",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

export class DemoFeatureFlagRepository implements IFeatureFlagRepository {
  private readonly definitions = new Map(
    SEEDED_FLAGS.map((value) => [value.key, structuredClone(value)]),
  );
  private readonly rules = new Map<string, FeatureFlagRule[]>();

  async getDefinition(key: string) {
    const value = this.definitions.get(key);
    return value ? structuredClone(value) : null;
  }

  async listDefinitions() {
    return [...this.definitions.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((value) => structuredClone(value));
  }

  async listRules(key: string) {
    return structuredClone(
      (this.rules.get(key) ?? []).sort((a, b) => b.priority - a.priority),
    );
  }

  async upsertDefinition(
    key: string,
    input: FeatureFlagDefinitionUpdate,
    _actorId: string,
  ) {
    const now = new Date().toISOString();
    const previous = this.definitions.get(key);
    const value: FeatureFlagDefinition = {
      key,
      description: input.description,
      owner: input.owner,
      defaultEnabled: input.defaultEnabled,
      exposure: input.exposure,
      lifecycle: input.lifecycle,
      expiresAt: input.expiresAt,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    this.definitions.set(key, value);
    return structuredClone(value);
  }

  async upsertRule(
    key: string,
    ruleId: string | undefined,
    input: FeatureFlagRuleUpdate,
    _actorId: string,
  ) {
    const now = new Date().toISOString();
    const rules = this.rules.get(key) ?? [];
    const id = ruleId ?? randomUUID();
    const previous = rules.find((rule) => rule.id === id);
    const value: FeatureFlagRule = {
      id,
      flagKey: key,
      marketCode: input.marketCode?.toUpperCase(),
      accountId: input.accountId,
      organizationId: input.organizationId,
      enabled: input.enabled,
      rolloutPercentage: input.rolloutPercentage,
      priority: input.priority,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    this.rules.set(key, [...rules.filter((rule) => rule.id !== id), value]);
    return structuredClone(value);
  }
}

function mapDefinition(row: any): FeatureFlagDefinition {
  return {
    key: row.key,
    description: row.description,
    owner: row.owner,
    defaultEnabled: Boolean(row.default_enabled),
    exposure: row.exposure,
    lifecycle: row.lifecycle,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRule(row: any): FeatureFlagRule {
  return {
    id: row.id,
    flagKey: row.flag_key,
    marketCode: row.market_code ?? undefined,
    accountId: row.account_id ?? undefined,
    organizationId: row.organization_id ?? undefined,
    enabled: Boolean(row.enabled),
    rolloutPercentage: Number(row.rollout_percentage),
    priority: Number(row.priority),
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresFeatureFlagRepository implements IFeatureFlagRepository {
  async getDefinition(key: string): Promise<FeatureFlagDefinition | null> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .eq("key", key)
        .maybeSingle();
      if (error) databaseFailure("featureFlags.getDefinition", error);
      return data ? mapDefinition(data) : null;
    } catch (error) {
      databaseFailure("featureFlags.getDefinition", error);
    }
  }

  async listDefinitions(): Promise<FeatureFlagDefinition[]> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("key", { ascending: true });
      if (error) databaseFailure("featureFlags.listDefinitions", error);
      return (data ?? []).map(mapDefinition);
    } catch (error) {
      databaseFailure("featureFlags.listDefinitions", error);
    }
  }

  async listRules(key: string): Promise<FeatureFlagRule[]> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("feature_flag_rules")
        .select("*")
        .eq("flag_key", key)
        .order("priority", { ascending: false });
      if (error) databaseFailure("featureFlags.listRules", error);
      return (data ?? []).map(mapRule);
    } catch (error) {
      databaseFailure("featureFlags.listRules", error);
    }
  }

  async upsertDefinition(
    key: string,
    input: FeatureFlagDefinitionUpdate,
    actorId: string,
  ): Promise<FeatureFlagDefinition> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase.rpc("upsert_feature_flag", {
        p_key: key,
        p_description: input.description,
        p_owner: input.owner,
        p_default_enabled: input.defaultEnabled,
        p_exposure: input.exposure,
        p_lifecycle: input.lifecycle,
        p_expires_at: input.expiresAt ?? null,
        p_actor_id: actorId,
        p_reason: input.reason,
      });
      if (error || !data)
        databaseFailure("featureFlags.upsertDefinition", error);
      return mapDefinition(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      databaseFailure("featureFlags.upsertDefinition", error);
    }
  }

  async upsertRule(
    key: string,
    ruleId: string | undefined,
    input: FeatureFlagRuleUpdate,
    actorId: string,
  ): Promise<FeatureFlagRule> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase.rpc("upsert_feature_flag_rule", {
        p_id: ruleId ?? null,
        p_flag_key: key,
        p_market_code: input.marketCode ?? null,
        p_account_id: input.accountId ?? null,
        p_organization_id: input.organizationId ?? null,
        p_enabled: input.enabled,
        p_rollout_percentage: input.rolloutPercentage,
        p_priority: input.priority,
        p_starts_at: input.startsAt ?? null,
        p_ends_at: input.endsAt ?? null,
        p_actor_id: actorId,
        p_reason: input.reason,
      });
      if (error || !data) databaseFailure("featureFlags.upsertRule", error);
      return mapRule(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      databaseFailure("featureFlags.upsertRule", error);
    }
  }
}
