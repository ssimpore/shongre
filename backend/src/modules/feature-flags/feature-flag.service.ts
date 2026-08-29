import { createHash } from "node:crypto";
import {
  featureFlagContextSchema,
  featureFlagDefinitionUpdateSchema,
  featureFlagKeySchema,
  featureFlagRuleUpdateSchema,
  type FeatureFlagContext,
  type FeatureFlagEvaluation,
  type FeatureFlagRule,
} from "@shongre/contracts/feature-flags";
import type { IFeatureFlagRepository } from "../../infrastructure/database/repositories/feature-flag.repository.js";
import { repositories } from "../../infrastructure/database/repositories/repository-container.js";
import { logger } from "../../infrastructure/logging/logger.js";
import type { Principal } from "../../shared/auth/principal.js";
import { requirePermission } from "../../shared/auth/principal.js";

function stableBucket(key: string, identity: string): number {
  const digest = createHash("sha256").update(`${key}:${identity}`).digest();
  return digest.readUInt32BE(0) % 100;
}

function ruleMatches(
  rule: FeatureFlagRule,
  context: FeatureFlagContext,
  nowIso: string,
): boolean {
  if (rule.startsAt && rule.startsAt > nowIso) return false;
  if (rule.endsAt && rule.endsAt <= nowIso) return false;
  if (rule.marketCode && rule.marketCode !== context.marketCode) return false;
  if (rule.accountId && rule.accountId !== context.accountId) return false;
  if (rule.organizationId && rule.organizationId !== context.organizationId)
    return false;
  const identity =
    context.accountId ||
    context.organizationId ||
    context.anonymousId ||
    `${context.marketCode || "global"}:anonymous`;
  return stableBucket(rule.flagKey, identity) < rule.rolloutPercentage;
}

export class FeatureFlagService {
  constructor(
    private readonly repository: IFeatureFlagRepository = repositories.featureFlags,
  ) {}

  async evaluatePublic(
    principal: Principal,
    keyInput: string,
    contextInput: unknown,
  ): Promise<FeatureFlagEvaluation> {
    const evaluatedAt = new Date().toISOString();
    let key = "invalid.flag";
    try {
      key = featureFlagKeySchema.parse(keyInput);
      const supplied = featureFlagContextSchema.parse(contextInput);
      const context: FeatureFlagContext = {
        marketCode: supplied.marketCode?.toUpperCase(),
        anonymousId: supplied.anonymousId,
        // Account targeting is derived from the authenticated session. A client
        // cannot opt itself into another account's rollout cohort.
        accountId: principal.userId || undefined,
      };
      const definition = await this.repository.getDefinition(key);
      if (
        !definition ||
        definition.exposure !== "public" ||
        definition.lifecycle !== "active" ||
        (definition.expiresAt && definition.expiresAt <= evaluatedAt)
      ) {
        return { key, enabled: false, source: "safe_default", evaluatedAt };
      }
      const rule = (await this.repository.listRules(key)).find((candidate) =>
        ruleMatches(candidate, context, evaluatedAt),
      );
      if (rule) {
        return {
          key,
          enabled: rule.enabled,
          source: "rule",
          ruleId: rule.id,
          evaluatedAt,
        };
      }
      return {
        key,
        enabled: definition.defaultEnabled,
        source: "default",
        evaluatedAt,
      };
    } catch (error) {
      logger.error("feature_flag_evaluation_failed", {
        key,
        error: error instanceof Error ? error.message : "unknown",
      });
      // Feature infrastructure is never allowed to turn a dependency failure
      // into an accidental enablement.
      return { key, enabled: false, source: "safe_default", evaluatedAt };
    }
  }

  async getAdminSnapshot(principal: Principal) {
    requirePermission(principal, "admin.configuration.manage");
    const definitions = await this.repository.listDefinitions();
    return Promise.all(
      definitions.map(async (definition) => ({
        definition,
        rules: await this.repository.listRules(definition.key),
      })),
    );
  }

  async upsertDefinition(
    principal: Principal,
    keyInput: string,
    input: unknown,
  ) {
    requirePermission(principal, "admin.configuration.manage");
    const key = featureFlagKeySchema.parse(keyInput);
    const value = featureFlagDefinitionUpdateSchema.parse(input);
    const result = await this.repository.upsertDefinition(
      key,
      value,
      principal.userId,
    );
    await repositories.admin.saveAuditLog({
      actorId: principal.userId,
      actorName: principal.email || principal.userId,
      actorRole: principal.staffRole || principal.role,
      targetId: key,
      targetName: key,
      action: "feature_flag_definition_upserted",
      details: value.reason,
      metadata: { defaultEnabled: result.defaultEnabled },
    });
    return result;
  }

  async upsertRule(
    principal: Principal,
    keyInput: string,
    ruleId: string | undefined,
    input: unknown,
  ) {
    requirePermission(principal, "admin.configuration.manage");
    const key = featureFlagKeySchema.parse(keyInput);
    const value = featureFlagRuleUpdateSchema.parse(input);
    const result = await this.repository.upsertRule(
      key,
      ruleId === "new" ? undefined : ruleId,
      value,
      principal.userId,
    );
    await repositories.admin.saveAuditLog({
      actorId: principal.userId,
      actorName: principal.email || principal.userId,
      actorRole: principal.staffRole || principal.role,
      targetId: result.id,
      targetName: key,
      action: "feature_flag_rule_upserted",
      details: value.reason,
      metadata: {
        enabled: result.enabled,
        rolloutPercentage: result.rolloutPercentage,
      },
    });
    return result;
  }
}

export const featureFlagService = new FeatureFlagService();
