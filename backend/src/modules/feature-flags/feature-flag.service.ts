import {
  featureFlagContextSchema,
  featureFlagDefinitionUpdateSchema,
  featureFlagKeySchema,
  featureFlagRuleUpdateSchema,
  type FeatureFlagContext,
  type FeatureFlagEvaluation,
  isMarketScopedOnlyFeatureFlag,
  resolveFeatureFlagEvaluation,
} from "@shongre/contracts/feature-flags";
import type { IFeatureFlagRepository } from "../../infrastructure/database/repositories/feature-flag.repository.js";
import { repositories } from "../../infrastructure/database/repositories/repository-container.js";
import { logger } from "../../infrastructure/logging/logger.js";
import type { Principal } from "../../shared/auth/principal.js";
import { requirePermission } from "../../shared/auth/principal.js";
import { getCountryConfig } from "@shongre/contracts";
import {
  DELIVERY_FEATURE_FLAG_KEY,
  deliveryMarketActivationIssues,
} from "@shongre/contracts/delivery";
import { AppError } from "../../shared/errors/app-error.js";

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
      return resolveFeatureFlagEvaluation({
        key,
        definition,
        rules: await this.repository.listRules(key),
        context,
        evaluatedAt,
      });
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
    if (isMarketScopedOnlyFeatureFlag(key) && value.defaultEnabled) {
      throw new Error(`${key} must remain disabled by default`);
    }
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
    if (
      isMarketScopedOnlyFeatureFlag(key) &&
      (!value.marketCode || value.accountId || value.organizationId)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `${key} requires an exact market-only rule`,
      });
    }
    if (key === DELIVERY_FEATURE_FLAG_KEY && value.enabled) {
      const issues = deliveryMarketActivationIssues(
        getCountryConfig(value.marketCode || ""),
      );
      if (value.rolloutPercentage !== 100 || issues.length > 0) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            value.rolloutPercentage !== 100
              ? "Delivery activation must cover the whole eligible market."
              : `Delivery activation blocked: ${issues.join(", ")}`,
        });
      }
    }
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
