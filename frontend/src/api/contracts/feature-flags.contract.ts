import type {
  FeatureFlagContext,
  FeatureFlagDefinition,
  FeatureFlagDefinitionUpdate,
  FeatureFlagEvaluation,
  FeatureFlagRule,
  FeatureFlagRuleUpdate,
} from "@shongre/contracts/feature-flags";

export interface FeatureFlagAdminEntry {
  definition: FeatureFlagDefinition;
  rules: FeatureFlagRule[];
}

export interface FeatureFlagServiceContract {
  evaluate(
    key: string,
    context?: FeatureFlagContext,
  ): Promise<FeatureFlagEvaluation>;
  getAdminSnapshot(): Promise<FeatureFlagAdminEntry[]>;
  upsertDefinition(
    key: string,
    input: FeatureFlagDefinitionUpdate,
  ): Promise<FeatureFlagDefinition>;
  upsertRule(
    key: string,
    ruleId: string | undefined,
    input: FeatureFlagRuleUpdate,
  ): Promise<FeatureFlagRule>;
}
