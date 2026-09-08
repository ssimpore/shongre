import type {
  FeatureFlagContext,
  FeatureFlagDefinition,
  FeatureFlagDefinitionUpdate,
  FeatureFlagEvaluation,
  FeatureFlagRule,
  FeatureFlagRuleUpdate,
} from "@shongre/contracts/feature-flags";
import { apiOperation } from "./generated-api-operation";
import type {
  FeatureFlagAdminEntry,
  FeatureFlagServiceContract,
} from "../../contracts/feature-flags.contract";
import { analyticsService } from "../../../services/analytics.service";

export class HttpFeatureFlagService implements FeatureFlagServiceContract {
  async evaluate(key: string, context: FeatureFlagContext = {}) {
    const result = await apiOperation<
      FeatureFlagEvaluation,
      "getFeatureFlagEvaluation"
    >("getFeatureFlagEvaluation", { path: { key: key }, query: context });
    analyticsService.track("feature_flag_evaluated", {
      flagKey: result.key,
      enabled: result.enabled,
      variant: result.source,
    });
    return result;
  }

  getAdminSnapshot() {
    return apiOperation<FeatureFlagAdminEntry[], "getAdminFeatureFlags">(
      "getAdminFeatureFlags",
      {},
    );
  }

  upsertDefinition(key: string, input: FeatureFlagDefinitionUpdate) {
    return apiOperation<FeatureFlagDefinition, "putAdminFeatureFlag">(
      "putAdminFeatureFlag",
      { path: { key: key }, body: input },
    );
  }

  upsertRule(
    key: string,
    ruleId: string | undefined,
    input: FeatureFlagRuleUpdate,
  ) {
    return apiOperation<FeatureFlagRule, "putAdminFeatureFlagRule">(
      "putAdminFeatureFlagRule",
      { path: { key: key, ruleId: ruleId ?? "new" }, body: input },
    );
  }
}

export const httpFeatureFlagService = new HttpFeatureFlagService();
