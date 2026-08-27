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
import { httpClient } from "./http-client";
import { analyticsService } from "../../../services/analytics.service";

export class HttpFeatureFlagService implements FeatureFlagServiceContract {
  async evaluate(key: string, context: FeatureFlagContext = {}) {
    const result = await httpClient.get<FeatureFlagEvaluation>(
      `/feature-flags/${encodeURIComponent(key)}`,
      { params: context },
    );
    analyticsService.track("feature_flag_evaluated", {
      flagKey: result.key,
      enabled: result.enabled,
      variant: result.source,
    });
    return result;
  }

  getAdminSnapshot() {
    return httpClient.get<FeatureFlagAdminEntry[]>("/admin/feature-flags");
  }

  upsertDefinition(key: string, input: FeatureFlagDefinitionUpdate) {
    return httpClient.put<FeatureFlagDefinition>(
      `/admin/feature-flags/${encodeURIComponent(key)}`,
      input,
    );
  }

  upsertRule(
    key: string,
    ruleId: string | undefined,
    input: FeatureFlagRuleUpdate,
  ) {
    return httpClient.put<FeatureFlagRule>(
      `/admin/feature-flags/${encodeURIComponent(key)}/rules/${encodeURIComponent(ruleId ?? "new")}`,
      input,
    );
  }
}

export const httpFeatureFlagService = new HttpFeatureFlagService();
