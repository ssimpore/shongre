import type {
  FeatureFlagContext,
  FeatureFlagDefinition,
  FeatureFlagDefinitionUpdate,
  FeatureFlagEvaluation,
  FeatureFlagRule,
  FeatureFlagRuleUpdate,
} from "@shongre/contracts/feature-flags";
import type {
  FeatureFlagAdminEntry,
  FeatureFlagServiceContract,
} from "../../contracts/feature-flags.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { storageService } from "../../../services/storage.service";
import { analyticsService } from "../../../services/analytics.service";
import { requireDemoCapability } from "./demo-authorization";

const DEFINITIONS_KEY = "shongre_demo_feature_flags_v1";
const RULES_KEY = "shongre_demo_feature_flag_rules_v1";
const SEEDED_AT = "2026-08-25T00:00:00.000Z";
const SEEDED_DEFINITIONS: FeatureFlagDefinition[] = [
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

function definitions() {
  return storageService.get<FeatureFlagDefinition[]>(
    DEFINITIONS_KEY,
    SEEDED_DEFINITIONS,
  );
}

function rules() {
  return storageService.get<FeatureFlagRule[]>(RULES_KEY, []);
}

function bucket(key: string, identity: string) {
  let value = 2166136261;
  for (const character of `${key}:${identity}`) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) % 100;
}

function matches(
  rule: FeatureFlagRule,
  context: FeatureFlagContext,
  now: string,
) {
  if (rule.startsAt && rule.startsAt > now) return false;
  if (rule.endsAt && rule.endsAt <= now) return false;
  if (rule.marketCode && rule.marketCode !== context.marketCode) return false;
  if (rule.accountId && rule.accountId !== context.accountId) return false;
  if (rule.organizationId && rule.organizationId !== context.organizationId)
    return false;
  const identity =
    context.accountId ||
    context.organizationId ||
    context.anonymousId ||
    context.marketCode ||
    "anonymous";
  return bucket(rule.flagKey, identity) < rule.rolloutPercentage;
}

export class DemoFeatureFlagService implements FeatureFlagServiceContract {
  async evaluate(
    key: string,
    context: FeatureFlagContext = {},
  ): Promise<FeatureFlagEvaluation> {
    await simulateNetworkDelay();
    const evaluatedAt = new Date().toISOString();
    const definition = definitions().find((value) => value.key === key);
    let result: FeatureFlagEvaluation;
    if (
      !definition ||
      definition.exposure !== "public" ||
      definition.lifecycle !== "active" ||
      (definition.expiresAt && definition.expiresAt <= evaluatedAt)
    ) {
      result = { key, enabled: false, source: "safe_default", evaluatedAt };
    } else {
      const rule = rules()
        .filter((value) => value.flagKey === key)
        .sort((left, right) => right.priority - left.priority)
        .find((value) => matches(value, context, evaluatedAt));
      result = rule
        ? {
            key,
            enabled: rule.enabled,
            source: "rule",
            ruleId: rule.id,
            evaluatedAt,
          }
        : {
            key,
            enabled: definition.defaultEnabled,
            source: "default",
            evaluatedAt,
          };
    }
    analyticsService.track("feature_flag_evaluated", {
      flagKey: result.key,
      enabled: result.enabled,
      variant: result.source,
    });
    return result;
  }

  async getAdminSnapshot(): Promise<FeatureFlagAdminEntry[]> {
    await simulateNetworkDelay();
    requireDemoCapability("admin.configuration.manage");
    return definitions().map((definition) => ({
      definition,
      rules: rules()
        .filter((rule) => rule.flagKey === definition.key)
        .sort((left, right) => right.priority - left.priority),
    }));
  }

  async upsertDefinition(key: string, input: FeatureFlagDefinitionUpdate) {
    await simulateNetworkDelay();
    requireDemoCapability("admin.configuration.manage");
    const current = definitions();
    const previous = current.find((value) => value.key === key);
    const now = new Date().toISOString();
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
    storageService.set(DEFINITIONS_KEY, [
      ...current.filter((item) => item.key !== key),
      value,
    ]);
    return value;
  }

  async upsertRule(
    key: string,
    ruleId: string | undefined,
    input: FeatureFlagRuleUpdate,
  ) {
    await simulateNetworkDelay();
    requireDemoCapability("admin.configuration.manage");
    const current = rules();
    const id = ruleId ?? `flag-rule-${current.length + 1}`;
    const previous = current.find((value) => value.id === id);
    const now = new Date().toISOString();
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
    storageService.set(RULES_KEY, [
      ...current.filter((item) => item.id !== id),
      value,
    ]);
    return value;
  }
}

export const demoFeatureFlagService = new DemoFeatureFlagService();
