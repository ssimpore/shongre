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

export class HttpFeatureFlagService implements FeatureFlagServiceContract {
  evaluate(key: string, context: FeatureFlagContext = {}) {
    return httpClient.get<FeatureFlagEvaluation>(
      `/feature-flags/${encodeURIComponent(key)}`,
      { params: context },
    );
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
