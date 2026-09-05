import type {
  FeatureFlagContext,
  FeatureFlagDefinition,
  FeatureFlagDefinitionUpdate,
  FeatureFlagEvaluation,
  FeatureFlagRule,
  FeatureFlagRuleUpdate,
} from "@shongre/contracts/feature-flags";
import {
  isMarketScopedOnlyFeatureFlag,
  resolveFeatureFlagEvaluation,
} from "@shongre/contracts/feature-flags";
import { getCountryConfig } from "@shongre/contracts";
import {
  DELIVERY_FEATURE_FLAG_KEY,
  deliveryMarketActivationIssues,
} from "@shongre/contracts/delivery";
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
    key: DELIVERY_FEATURE_FLAG_KEY,
    description:
      "Activates the delivery and courier marketplace in one ready market.",
    owner: "Marketplace Operations",
    defaultEnabled: false,
    exposure: "public",
    lifecycle: "active",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
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
const SEEDED_RULES: FeatureFlagRule[] = [
  {
    id: "demo-delivery-fr",
    flagKey: DELIVERY_FEATURE_FLAG_KEY,
    marketCode: "FR",
    enabled: true,
    rolloutPercentage: 100,
    priority: 100,
    reason: "Deterministic France-only delivery scenario for local demos.",
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
  return storageService.get<FeatureFlagRule[]>(RULES_KEY, SEEDED_RULES);
}

export class DemoFeatureFlagService implements FeatureFlagServiceContract {
  async evaluate(
    key: string,
    context: FeatureFlagContext = {},
  ): Promise<FeatureFlagEvaluation> {
    await simulateNetworkDelay();
    const evaluatedAt = new Date().toISOString();
    const definition = definitions().find((value) => value.key === key);
    const result = resolveFeatureFlagEvaluation({
      key,
      definition,
      rules: rules().filter((value) => value.flagKey === key),
      context,
      evaluatedAt,
    });
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
    if (isMarketScopedOnlyFeatureFlag(key) && input.defaultEnabled) {
      throw new Error(`${key} must remain disabled by default`);
    }
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
    if (
      isMarketScopedOnlyFeatureFlag(key) &&
      (!input.marketCode || input.accountId || input.organizationId)
    ) {
      throw new Error(`${key} requires an exact market-only rule`);
    }
    if (key === DELIVERY_FEATURE_FLAG_KEY && input.enabled) {
      const issues = deliveryMarketActivationIssues(
        getCountryConfig(input.marketCode || ""),
      );
      if (input.rolloutPercentage !== 100 || issues.length > 0) {
        throw new Error(
          input.rolloutPercentage !== 100
            ? "Delivery activation must cover the whole eligible market."
            : `Delivery activation blocked: ${issues.join(", ")}`,
        );
      }
    }
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
