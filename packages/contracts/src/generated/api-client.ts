/** AUTO-GENERATED from backend/openapi/openapi.json. DO NOT EDIT. */
import {
  executeApiOperation,
  type ApiTransport,
  type ApiInput,
  type ApiResponse,
} from "../client/operation";
export type { ApiTransport, ApiInput, ApiResponse } from "../client/operation";
export function getDigitalPolicy(
  transport: ApiTransport,
  input: ApiInput<"getDigitalPolicy">,
): Promise<ApiResponse<"getDigitalPolicy">> {
  return executeApiOperation<"getDigitalPolicy">(
    transport,
    "GET",
    "/digital/policy",
    input,
    "application/json",
  );
}
export function getDigitalSellerProfile(
  transport: ApiTransport,
  input: ApiInput<"getDigitalSellerProfile">,
): Promise<ApiResponse<"getDigitalSellerProfile">> {
  return executeApiOperation<"getDigitalSellerProfile">(
    transport,
    "GET",
    "/digital/seller-profile",
    input,
    "application/json",
  );
}
export function putDigitalSellerProfile(
  transport: ApiTransport,
  input: ApiInput<"putDigitalSellerProfile">,
): Promise<ApiResponse<"putDigitalSellerProfile">> {
  return executeApiOperation<"putDigitalSellerProfile">(
    transport,
    "PUT",
    "/digital/seller-profile",
    input,
    "application/json",
  );
}
export function getDigitalSellerProvisioningTasks(
  transport: ApiTransport,
  input: ApiInput<"getDigitalSellerProvisioningTasks">,
): Promise<ApiResponse<"getDigitalSellerProvisioningTasks">> {
  return executeApiOperation<"getDigitalSellerProvisioningTasks">(
    transport,
    "GET",
    "/digital/seller/provisioning-tasks",
    input,
    "application/json",
  );
}
export function postDigitalAssetUpload(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAssetUpload">,
): Promise<ApiResponse<"postDigitalAssetUpload">> {
  return executeApiOperation<"postDigitalAssetUpload">(
    transport,
    "POST",
    "/digital/assets/uploads",
    input,
    "application/json",
  );
}
export function postDigitalAssetUploadComplete(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAssetUploadComplete">,
): Promise<ApiResponse<"postDigitalAssetUploadComplete">> {
  return executeApiOperation<"postDigitalAssetUploadComplete">(
    transport,
    "POST",
    "/digital/assets/uploads/{id}/complete",
    input,
    "application/json",
  );
}
export function getDigitalAsset(
  transport: ApiTransport,
  input: ApiInput<"getDigitalAsset">,
): Promise<ApiResponse<"getDigitalAsset">> {
  return executeApiOperation<"getDigitalAsset">(
    transport,
    "GET",
    "/digital/assets/{id}",
    input,
    "application/json",
  );
}
export function deleteDigitalAsset(
  transport: ApiTransport,
  input: ApiInput<"deleteDigitalAsset">,
): Promise<ApiResponse<"deleteDigitalAsset">> {
  return executeApiOperation<"deleteDigitalAsset">(
    transport,
    "DELETE",
    "/digital/assets/{id}",
    input,
    "application/json",
  );
}
export function postDigitalAccessSecret(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAccessSecret">,
): Promise<ApiResponse<"postDigitalAccessSecret">> {
  return executeApiOperation<"postDigitalAccessSecret">(
    transport,
    "POST",
    "/digital/access-secrets",
    input,
    "application/json",
  );
}
export function postDigitalCredentialBatch(
  transport: ApiTransport,
  input: ApiInput<"postDigitalCredentialBatch">,
): Promise<ApiResponse<"postDigitalCredentialBatch">> {
  return executeApiOperation<"postDigitalCredentialBatch">(
    transport,
    "POST",
    "/digital/credential-batches",
    input,
    "application/json",
  );
}
export function postDigitalCredentialInventory(
  transport: ApiTransport,
  input: ApiInput<"postDigitalCredentialInventory">,
): Promise<ApiResponse<"postDigitalCredentialInventory">> {
  return executeApiOperation<"postDigitalCredentialInventory">(
    transport,
    "POST",
    "/digital/credential-batches/{id}/credentials",
    input,
    "application/json",
  );
}
export function getDigitalCredentialInventory(
  transport: ApiTransport,
  input: ApiInput<"getDigitalCredentialInventory">,
): Promise<ApiResponse<"getDigitalCredentialInventory">> {
  return executeApiOperation<"getDigitalCredentialInventory">(
    transport,
    "GET",
    "/digital/credential-batches/{id}/inventory",
    input,
    "application/json",
  );
}
export function postDigitalFulfillmentVersion(
  transport: ApiTransport,
  input: ApiInput<"postDigitalFulfillmentVersion">,
): Promise<ApiResponse<"postDigitalFulfillmentVersion">> {
  return executeApiOperation<"postDigitalFulfillmentVersion">(
    transport,
    "POST",
    "/digital/listings/{id}/fulfillment-versions",
    input,
    "application/json",
  );
}
export function getDigitalEntitlements(
  transport: ApiTransport,
  input: ApiInput<"getDigitalEntitlements">,
): Promise<ApiResponse<"getDigitalEntitlements">> {
  return executeApiOperation<"getDigitalEntitlements">(
    transport,
    "GET",
    "/digital/entitlements",
    input,
    "application/json",
  );
}
export function getDigitalEntitlement(
  transport: ApiTransport,
  input: ApiInput<"getDigitalEntitlement">,
): Promise<ApiResponse<"getDigitalEntitlement">> {
  return executeApiOperation<"getDigitalEntitlement">(
    transport,
    "GET",
    "/digital/entitlements/{id}",
    input,
    "application/json",
  );
}
export function postDigitalDownloadGrant(
  transport: ApiTransport,
  input: ApiInput<"postDigitalDownloadGrant">,
): Promise<ApiResponse<"postDigitalDownloadGrant">> {
  return executeApiOperation<"postDigitalDownloadGrant">(
    transport,
    "POST",
    "/digital/entitlements/{id}/download-grants",
    input,
    "application/json",
  );
}
export function postDigitalRevealGrant(
  transport: ApiTransport,
  input: ApiInput<"postDigitalRevealGrant">,
): Promise<ApiResponse<"postDigitalRevealGrant">> {
  return executeApiOperation<"postDigitalRevealGrant">(
    transport,
    "POST",
    "/digital/entitlements/{id}/reveal-grants",
    input,
    "application/json",
  );
}
export function postDigitalAccessGrantConsume(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAccessGrantConsume">,
): Promise<ApiResponse<"postDigitalAccessGrantConsume">> {
  return executeApiOperation<"postDigitalAccessGrantConsume">(
    transport,
    "POST",
    "/digital/access-grants/{id}/consume",
    input,
    "application/json",
  );
}
export function postDigitalProvisionedAccess(
  transport: ApiTransport,
  input: ApiInput<"postDigitalProvisionedAccess">,
): Promise<ApiResponse<"postDigitalProvisionedAccess">> {
  return executeApiOperation<"postDigitalProvisionedAccess">(
    transport,
    "POST",
    "/digital/entitlements/{id}/provision",
    input,
    "application/json",
  );
}
export function postDigitalAccessReport(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAccessReport">,
): Promise<ApiResponse<"postDigitalAccessReport">> {
  return executeApiOperation<"postDigitalAccessReport">(
    transport,
    "POST",
    "/digital/entitlements/{id}/reports",
    input,
    "application/json",
  );
}
export function getDigitalAdminOverview(
  transport: ApiTransport,
  input: ApiInput<"getDigitalAdminOverview">,
): Promise<ApiResponse<"getDigitalAdminOverview">> {
  return executeApiOperation<"getDigitalAdminOverview">(
    transport,
    "GET",
    "/digital/admin/overview",
    input,
    "application/json",
  );
}
export function getDigitalAdminPolicy(
  transport: ApiTransport,
  input: ApiInput<"getDigitalAdminPolicy">,
): Promise<ApiResponse<"getDigitalAdminPolicy">> {
  return executeApiOperation<"getDigitalAdminPolicy">(
    transport,
    "GET",
    "/digital/admin/policy",
    input,
    "application/json",
  );
}
export function postDigitalAdminPolicyDraft(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAdminPolicyDraft">,
): Promise<ApiResponse<"postDigitalAdminPolicyDraft">> {
  return executeApiOperation<"postDigitalAdminPolicyDraft">(
    transport,
    "POST",
    "/digital/admin/policy",
    input,
    "application/json",
  );
}
export function postDigitalAdminPolicyActivate(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAdminPolicyActivate">,
): Promise<ApiResponse<"postDigitalAdminPolicyActivate">> {
  return executeApiOperation<"postDigitalAdminPolicyActivate">(
    transport,
    "POST",
    "/digital/admin/policies/{id}/activate",
    input,
    "application/json",
  );
}
export function postDigitalAssetModeration(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAssetModeration">,
): Promise<ApiResponse<"postDigitalAssetModeration">> {
  return executeApiOperation<"postDigitalAssetModeration">(
    transport,
    "POST",
    "/digital/admin/assets/{id}/moderation",
    input,
    "application/json",
  );
}
export function postDigitalFulfillmentModeration(
  transport: ApiTransport,
  input: ApiInput<"postDigitalFulfillmentModeration">,
): Promise<ApiResponse<"postDigitalFulfillmentModeration">> {
  return executeApiOperation<"postDigitalFulfillmentModeration">(
    transport,
    "POST",
    "/digital/admin/fulfillment-versions/{id}/moderation",
    input,
    "application/json",
  );
}
export function postDigitalAccessReportResolve(
  transport: ApiTransport,
  input: ApiInput<"postDigitalAccessReportResolve">,
): Promise<ApiResponse<"postDigitalAccessReportResolve">> {
  return executeApiOperation<"postDigitalAccessReportResolve">(
    transport,
    "POST",
    "/digital/admin/reports/{id}/resolve",
    input,
    "application/json",
  );
}
export function postAccountDelete(
  transport: ApiTransport,
  input: ApiInput<"postAccountDelete">,
): Promise<ApiResponse<"postAccountDelete">> {
  return executeApiOperation<"postAccountDelete">(
    transport,
    "POST",
    "/account/delete",
    input,
    "application/json",
  );
}
export function getAccountExport(
  transport: ApiTransport,
  input: ApiInput<"getAccountExport">,
): Promise<ApiResponse<"getAccountExport">> {
  return executeApiOperation<"getAccountExport">(
    transport,
    "GET",
    "/account/export",
    input,
    "application/json",
  );
}
export function getAccountListings(
  transport: ApiTransport,
  input: ApiInput<"getAccountListings">,
): Promise<ApiResponse<"getAccountListings">> {
  return executeApiOperation<"getAccountListings">(
    transport,
    "GET",
    "/account/listings",
    input,
    "application/json",
  );
}
export function postAccountUpgradeToProfessional(
  transport: ApiTransport,
  input: ApiInput<"postAccountUpgradeToProfessional">,
): Promise<ApiResponse<"postAccountUpgradeToProfessional">> {
  return executeApiOperation<"postAccountUpgradeToProfessional">(
    transport,
    "POST",
    "/account/upgrade-to-professional",
    input,
    "application/json",
  );
}
export function getAdminAuditLogs(
  transport: ApiTransport,
  input: ApiInput<"getAdminAuditLogs">,
): Promise<ApiResponse<"getAdminAuditLogs">> {
  return executeApiOperation<"getAdminAuditLogs">(
    transport,
    "GET",
    "/admin/audit-logs",
    input,
    "application/json",
  );
}
export function getAdminBusinessRules(
  transport: ApiTransport,
  input: ApiInput<"getAdminBusinessRules">,
): Promise<ApiResponse<"getAdminBusinessRules">> {
  return executeApiOperation<"getAdminBusinessRules">(
    transport,
    "GET",
    "/admin/business-rules",
    input,
    "application/json",
  );
}
export function postAdminBusinessRulesDrafts(
  transport: ApiTransport,
  input: ApiInput<"postAdminBusinessRulesDrafts">,
): Promise<ApiResponse<"postAdminBusinessRulesDrafts">> {
  return executeApiOperation<"postAdminBusinessRulesDrafts">(
    transport,
    "POST",
    "/admin/business-rules/drafts",
    input,
    "application/json",
  );
}
export function postAdminBusinessRulesSimulate(
  transport: ApiTransport,
  input: ApiInput<"postAdminBusinessRulesSimulate">,
): Promise<ApiResponse<"postAdminBusinessRulesSimulate">> {
  return executeApiOperation<"postAdminBusinessRulesSimulate">(
    transport,
    "POST",
    "/admin/business-rules/simulate",
    input,
    "application/json",
  );
}
export function postAdminBusinessRulesVersionsByIdApprove(
  transport: ApiTransport,
  input: ApiInput<"postAdminBusinessRulesVersionsByIdApprove">,
): Promise<ApiResponse<"postAdminBusinessRulesVersionsByIdApprove">> {
  return executeApiOperation<"postAdminBusinessRulesVersionsByIdApprove">(
    transport,
    "POST",
    "/admin/business-rules/versions/{id}/approve",
    input,
    "application/json",
  );
}
export function postAdminBusinessRulesVersionsByIdPublish(
  transport: ApiTransport,
  input: ApiInput<"postAdminBusinessRulesVersionsByIdPublish">,
): Promise<ApiResponse<"postAdminBusinessRulesVersionsByIdPublish">> {
  return executeApiOperation<"postAdminBusinessRulesVersionsByIdPublish">(
    transport,
    "POST",
    "/admin/business-rules/versions/{id}/publish",
    input,
    "application/json",
  );
}
export function postAdminBusinessRulesVersionsByIdRollback(
  transport: ApiTransport,
  input: ApiInput<"postAdminBusinessRulesVersionsByIdRollback">,
): Promise<ApiResponse<"postAdminBusinessRulesVersionsByIdRollback">> {
  return executeApiOperation<"postAdminBusinessRulesVersionsByIdRollback">(
    transport,
    "POST",
    "/admin/business-rules/versions/{id}/rollback",
    input,
    "application/json",
  );
}
export function postAdminBusinessRulesVersionsByIdSubmit(
  transport: ApiTransport,
  input: ApiInput<"postAdminBusinessRulesVersionsByIdSubmit">,
): Promise<ApiResponse<"postAdminBusinessRulesVersionsByIdSubmit">> {
  return executeApiOperation<"postAdminBusinessRulesVersionsByIdSubmit">(
    transport,
    "POST",
    "/admin/business-rules/versions/{id}/submit",
    input,
    "application/json",
  );
}
export function getAdminCommissionsAnalytics(
  transport: ApiTransport,
  input: ApiInput<"getAdminCommissionsAnalytics">,
): Promise<ApiResponse<"getAdminCommissionsAnalytics">> {
  return executeApiOperation<"getAdminCommissionsAnalytics">(
    transport,
    "GET",
    "/admin/commissions/analytics",
    input,
    "application/json",
  );
}
export function getAdminCommissionsCalculationsById(
  transport: ApiTransport,
  input: ApiInput<"getAdminCommissionsCalculationsById">,
): Promise<ApiResponse<"getAdminCommissionsCalculationsById">> {
  return executeApiOperation<"getAdminCommissionsCalculationsById">(
    transport,
    "GET",
    "/admin/commissions/calculations/{id}",
    input,
    "application/json",
  );
}
export function postAdminCommissionsCalculationsByIdReversals(
  transport: ApiTransport,
  input: ApiInput<"postAdminCommissionsCalculationsByIdReversals">,
): Promise<ApiResponse<"postAdminCommissionsCalculationsByIdReversals">> {
  return executeApiOperation<"postAdminCommissionsCalculationsByIdReversals">(
    transport,
    "POST",
    "/admin/commissions/calculations/{id}/reversals",
    input,
    "application/json",
  );
}
export function postAdminCommissionsDrafts(
  transport: ApiTransport,
  input: ApiInput<"postAdminCommissionsDrafts">,
): Promise<ApiResponse<"postAdminCommissionsDrafts">> {
  return executeApiOperation<"postAdminCommissionsDrafts">(
    transport,
    "POST",
    "/admin/commissions/drafts",
    input,
    "application/json",
  );
}
export function postAdminCommissionsSimulate(
  transport: ApiTransport,
  input: ApiInput<"postAdminCommissionsSimulate">,
): Promise<ApiResponse<"postAdminCommissionsSimulate">> {
  return executeApiOperation<"postAdminCommissionsSimulate">(
    transport,
    "POST",
    "/admin/commissions/simulate",
    input,
    "application/json",
  );
}
export function postAdminCommissionsVersionsByIdApprove(
  transport: ApiTransport,
  input: ApiInput<"postAdminCommissionsVersionsByIdApprove">,
): Promise<ApiResponse<"postAdminCommissionsVersionsByIdApprove">> {
  return executeApiOperation<"postAdminCommissionsVersionsByIdApprove">(
    transport,
    "POST",
    "/admin/commissions/versions/{id}/approve",
    input,
    "application/json",
  );
}
export function postAdminCommissionsVersionsByIdPublish(
  transport: ApiTransport,
  input: ApiInput<"postAdminCommissionsVersionsByIdPublish">,
): Promise<ApiResponse<"postAdminCommissionsVersionsByIdPublish">> {
  return executeApiOperation<"postAdminCommissionsVersionsByIdPublish">(
    transport,
    "POST",
    "/admin/commissions/versions/{id}/publish",
    input,
    "application/json",
  );
}
export function postAdminCommissionsVersionsByIdSubmit(
  transport: ApiTransport,
  input: ApiInput<"postAdminCommissionsVersionsByIdSubmit">,
): Promise<ApiResponse<"postAdminCommissionsVersionsByIdSubmit">> {
  return executeApiOperation<"postAdminCommissionsVersionsByIdSubmit">(
    transport,
    "POST",
    "/admin/commissions/versions/{id}/submit",
    input,
    "application/json",
  );
}
export function getAdminComplianceAudit(
  transport: ApiTransport,
  input: ApiInput<"getAdminComplianceAudit">,
): Promise<ApiResponse<"getAdminComplianceAudit">> {
  return executeApiOperation<"getAdminComplianceAudit">(
    transport,
    "GET",
    "/admin/compliance/audit",
    input,
    "application/json",
  );
}
export function postAdminComplianceRetentionRun(
  transport: ApiTransport,
  input: ApiInput<"postAdminComplianceRetentionRun">,
): Promise<ApiResponse<"postAdminComplianceRetentionRun">> {
  return executeApiOperation<"postAdminComplianceRetentionRun">(
    transport,
    "POST",
    "/admin/compliance/retention/run",
    input,
    "application/json",
  );
}
export function getAdminComplianceReviews(
  transport: ApiTransport,
  input: ApiInput<"getAdminComplianceReviews">,
): Promise<ApiResponse<"getAdminComplianceReviews">> {
  return executeApiOperation<"getAdminComplianceReviews">(
    transport,
    "GET",
    "/admin/compliance/reviews",
    input,
    "application/json",
  );
}
export function postAdminComplianceReviewsByCaseIdDecision(
  transport: ApiTransport,
  input: ApiInput<"postAdminComplianceReviewsByCaseIdDecision">,
): Promise<ApiResponse<"postAdminComplianceReviewsByCaseIdDecision">> {
  return executeApiOperation<"postAdminComplianceReviewsByCaseIdDecision">(
    transport,
    "POST",
    "/admin/compliance/reviews/{caseId}/decision",
    input,
    "application/json",
  );
}
export function getAdminComplianceRules(
  transport: ApiTransport,
  input: ApiInput<"getAdminComplianceRules">,
): Promise<ApiResponse<"getAdminComplianceRules">> {
  return executeApiOperation<"getAdminComplianceRules">(
    transport,
    "GET",
    "/admin/compliance/rules",
    input,
    "application/json",
  );
}
export function putAdminComplianceRulesByRuleId(
  transport: ApiTransport,
  input: ApiInput<"putAdminComplianceRulesByRuleId">,
): Promise<ApiResponse<"putAdminComplianceRulesByRuleId">> {
  return executeApiOperation<"putAdminComplianceRulesByRuleId">(
    transport,
    "PUT",
    "/admin/compliance/rules/{ruleId}",
    input,
    "application/json",
  );
}
export function postAdminComplianceUsersByUserIdRequirements(
  transport: ApiTransport,
  input: ApiInput<"postAdminComplianceUsersByUserIdRequirements">,
): Promise<ApiResponse<"postAdminComplianceUsersByUserIdRequirements">> {
  return executeApiOperation<"postAdminComplianceUsersByUserIdRequirements">(
    transport,
    "POST",
    "/admin/compliance/users/{userId}/requirements",
    input,
    "application/json",
  );
}
export function getAdminComplianceUsersByUserIdStatus(
  transport: ApiTransport,
  input: ApiInput<"getAdminComplianceUsersByUserIdStatus">,
): Promise<ApiResponse<"getAdminComplianceUsersByUserIdStatus">> {
  return executeApiOperation<"getAdminComplianceUsersByUserIdStatus">(
    transport,
    "GET",
    "/admin/compliance/users/{userId}/status",
    input,
    "application/json",
  );
}
export function patchAdminCountriesByCode(
  transport: ApiTransport,
  input: ApiInput<"patchAdminCountriesByCode">,
): Promise<ApiResponse<"patchAdminCountriesByCode">> {
  return executeApiOperation<"patchAdminCountriesByCode">(
    transport,
    "PATCH",
    "/admin/countries/{code}",
    input,
    "application/json",
  );
}
export function getAdminCountriesByCodeChanges(
  transport: ApiTransport,
  input: ApiInput<"getAdminCountriesByCodeChanges">,
): Promise<ApiResponse<"getAdminCountriesByCodeChanges">> {
  return executeApiOperation<"getAdminCountriesByCodeChanges">(
    transport,
    "GET",
    "/admin/countries/{code}/changes",
    input,
    "application/json",
  );
}
export function postAdminCountriesByCodeChangesByIdApprove(
  transport: ApiTransport,
  input: ApiInput<"postAdminCountriesByCodeChangesByIdApprove">,
): Promise<ApiResponse<"postAdminCountriesByCodeChangesByIdApprove">> {
  return executeApiOperation<"postAdminCountriesByCodeChangesByIdApprove">(
    transport,
    "POST",
    "/admin/countries/{code}/changes/{id}/approve",
    input,
    "application/json",
  );
}
export function postAdminCountriesByCodeChangesByIdReject(
  transport: ApiTransport,
  input: ApiInput<"postAdminCountriesByCodeChangesByIdReject">,
): Promise<ApiResponse<"postAdminCountriesByCodeChangesByIdReject">> {
  return executeApiOperation<"postAdminCountriesByCodeChangesByIdReject">(
    transport,
    "POST",
    "/admin/countries/{code}/changes/{id}/reject",
    input,
    "application/json",
  );
}
export function getAdminDiscoveryConfiguration(
  transport: ApiTransport,
  input: ApiInput<"getAdminDiscoveryConfiguration">,
): Promise<ApiResponse<"getAdminDiscoveryConfiguration">> {
  return executeApiOperation<"getAdminDiscoveryConfiguration">(
    transport,
    "GET",
    "/admin/discovery/configuration",
    input,
    "application/json",
  );
}
export function postAdminDiscoveryConfigurationDrafts(
  transport: ApiTransport,
  input: ApiInput<"postAdminDiscoveryConfigurationDrafts">,
): Promise<ApiResponse<"postAdminDiscoveryConfigurationDrafts">> {
  return executeApiOperation<"postAdminDiscoveryConfigurationDrafts">(
    transport,
    "POST",
    "/admin/discovery/configuration/drafts",
    input,
    "application/json",
  );
}
export function postAdminDiscoveryConfigurationPublish(
  transport: ApiTransport,
  input: ApiInput<"postAdminDiscoveryConfigurationPublish">,
): Promise<ApiResponse<"postAdminDiscoveryConfigurationPublish">> {
  return executeApiOperation<"postAdminDiscoveryConfigurationPublish">(
    transport,
    "POST",
    "/admin/discovery/configuration/publish",
    input,
    "application/json",
  );
}
export function postAdminDiscoveryExplain(
  transport: ApiTransport,
  input: ApiInput<"postAdminDiscoveryExplain">,
): Promise<ApiResponse<"postAdminDiscoveryExplain">> {
  return executeApiOperation<"postAdminDiscoveryExplain">(
    transport,
    "POST",
    "/admin/discovery/explain",
    input,
    "application/json",
  );
}
export function getAdminDiscoveryMetrics(
  transport: ApiTransport,
  input: ApiInput<"getAdminDiscoveryMetrics">,
): Promise<ApiResponse<"getAdminDiscoveryMetrics">> {
  return executeApiOperation<"getAdminDiscoveryMetrics">(
    transport,
    "GET",
    "/admin/discovery/metrics",
    input,
    "application/json",
  );
}
export function getAdminFeatureFlags(
  transport: ApiTransport,
  input: ApiInput<"getAdminFeatureFlags">,
): Promise<ApiResponse<"getAdminFeatureFlags">> {
  return executeApiOperation<"getAdminFeatureFlags">(
    transport,
    "GET",
    "/admin/feature-flags",
    input,
    "application/json",
  );
}
export function putAdminFeatureFlag(
  transport: ApiTransport,
  input: ApiInput<"putAdminFeatureFlag">,
): Promise<ApiResponse<"putAdminFeatureFlag">> {
  return executeApiOperation<"putAdminFeatureFlag">(
    transport,
    "PUT",
    "/admin/feature-flags/{key}",
    input,
    "application/json",
  );
}
export function putAdminFeatureFlagRule(
  transport: ApiTransport,
  input: ApiInput<"putAdminFeatureFlagRule">,
): Promise<ApiResponse<"putAdminFeatureFlagRule">> {
  return executeApiOperation<"putAdminFeatureFlagRule">(
    transport,
    "PUT",
    "/admin/feature-flags/{key}/rules/{ruleId}",
    input,
    "application/json",
  );
}
export function getSolutions(
  transport: ApiTransport,
  input: ApiInput<"getSolutions">,
): Promise<ApiResponse<"getSolutions">> {
  return executeApiOperation<"getSolutions">(
    transport,
    "GET",
    "/solutions",
    input,
    "application/json",
  );
}
export function getSolutionBySlug(
  transport: ApiTransport,
  input: ApiInput<"getSolutionBySlug">,
): Promise<ApiResponse<"getSolutionBySlug">> {
  return executeApiOperation<"getSolutionBySlug">(
    transport,
    "GET",
    "/solutions/{solutionSlug}",
    input,
    "application/json",
  );
}
export function getAdminSolutions(
  transport: ApiTransport,
  input: ApiInput<"getAdminSolutions">,
): Promise<ApiResponse<"getAdminSolutions">> {
  return executeApiOperation<"getAdminSolutions">(
    transport,
    "GET",
    "/admin/solutions",
    input,
    "application/json",
  );
}
export function postAdminSolution(
  transport: ApiTransport,
  input: ApiInput<"postAdminSolution">,
): Promise<ApiResponse<"postAdminSolution">> {
  return executeApiOperation<"postAdminSolution">(
    transport,
    "POST",
    "/admin/solutions",
    input,
    "application/json",
  );
}
export function putAdminSolutionsOrder(
  transport: ApiTransport,
  input: ApiInput<"putAdminSolutionsOrder">,
): Promise<ApiResponse<"putAdminSolutionsOrder">> {
  return executeApiOperation<"putAdminSolutionsOrder">(
    transport,
    "PUT",
    "/admin/solutions/order",
    input,
    "application/json",
  );
}
export function patchAdminSolution(
  transport: ApiTransport,
  input: ApiInput<"patchAdminSolution">,
): Promise<ApiResponse<"patchAdminSolution">> {
  return executeApiOperation<"patchAdminSolution">(
    transport,
    "PATCH",
    "/admin/solutions/{solutionId}",
    input,
    "application/json",
  );
}
export function postAdminSolutionLifecycle(
  transport: ApiTransport,
  input: ApiInput<"postAdminSolutionLifecycle">,
): Promise<ApiResponse<"postAdminSolutionLifecycle">> {
  return executeApiOperation<"postAdminSolutionLifecycle">(
    transport,
    "POST",
    "/admin/solutions/{solutionId}/lifecycle",
    input,
    "application/json",
  );
}
export function getAdminSolutionLifecycleHistory(
  transport: ApiTransport,
  input: ApiInput<"getAdminSolutionLifecycleHistory">,
): Promise<ApiResponse<"getAdminSolutionLifecycleHistory">> {
  return executeApiOperation<"getAdminSolutionLifecycleHistory">(
    transport,
    "GET",
    "/admin/solutions/{solutionId}/lifecycle-history",
    input,
    "application/json",
  );
}
export function getAdminModerationAppeals(
  transport: ApiTransport,
  input: ApiInput<"getAdminModerationAppeals">,
): Promise<ApiResponse<"getAdminModerationAppeals">> {
  return executeApiOperation<"getAdminModerationAppeals">(
    transport,
    "GET",
    "/admin/moderation/appeals",
    input,
    "application/json",
  );
}
export function postAdminModerationAppealDecision(
  transport: ApiTransport,
  input: ApiInput<"postAdminModerationAppealDecision">,
): Promise<ApiResponse<"postAdminModerationAppealDecision">> {
  return executeApiOperation<"postAdminModerationAppealDecision">(
    transport,
    "POST",
    "/admin/moderation/appeals/{appealId}/decision",
    input,
    "application/json",
  );
}
export function getAdminModerationCases(
  transport: ApiTransport,
  input: ApiInput<"getAdminModerationCases">,
): Promise<ApiResponse<"getAdminModerationCases">> {
  return executeApiOperation<"getAdminModerationCases">(
    transport,
    "GET",
    "/admin/moderation/cases",
    input,
    "application/json",
  );
}
export function postAdminMonetizationComplimentaryGrantsRequests(
  transport: ApiTransport,
  input: ApiInput<"postAdminMonetizationComplimentaryGrantsRequests">,
): Promise<ApiResponse<"postAdminMonetizationComplimentaryGrantsRequests">> {
  return executeApiOperation<"postAdminMonetizationComplimentaryGrantsRequests">(
    transport,
    "POST",
    "/admin/monetization/complimentary-grants/requests",
    input,
    "application/json",
  );
}
export function postAdminMonetizationComplimentaryGrantsRequestsByIdDecision(
  transport: ApiTransport,
  input: ApiInput<"postAdminMonetizationComplimentaryGrantsRequestsByIdDecision">,
): Promise<
  ApiResponse<"postAdminMonetizationComplimentaryGrantsRequestsByIdDecision">
> {
  return executeApiOperation<"postAdminMonetizationComplimentaryGrantsRequestsByIdDecision">(
    transport,
    "POST",
    "/admin/monetization/complimentary-grants/requests/{id}/decision",
    input,
    "application/json",
  );
}
export function postAdminProvidersByProviderIdTest(
  transport: ApiTransport,
  input: ApiInput<"postAdminProvidersByProviderIdTest">,
): Promise<ApiResponse<"postAdminProvidersByProviderIdTest">> {
  return executeApiOperation<"postAdminProvidersByProviderIdTest">(
    transport,
    "POST",
    "/admin/providers/{providerId}/test",
    input,
    "application/json",
  );
}
export function getAdminProvidersControlPlane(
  transport: ApiTransport,
  input: ApiInput<"getAdminProvidersControlPlane">,
): Promise<ApiResponse<"getAdminProvidersControlPlane">> {
  return executeApiOperation<"getAdminProvidersControlPlane">(
    transport,
    "GET",
    "/admin/providers/control-plane",
    input,
    "application/json",
  );
}
export function getAdminReports(
  transport: ApiTransport,
  input: ApiInput<"getAdminReports">,
): Promise<ApiResponse<"getAdminReports">> {
  return executeApiOperation<"getAdminReports">(
    transport,
    "GET",
    "/admin/reports",
    input,
    "application/json",
  );
}
export function postAdminReportsByReportIdResolve(
  transport: ApiTransport,
  input: ApiInput<"postAdminReportsByReportIdResolve">,
): Promise<ApiResponse<"postAdminReportsByReportIdResolve">> {
  return executeApiOperation<"postAdminReportsByReportIdResolve">(
    transport,
    "POST",
    "/admin/reports/{reportId}/resolve",
    input,
    "application/json",
  );
}
export function getAdminStats(
  transport: ApiTransport,
  input: ApiInput<"getAdminStats">,
): Promise<ApiResponse<"getAdminStats">> {
  return executeApiOperation<"getAdminStats">(
    transport,
    "GET",
    "/admin/stats",
    input,
    "application/json",
  );
}
export function getAdminHomepageConfiguration(
  transport: ApiTransport,
  input: ApiInput<"getAdminHomepageConfiguration">,
): Promise<ApiResponse<"getAdminHomepageConfiguration">> {
  return executeApiOperation<"getAdminHomepageConfiguration">(
    transport,
    "GET",
    "/admin/homepage/configuration",
    input,
    "application/json",
  );
}
export function putAdminHomepageConfiguration(
  transport: ApiTransport,
  input: ApiInput<"putAdminHomepageConfiguration">,
): Promise<ApiResponse<"putAdminHomepageConfiguration">> {
  return executeApiOperation<"putAdminHomepageConfiguration">(
    transport,
    "PUT",
    "/admin/homepage/configuration",
    input,
    "application/json",
  );
}
export function postAdminHomepagePreview(
  transport: ApiTransport,
  input: ApiInput<"postAdminHomepagePreview">,
): Promise<ApiResponse<"postAdminHomepagePreview">> {
  return executeApiOperation<"postAdminHomepagePreview">(
    transport,
    "POST",
    "/admin/homepage/preview",
    input,
    "application/json",
  );
}
export function postAdminHomepagePublish(
  transport: ApiTransport,
  input: ApiInput<"postAdminHomepagePublish">,
): Promise<ApiResponse<"postAdminHomepagePublish">> {
  return executeApiOperation<"postAdminHomepagePublish">(
    transport,
    "POST",
    "/admin/homepage/publish",
    input,
    "application/json",
  );
}
export function getAdminTaxonomyHeaderNavigation(
  transport: ApiTransport,
  input: ApiInput<"getAdminTaxonomyHeaderNavigation">,
): Promise<ApiResponse<"getAdminTaxonomyHeaderNavigation">> {
  return executeApiOperation<"getAdminTaxonomyHeaderNavigation">(
    transport,
    "GET",
    "/admin/taxonomy/header-navigation",
    input,
    "application/json",
  );
}
export function putAdminTaxonomyHeaderNavigation(
  transport: ApiTransport,
  input: ApiInput<"putAdminTaxonomyHeaderNavigation">,
): Promise<ApiResponse<"putAdminTaxonomyHeaderNavigation">> {
  return executeApiOperation<"putAdminTaxonomyHeaderNavigation">(
    transport,
    "PUT",
    "/admin/taxonomy/header-navigation",
    input,
    "application/json",
  );
}
export function getAdminTrendingConfig(
  transport: ApiTransport,
  input: ApiInput<"getAdminTrendingConfig">,
): Promise<ApiResponse<"getAdminTrendingConfig">> {
  return executeApiOperation<"getAdminTrendingConfig">(
    transport,
    "GET",
    "/admin/trending/config",
    input,
    "application/json",
  );
}
export function putAdminTrendingConfig(
  transport: ApiTransport,
  input: ApiInput<"putAdminTrendingConfig">,
): Promise<ApiResponse<"putAdminTrendingConfig">> {
  return executeApiOperation<"putAdminTrendingConfig">(
    transport,
    "PUT",
    "/admin/trending/config",
    input,
    "application/json",
  );
}
export function putAdminTrendingOverridesByTopicKey(
  transport: ApiTransport,
  input: ApiInput<"putAdminTrendingOverridesByTopicKey">,
): Promise<ApiResponse<"putAdminTrendingOverridesByTopicKey">> {
  return executeApiOperation<"putAdminTrendingOverridesByTopicKey">(
    transport,
    "PUT",
    "/admin/trending/overrides/{topicKey}",
    input,
    "application/json",
  );
}
export function getAdminUsers(
  transport: ApiTransport,
  input: ApiInput<"getAdminUsers">,
): Promise<ApiResponse<"getAdminUsers">> {
  return executeApiOperation<"getAdminUsers">(
    transport,
    "GET",
    "/admin/users",
    input,
    "application/json",
  );
}
export function getAdminUserCapabilities(
  transport: ApiTransport,
  input: ApiInput<"getAdminUserCapabilities">,
): Promise<ApiResponse<"getAdminUserCapabilities">> {
  return executeApiOperation<"getAdminUserCapabilities">(
    transport,
    "GET",
    "/admin/users/{userId}/capabilities",
    input,
    "application/json",
  );
}
export function updateAdminUserCapabilityOverrides(
  transport: ApiTransport,
  input: ApiInput<"updateAdminUserCapabilityOverrides">,
): Promise<ApiResponse<"updateAdminUserCapabilityOverrides">> {
  return executeApiOperation<"updateAdminUserCapabilityOverrides">(
    transport,
    "PUT",
    "/admin/users/{userId}/capability-overrides",
    input,
    "application/json",
  );
}
export function putAdminUsersByUserIdStatus(
  transport: ApiTransport,
  input: ApiInput<"putAdminUsersByUserIdStatus">,
): Promise<ApiResponse<"putAdminUsersByUserIdStatus">> {
  return executeApiOperation<"putAdminUsersByUserIdStatus">(
    transport,
    "PUT",
    "/admin/users/{userId}/status",
    input,
    "application/json",
  );
}
export function updateAdminUserStaffStatus(
  transport: ApiTransport,
  input: ApiInput<"updateAdminUserStaffStatus">,
): Promise<ApiResponse<"updateAdminUserStaffStatus">> {
  return executeApiOperation<"updateAdminUserStaffStatus">(
    transport,
    "PUT",
    "/admin/users/{userId}/staff-status",
    input,
    "application/json",
  );
}
export function putAdminUsersByUserIdVerification(
  transport: ApiTransport,
  input: ApiInput<"putAdminUsersByUserIdVerification">,
): Promise<ApiResponse<"putAdminUsersByUserIdVerification">> {
  return executeApiOperation<"putAdminUsersByUserIdVerification">(
    transport,
    "PUT",
    "/admin/users/{userId}/verification",
    input,
    "application/json",
  );
}
export function postAiListingAssistance(
  transport: ApiTransport,
  input: ApiInput<"postAiListingAssistance">,
): Promise<ApiResponse<"postAiListingAssistance">> {
  return executeApiOperation<"postAiListingAssistance">(
    transport,
    "POST",
    "/ai/listing-assistance",
    input,
    "application/json",
  );
}
export function postAiListingSafety(
  transport: ApiTransport,
  input: ApiInput<"postAiListingSafety">,
): Promise<ApiResponse<"postAiListingSafety">> {
  return executeApiOperation<"postAiListingSafety">(
    transport,
    "POST",
    "/ai/listing-safety",
    input,
    "application/json",
  );
}
export function postAnalyticsEvents(
  transport: ApiTransport,
  input: ApiInput<"postAnalyticsEvents">,
): Promise<ApiResponse<"postAnalyticsEvents">> {
  return executeApiOperation<"postAnalyticsEvents">(
    transport,
    "POST",
    "/analytics/events",
    input,
    "application/json",
  );
}
export function getAnalyticsOverview(
  transport: ApiTransport,
  input: ApiInput<"getAnalyticsOverview">,
): Promise<ApiResponse<"getAnalyticsOverview">> {
  return executeApiOperation<"getAnalyticsOverview">(
    transport,
    "GET",
    "/analytics/overview",
    input,
    "application/json",
  );
}
export function getAnalyticsAcquisition(
  transport: ApiTransport,
  input: ApiInput<"getAnalyticsAcquisition">,
): Promise<ApiResponse<"getAnalyticsAcquisition">> {
  return executeApiOperation<"getAnalyticsAcquisition">(
    transport,
    "GET",
    "/analytics/acquisition",
    input,
    "application/json",
  );
}
export function getAnalyticsSearch(
  transport: ApiTransport,
  input: ApiInput<"getAnalyticsSearch">,
): Promise<ApiResponse<"getAnalyticsSearch">> {
  return executeApiOperation<"getAnalyticsSearch">(
    transport,
    "GET",
    "/analytics/search",
    input,
    "application/json",
  );
}
export function getAnalyticsMonetization(
  transport: ApiTransport,
  input: ApiInput<"getAnalyticsMonetization">,
): Promise<ApiResponse<"getAnalyticsMonetization">> {
  return executeApiOperation<"getAnalyticsMonetization">(
    transport,
    "GET",
    "/analytics/monetization",
    input,
    "application/json",
  );
}
export function getAnalyticsSeo(
  transport: ApiTransport,
  input: ApiInput<"getAnalyticsSeo">,
): Promise<ApiResponse<"getAnalyticsSeo">> {
  return executeApiOperation<"getAnalyticsSeo">(
    transport,
    "GET",
    "/analytics/seo",
    input,
    "application/json",
  );
}
export function getAnalyticsProviders(
  transport: ApiTransport,
  input: ApiInput<"getAnalyticsProviders">,
): Promise<ApiResponse<"getAnalyticsProviders">> {
  return executeApiOperation<"getAnalyticsProviders">(
    transport,
    "GET",
    "/analytics/providers",
    input,
    "application/json",
  );
}
export function getAnalyticsSeller(
  transport: ApiTransport,
  input: ApiInput<"getAnalyticsSeller">,
): Promise<ApiResponse<"getAnalyticsSeller">> {
  return executeApiOperation<"getAnalyticsSeller">(
    transport,
    "GET",
    "/analytics/sellers/{sellerId}",
    input,
    "application/json",
  );
}
export function postAuthDomainHandoffExchange(
  transport: ApiTransport,
  input: ApiInput<"postAuthDomainHandoffExchange">,
): Promise<ApiResponse<"postAuthDomainHandoffExchange">> {
  return executeApiOperation<"postAuthDomainHandoffExchange">(
    transport,
    "POST",
    "/auth/domain-handoff/exchange",
    input,
    "application/json",
  );
}
export function postAuthDomainHandoffStart(
  transport: ApiTransport,
  input: ApiInput<"postAuthDomainHandoffStart">,
): Promise<ApiResponse<"postAuthDomainHandoffStart">> {
  return executeApiOperation<"postAuthDomainHandoffStart">(
    transport,
    "POST",
    "/auth/domain-handoff/start",
    input,
    "application/json",
  );
}
export function deleteAuthIdentitiesByProvider(
  transport: ApiTransport,
  input: ApiInput<"deleteAuthIdentitiesByProvider">,
): Promise<ApiResponse<"deleteAuthIdentitiesByProvider">> {
  return executeApiOperation<"deleteAuthIdentitiesByProvider">(
    transport,
    "DELETE",
    "/auth/identities/{provider}",
    input,
    "application/json",
  );
}
export function postAuthLogin(
  transport: ApiTransport,
  input: ApiInput<"postAuthLogin">,
): Promise<ApiResponse<"postAuthLogin">> {
  return executeApiOperation<"postAuthLogin">(
    transport,
    "POST",
    "/auth/login",
    input,
    "application/json",
  );
}
export function postAuthLogout(
  transport: ApiTransport,
  input: ApiInput<"postAuthLogout">,
): Promise<ApiResponse<"postAuthLogout">> {
  return executeApiOperation<"postAuthLogout">(
    transport,
    "POST",
    "/auth/logout",
    input,
    "application/json",
  );
}
export function postAuthLogoutAll(
  transport: ApiTransport,
  input: ApiInput<"postAuthLogoutAll">,
): Promise<ApiResponse<"postAuthLogoutAll">> {
  return executeApiOperation<"postAuthLogoutAll">(
    transport,
    "POST",
    "/auth/logout-all",
    input,
    "application/json",
  );
}
export function getAuthMe(
  transport: ApiTransport,
  input: ApiInput<"getAuthMe">,
): Promise<ApiResponse<"getAuthMe">> {
  return executeApiOperation<"getAuthMe">(
    transport,
    "GET",
    "/auth/me",
    input,
    "application/json",
  );
}
export function getAuthMfa(
  transport: ApiTransport,
  input: ApiInput<"getAuthMfa">,
): Promise<ApiResponse<"getAuthMfa">> {
  return executeApiOperation<"getAuthMfa">(
    transport,
    "GET",
    "/auth/mfa",
    input,
    "application/json",
  );
}
export function deleteAuthMfa(
  transport: ApiTransport,
  input: ApiInput<"deleteAuthMfa">,
): Promise<ApiResponse<"deleteAuthMfa">> {
  return executeApiOperation<"deleteAuthMfa">(
    transport,
    "DELETE",
    "/auth/mfa",
    input,
    "application/json",
  );
}
export function postAuthMfaChallenge(
  transport: ApiTransport,
  input: ApiInput<"postAuthMfaChallenge">,
): Promise<ApiResponse<"postAuthMfaChallenge">> {
  return executeApiOperation<"postAuthMfaChallenge">(
    transport,
    "POST",
    "/auth/mfa/challenge",
    input,
    "application/json",
  );
}
export function postAuthMfaConfirm(
  transport: ApiTransport,
  input: ApiInput<"postAuthMfaConfirm">,
): Promise<ApiResponse<"postAuthMfaConfirm">> {
  return executeApiOperation<"postAuthMfaConfirm">(
    transport,
    "POST",
    "/auth/mfa/confirm",
    input,
    "application/json",
  );
}
export function postAuthMfaSessionConfirm(
  transport: ApiTransport,
  input: ApiInput<"postAuthMfaSessionConfirm">,
): Promise<ApiResponse<"postAuthMfaSessionConfirm">> {
  return executeApiOperation<"postAuthMfaSessionConfirm">(
    transport,
    "POST",
    "/auth/mfa/session-confirm",
    input,
    "application/json",
  );
}
export function postAuthMfaSetup(
  transport: ApiTransport,
  input: ApiInput<"postAuthMfaSetup">,
): Promise<ApiResponse<"postAuthMfaSetup">> {
  return executeApiOperation<"postAuthMfaSetup">(
    transport,
    "POST",
    "/auth/mfa/setup",
    input,
    "application/json",
  );
}
export function postAuthOauthByProviderStart(
  transport: ApiTransport,
  input: ApiInput<"postAuthOauthByProviderStart">,
): Promise<ApiResponse<"postAuthOauthByProviderStart">> {
  return executeApiOperation<"postAuthOauthByProviderStart">(
    transport,
    "POST",
    "/auth/oauth/{provider}/start",
    input,
    "application/json",
  );
}
export function postAuthOauthCompleteProfile(
  transport: ApiTransport,
  input: ApiInput<"postAuthOauthCompleteProfile">,
): Promise<ApiResponse<"postAuthOauthCompleteProfile">> {
  return executeApiOperation<"postAuthOauthCompleteProfile">(
    transport,
    "POST",
    "/auth/oauth/complete-profile",
    input,
    "application/json",
  );
}
export function postAuthOauthFacebookDataDeletion(
  transport: ApiTransport,
  input: ApiInput<"postAuthOauthFacebookDataDeletion">,
): Promise<ApiResponse<"postAuthOauthFacebookDataDeletion">> {
  return executeApiOperation<"postAuthOauthFacebookDataDeletion">(
    transport,
    "POST",
    "/auth/oauth/facebook/data-deletion",
    input,
    "application/json",
  );
}
export function getAuthOauthFacebookDataDeletionStatus(
  transport: ApiTransport,
  input: ApiInput<"getAuthOauthFacebookDataDeletionStatus">,
): Promise<ApiResponse<"getAuthOauthFacebookDataDeletionStatus">> {
  return executeApiOperation<"getAuthOauthFacebookDataDeletionStatus">(
    transport,
    "GET",
    "/auth/oauth/facebook/data-deletion/status",
    input,
    "application/json",
  );
}
export function postAuthOauthNativeExchange(
  transport: ApiTransport,
  input: ApiInput<"postAuthOauthNativeExchange">,
): Promise<ApiResponse<"postAuthOauthNativeExchange">> {
  return executeApiOperation<"postAuthOauthNativeExchange">(
    transport,
    "POST",
    "/auth/oauth/native-exchange",
    input,
    "application/json",
  );
}
export function getAuthOauthProviders(
  transport: ApiTransport,
  input: ApiInput<"getAuthOauthProviders">,
): Promise<ApiResponse<"getAuthOauthProviders">> {
  return executeApiOperation<"getAuthOauthProviders">(
    transport,
    "GET",
    "/auth/oauth/providers",
    input,
    "application/json",
  );
}
export function postAuthPasswordAdd(
  transport: ApiTransport,
  input: ApiInput<"postAuthPasswordAdd">,
): Promise<ApiResponse<"postAuthPasswordAdd">> {
  return executeApiOperation<"postAuthPasswordAdd">(
    transport,
    "POST",
    "/auth/password/add",
    input,
    "application/json",
  );
}
export function postAuthPasswordChange(
  transport: ApiTransport,
  input: ApiInput<"postAuthPasswordChange">,
): Promise<ApiResponse<"postAuthPasswordChange">> {
  return executeApiOperation<"postAuthPasswordChange">(
    transport,
    "POST",
    "/auth/password/change",
    input,
    "application/json",
  );
}
export function postAuthPasswordForgot(
  transport: ApiTransport,
  input: ApiInput<"postAuthPasswordForgot">,
): Promise<ApiResponse<"postAuthPasswordForgot">> {
  return executeApiOperation<"postAuthPasswordForgot">(
    transport,
    "POST",
    "/auth/password/forgot",
    input,
    "application/json",
  );
}
export function postAuthPasswordReset(
  transport: ApiTransport,
  input: ApiInput<"postAuthPasswordReset">,
): Promise<ApiResponse<"postAuthPasswordReset">> {
  return executeApiOperation<"postAuthPasswordReset">(
    transport,
    "POST",
    "/auth/password/reset",
    input,
    "application/json",
  );
}
export function postAuthReauthenticate(
  transport: ApiTransport,
  input: ApiInput<"postAuthReauthenticate">,
): Promise<ApiResponse<"postAuthReauthenticate">> {
  return executeApiOperation<"postAuthReauthenticate">(
    transport,
    "POST",
    "/auth/reauthenticate",
    input,
    "application/json",
  );
}
export function postAuthRefresh(
  transport: ApiTransport,
  input: ApiInput<"postAuthRefresh">,
): Promise<ApiResponse<"postAuthRefresh">> {
  return executeApiOperation<"postAuthRefresh">(
    transport,
    "POST",
    "/auth/refresh",
    input,
    "application/json",
  );
}
export function postAuthRegister(
  transport: ApiTransport,
  input: ApiInput<"postAuthRegister">,
): Promise<ApiResponse<"postAuthRegister">> {
  return executeApiOperation<"postAuthRegister">(
    transport,
    "POST",
    "/auth/register",
    input,
    "application/json",
  );
}
export function getAuthSecurity(
  transport: ApiTransport,
  input: ApiInput<"getAuthSecurity">,
): Promise<ApiResponse<"getAuthSecurity">> {
  return executeApiOperation<"getAuthSecurity">(
    transport,
    "GET",
    "/auth/security",
    input,
    "application/json",
  );
}
export function getAuthSessions(
  transport: ApiTransport,
  input: ApiInput<"getAuthSessions">,
): Promise<ApiResponse<"getAuthSessions">> {
  return executeApiOperation<"getAuthSessions">(
    transport,
    "GET",
    "/auth/sessions",
    input,
    "application/json",
  );
}
export function deleteAuthSessionsById(
  transport: ApiTransport,
  input: ApiInput<"deleteAuthSessionsById">,
): Promise<ApiResponse<"deleteAuthSessionsById">> {
  return executeApiOperation<"deleteAuthSessionsById">(
    transport,
    "DELETE",
    "/auth/sessions/{id}",
    input,
    "application/json",
  );
}
export function postAuthSwitchRole(
  transport: ApiTransport,
  input: ApiInput<"postAuthSwitchRole">,
): Promise<ApiResponse<"postAuthSwitchRole">> {
  return executeApiOperation<"postAuthSwitchRole">(
    transport,
    "POST",
    "/auth/switch-role",
    input,
    "application/json",
  );
}
export function postAuthVerifyEmail(
  transport: ApiTransport,
  input: ApiInput<"postAuthVerifyEmail">,
): Promise<ApiResponse<"postAuthVerifyEmail">> {
  return executeApiOperation<"postAuthVerifyEmail">(
    transport,
    "POST",
    "/auth/verify-email",
    input,
    "application/json",
  );
}
export function postAuthVerifyEmailResend(
  transport: ApiTransport,
  input: ApiInput<"postAuthVerifyEmailResend">,
): Promise<ApiResponse<"postAuthVerifyEmailResend">> {
  return executeApiOperation<"postAuthVerifyEmailResend">(
    transport,
    "POST",
    "/auth/verify-email/resend",
    input,
    "application/json",
  );
}
export function postAuthVerifyPhone(
  transport: ApiTransport,
  input: ApiInput<"postAuthVerifyPhone">,
): Promise<ApiResponse<"postAuthVerifyPhone">> {
  return executeApiOperation<"postAuthVerifyPhone">(
    transport,
    "POST",
    "/auth/verify-phone",
    input,
    "application/json",
  );
}
export function putAutoAdminMarketsByMarketCode(
  transport: ApiTransport,
  input: ApiInput<"putAutoAdminMarketsByMarketCode">,
): Promise<ApiResponse<"putAutoAdminMarketsByMarketCode">> {
  return executeApiOperation<"putAutoAdminMarketsByMarketCode">(
    transport,
    "PUT",
    "/auto/admin/markets/{marketCode}",
    input,
    "application/json",
  );
}
export function patchAutoAdminMarketsByMarketCodeAddOnsByAddOnId(
  transport: ApiTransport,
  input: ApiInput<"patchAutoAdminMarketsByMarketCodeAddOnsByAddOnId">,
): Promise<ApiResponse<"patchAutoAdminMarketsByMarketCodeAddOnsByAddOnId">> {
  return executeApiOperation<"patchAutoAdminMarketsByMarketCodeAddOnsByAddOnId">(
    transport,
    "PATCH",
    "/auto/admin/markets/{marketCode}/add-ons/{addOnId}",
    input,
    "application/json",
  );
}
export function patchAutoAdminMarketsByMarketCodePlansByPlanId(
  transport: ApiTransport,
  input: ApiInput<"patchAutoAdminMarketsByMarketCodePlansByPlanId">,
): Promise<ApiResponse<"patchAutoAdminMarketsByMarketCodePlansByPlanId">> {
  return executeApiOperation<"patchAutoAdminMarketsByMarketCodePlansByPlanId">(
    transport,
    "PATCH",
    "/auto/admin/markets/{marketCode}/plans/{planId}",
    input,
    "application/json",
  );
}
export function getAutoAdminOverview(
  transport: ApiTransport,
  input: ApiInput<"getAutoAdminOverview">,
): Promise<ApiResponse<"getAutoAdminOverview">> {
  return executeApiOperation<"getAutoAdminOverview">(
    transport,
    "GET",
    "/auto/admin/overview",
    input,
    "application/json",
  );
}
export function getAutoCatalog(
  transport: ApiTransport,
  input: ApiInput<"getAutoCatalog">,
): Promise<ApiResponse<"getAutoCatalog">> {
  return executeApiOperation<"getAutoCatalog">(
    transport,
    "GET",
    "/auto/catalog",
    input,
    "application/json",
  );
}
export function postAutoDealersByOrganizationIdImports(
  transport: ApiTransport,
  input: ApiInput<"postAutoDealersByOrganizationIdImports">,
): Promise<ApiResponse<"postAutoDealersByOrganizationIdImports">> {
  return executeApiOperation<"postAutoDealersByOrganizationIdImports">(
    transport,
    "POST",
    "/auto/dealers/{organizationId}/imports",
    input,
    "application/json",
  );
}
export function patchAutoDealersByOrganizationIdLeadsByLeadId(
  transport: ApiTransport,
  input: ApiInput<"patchAutoDealersByOrganizationIdLeadsByLeadId">,
): Promise<ApiResponse<"patchAutoDealersByOrganizationIdLeadsByLeadId">> {
  return executeApiOperation<"patchAutoDealersByOrganizationIdLeadsByLeadId">(
    transport,
    "PATCH",
    "/auto/dealers/{organizationId}/leads/{leadId}",
    input,
    "application/json",
  );
}
export function getAutoDealersByOrganizationIdWorkspace(
  transport: ApiTransport,
  input: ApiInput<"getAutoDealersByOrganizationIdWorkspace">,
): Promise<ApiResponse<"getAutoDealersByOrganizationIdWorkspace">> {
  return executeApiOperation<"getAutoDealersByOrganizationIdWorkspace">(
    transport,
    "GET",
    "/auto/dealers/{organizationId}/workspace",
    input,
    "application/json",
  );
}
export function postAutoDrafts(
  transport: ApiTransport,
  input: ApiInput<"postAutoDrafts">,
): Promise<ApiResponse<"postAutoDrafts">> {
  return executeApiOperation<"postAutoDrafts">(
    transport,
    "POST",
    "/auto/drafts",
    input,
    "application/json",
  );
}
export function getAutoDraftsById(
  transport: ApiTransport,
  input: ApiInput<"getAutoDraftsById">,
): Promise<ApiResponse<"getAutoDraftsById">> {
  return executeApiOperation<"getAutoDraftsById">(
    transport,
    "GET",
    "/auto/drafts/{id}",
    input,
    "application/json",
  );
}
export function putAutoDraftsById(
  transport: ApiTransport,
  input: ApiInput<"putAutoDraftsById">,
): Promise<ApiResponse<"putAutoDraftsById">> {
  return executeApiOperation<"putAutoDraftsById">(
    transport,
    "PUT",
    "/auto/drafts/{id}",
    input,
    "application/json",
  );
}
export function postAutoDraftsByIdDuplicateCheck(
  transport: ApiTransport,
  input: ApiInput<"postAutoDraftsByIdDuplicateCheck">,
): Promise<ApiResponse<"postAutoDraftsByIdDuplicateCheck">> {
  return executeApiOperation<"postAutoDraftsByIdDuplicateCheck">(
    transport,
    "POST",
    "/auto/drafts/{id}/duplicate-check",
    input,
    "application/json",
  );
}
export function postAutoDraftsByIdSubmit(
  transport: ApiTransport,
  input: ApiInput<"postAutoDraftsByIdSubmit">,
): Promise<ApiResponse<"postAutoDraftsByIdSubmit">> {
  return executeApiOperation<"postAutoDraftsByIdSubmit">(
    transport,
    "POST",
    "/auto/drafts/{id}/submit",
    input,
    "application/json",
  );
}
export function getAutoFavorites(
  transport: ApiTransport,
  input: ApiInput<"getAutoFavorites">,
): Promise<ApiResponse<"getAutoFavorites">> {
  return executeApiOperation<"getAutoFavorites">(
    transport,
    "GET",
    "/auto/favorites",
    input,
    "application/json",
  );
}
export function postAutoLeads(
  transport: ApiTransport,
  input: ApiInput<"postAutoLeads">,
): Promise<ApiResponse<"postAutoLeads">> {
  return executeApiOperation<"postAutoLeads">(
    transport,
    "POST",
    "/auto/leads",
    input,
    "application/json",
  );
}
export function postAutoSearch(
  transport: ApiTransport,
  input: ApiInput<"postAutoSearch">,
): Promise<ApiResponse<"postAutoSearch">> {
  return executeApiOperation<"postAutoSearch">(
    transport,
    "POST",
    "/auto/search",
    input,
    "application/json",
  );
}
export function postAutoVehicles(
  transport: ApiTransport,
  input: ApiInput<"postAutoVehicles">,
): Promise<ApiResponse<"postAutoVehicles">> {
  return executeApiOperation<"postAutoVehicles">(
    transport,
    "POST",
    "/auto/vehicles",
    input,
    "application/json",
  );
}
export function getAutoVehiclesById(
  transport: ApiTransport,
  input: ApiInput<"getAutoVehiclesById">,
): Promise<ApiResponse<"getAutoVehiclesById">> {
  return executeApiOperation<"getAutoVehiclesById">(
    transport,
    "GET",
    "/auto/vehicles/{id}",
    input,
    "application/json",
  );
}
export function putAutoVehiclesByIdFavorite(
  transport: ApiTransport,
  input: ApiInput<"putAutoVehiclesByIdFavorite">,
): Promise<ApiResponse<"putAutoVehiclesByIdFavorite">> {
  return executeApiOperation<"putAutoVehiclesByIdFavorite">(
    transport,
    "PUT",
    "/auto/vehicles/{id}/favorite",
    input,
    "application/json",
  );
}
export function getBusinessRulesCatalog(
  transport: ApiTransport,
  input: ApiInput<"getBusinessRulesCatalog">,
): Promise<ApiResponse<"getBusinessRulesCatalog">> {
  return executeApiOperation<"getBusinessRulesCatalog">(
    transport,
    "GET",
    "/business-rules/catalog",
    input,
    "application/json",
  );
}
export function postBusinessRulesEligibility(
  transport: ApiTransport,
  input: ApiInput<"postBusinessRulesEligibility">,
): Promise<ApiResponse<"postBusinessRulesEligibility">> {
  return executeApiOperation<"postBusinessRulesEligibility">(
    transport,
    "POST",
    "/business-rules/eligibility",
    input,
    "application/json",
  );
}
export function postComplianceIdentitySession(
  transport: ApiTransport,
  input: ApiInput<"postComplianceIdentitySession">,
): Promise<ApiResponse<"postComplianceIdentitySession">> {
  return executeApiOperation<"postComplianceIdentitySession">(
    transport,
    "POST",
    "/compliance/identity/session",
    input,
    "application/json",
  );
}
export function postComplianceManualReview(
  transport: ApiTransport,
  input: ApiInput<"postComplianceManualReview">,
): Promise<ApiResponse<"postComplianceManualReview">> {
  return executeApiOperation<"postComplianceManualReview">(
    transport,
    "POST",
    "/compliance/manual-review",
    input,
    "application/json",
  );
}
export function postCompliancePaymentOnboarding(
  transport: ApiTransport,
  input: ApiInput<"postCompliancePaymentOnboarding">,
): Promise<ApiResponse<"postCompliancePaymentOnboarding">> {
  return executeApiOperation<"postCompliancePaymentOnboarding">(
    transport,
    "POST",
    "/compliance/payment/onboarding",
    input,
    "application/json",
  );
}
export function postComplianceRequirements(
  transport: ApiTransport,
  input: ApiInput<"postComplianceRequirements">,
): Promise<ApiResponse<"postComplianceRequirements">> {
  return executeApiOperation<"postComplianceRequirements">(
    transport,
    "POST",
    "/compliance/requirements",
    input,
    "application/json",
  );
}
export function getComplianceStatus(
  transport: ApiTransport,
  input: ApiInput<"getComplianceStatus">,
): Promise<ApiResponse<"getComplianceStatus">> {
  return executeApiOperation<"getComplianceStatus">(
    transport,
    "GET",
    "/compliance/status",
    input,
    "application/json",
  );
}
export function checkCrmAccountDuplicates(
  transport: ApiTransport,
  input: ApiInput<"checkCrmAccountDuplicates">,
): Promise<ApiResponse<"checkCrmAccountDuplicates">> {
  return executeApiOperation<"checkCrmAccountDuplicates">(
    transport,
    "POST",
    "/crm/account-duplicates/check",
    input,
    "application/json",
  );
}
export function listCrmAccounts(
  transport: ApiTransport,
  input: ApiInput<"listCrmAccounts">,
): Promise<ApiResponse<"listCrmAccounts">> {
  return executeApiOperation<"listCrmAccounts">(
    transport,
    "GET",
    "/crm/accounts",
    input,
    "application/json",
  );
}
export function createCrmAccount(
  transport: ApiTransport,
  input: ApiInput<"createCrmAccount">,
): Promise<ApiResponse<"createCrmAccount">> {
  return executeApiOperation<"createCrmAccount">(
    transport,
    "POST",
    "/crm/accounts",
    input,
    "application/json",
  );
}
export function getCrmAccount(
  transport: ApiTransport,
  input: ApiInput<"getCrmAccount">,
): Promise<ApiResponse<"getCrmAccount">> {
  return executeApiOperation<"getCrmAccount">(
    transport,
    "GET",
    "/crm/accounts/{accountId}",
    input,
    "application/json",
  );
}
export function updateCrmAccount(
  transport: ApiTransport,
  input: ApiInput<"updateCrmAccount">,
): Promise<ApiResponse<"updateCrmAccount">> {
  return executeApiOperation<"updateCrmAccount">(
    transport,
    "PATCH",
    "/crm/accounts/{accountId}",
    input,
    "application/json",
  );
}
export function getCrmAccountShongreIntelligence(
  transport: ApiTransport,
  input: ApiInput<"getCrmAccountShongreIntelligence">,
): Promise<ApiResponse<"getCrmAccountShongreIntelligence">> {
  return executeApiOperation<"getCrmAccountShongreIntelligence">(
    transport,
    "GET",
    "/crm/accounts/{accountId}/shongre",
    input,
    "application/json",
  );
}
export function listCrmActivities(
  transport: ApiTransport,
  input: ApiInput<"listCrmActivities">,
): Promise<ApiResponse<"listCrmActivities">> {
  return executeApiOperation<"listCrmActivities">(
    transport,
    "GET",
    "/crm/activities",
    input,
    "application/json",
  );
}
export function createCrmActivity(
  transport: ApiTransport,
  input: ApiInput<"createCrmActivity">,
): Promise<ApiResponse<"createCrmActivity">> {
  return executeApiOperation<"createCrmActivity">(
    transport,
    "POST",
    "/crm/activities",
    input,
    "application/json",
  );
}
export function listCrmContacts(
  transport: ApiTransport,
  input: ApiInput<"listCrmContacts">,
): Promise<ApiResponse<"listCrmContacts">> {
  return executeApiOperation<"listCrmContacts">(
    transport,
    "GET",
    "/crm/contacts",
    input,
    "application/json",
  );
}
export function createCrmContact(
  transport: ApiTransport,
  input: ApiInput<"createCrmContact">,
): Promise<ApiResponse<"createCrmContact">> {
  return executeApiOperation<"createCrmContact">(
    transport,
    "POST",
    "/crm/contacts",
    input,
    "application/json",
  );
}
export function getCrmContact(
  transport: ApiTransport,
  input: ApiInput<"getCrmContact">,
): Promise<ApiResponse<"getCrmContact">> {
  return executeApiOperation<"getCrmContact">(
    transport,
    "GET",
    "/crm/contacts/{contactId}",
    input,
    "application/json",
  );
}
export function updateCrmContact(
  transport: ApiTransport,
  input: ApiInput<"updateCrmContact">,
): Promise<ApiResponse<"updateCrmContact">> {
  return executeApiOperation<"updateCrmContact">(
    transport,
    "PATCH",
    "/crm/contacts/{contactId}",
    input,
    "application/json",
  );
}
export function listCrmCustomFields(
  transport: ApiTransport,
  input: ApiInput<"listCrmCustomFields">,
): Promise<ApiResponse<"listCrmCustomFields">> {
  return executeApiOperation<"listCrmCustomFields">(
    transport,
    "GET",
    "/crm/custom-fields",
    input,
    "application/json",
  );
}
export function createCrmCustomField(
  transport: ApiTransport,
  input: ApiInput<"createCrmCustomField">,
): Promise<ApiResponse<"createCrmCustomField">> {
  return executeApiOperation<"createCrmCustomField">(
    transport,
    "POST",
    "/crm/custom-fields",
    input,
    "application/json",
  );
}
export function listCrmSavedViews(
  transport: ApiTransport,
  input: ApiInput<"listCrmSavedViews">,
): Promise<ApiResponse<"listCrmSavedViews">> {
  return executeApiOperation<"listCrmSavedViews">(
    transport,
    "GET",
    "/crm/saved-views",
    input,
    "application/json",
  );
}
export function createCrmSavedView(
  transport: ApiTransport,
  input: ApiInput<"createCrmSavedView">,
): Promise<ApiResponse<"createCrmSavedView">> {
  return executeApiOperation<"createCrmSavedView">(
    transport,
    "POST",
    "/crm/saved-views",
    input,
    "application/json",
  );
}
export function updateCrmSavedView(
  transport: ApiTransport,
  input: ApiInput<"updateCrmSavedView">,
): Promise<ApiResponse<"updateCrmSavedView">> {
  return executeApiOperation<"updateCrmSavedView">(
    transport,
    "PUT",
    "/crm/saved-views/{savedViewId}",
    input,
    "application/json",
  );
}
export function deleteCrmSavedView(
  transport: ApiTransport,
  input: ApiInput<"deleteCrmSavedView">,
): Promise<ApiResponse<"deleteCrmSavedView">> {
  return executeApiOperation<"deleteCrmSavedView">(
    transport,
    "DELETE",
    "/crm/saved-views/{savedViewId}",
    input,
    "application/json",
  );
}
export function createPublicMarketingSubscription(
  transport: ApiTransport,
  input: ApiInput<"createPublicMarketingSubscription">,
): Promise<ApiResponse<"createPublicMarketingSubscription">> {
  return executeApiOperation<"createPublicMarketingSubscription">(
    transport,
    "POST",
    "/marketing/public/subscriptions",
    input,
    "application/json",
  );
}
export function confirmPublicMarketingSubscription(
  transport: ApiTransport,
  input: ApiInput<"confirmPublicMarketingSubscription">,
): Promise<ApiResponse<"confirmPublicMarketingSubscription">> {
  return executeApiOperation<"confirmPublicMarketingSubscription">(
    transport,
    "POST",
    "/marketing/public/confirm",
    input,
    "application/json",
  );
}
export function getPublicMarketingPreferences(
  transport: ApiTransport,
  input: ApiInput<"getPublicMarketingPreferences">,
): Promise<ApiResponse<"getPublicMarketingPreferences">> {
  return executeApiOperation<"getPublicMarketingPreferences">(
    transport,
    "GET",
    "/marketing/public/preferences",
    input,
    "application/json",
  );
}
export function updatePublicMarketingPreferences(
  transport: ApiTransport,
  input: ApiInput<"updatePublicMarketingPreferences">,
): Promise<ApiResponse<"updatePublicMarketingPreferences">> {
  return executeApiOperation<"updatePublicMarketingPreferences">(
    transport,
    "PUT",
    "/marketing/public/preferences",
    input,
    "application/json",
  );
}
export function unsubscribePublicMarketingProfile(
  transport: ApiTransport,
  input: ApiInput<"unsubscribePublicMarketingProfile">,
): Promise<ApiResponse<"unsubscribePublicMarketingProfile">> {
  return executeApiOperation<"unsubscribePublicMarketingProfile">(
    transport,
    "POST",
    "/marketing/public/unsubscribe",
    input,
    "application/json",
  );
}
export function getAccountMarketingSubscription(
  transport: ApiTransport,
  input: ApiInput<"getAccountMarketingSubscription">,
): Promise<ApiResponse<"getAccountMarketingSubscription">> {
  return executeApiOperation<"getAccountMarketingSubscription">(
    transport,
    "GET",
    "/marketing/account/subscription",
    input,
    "application/json",
  );
}
export function subscribeAccountToMarketing(
  transport: ApiTransport,
  input: ApiInput<"subscribeAccountToMarketing">,
): Promise<ApiResponse<"subscribeAccountToMarketing">> {
  return executeApiOperation<"subscribeAccountToMarketing">(
    transport,
    "POST",
    "/marketing/account/subscription",
    input,
    "application/json",
  );
}
export function updateAccountMarketingPreferences(
  transport: ApiTransport,
  input: ApiInput<"updateAccountMarketingPreferences">,
): Promise<ApiResponse<"updateAccountMarketingPreferences">> {
  return executeApiOperation<"updateAccountMarketingPreferences">(
    transport,
    "PUT",
    "/marketing/account/preferences",
    input,
    "application/json",
  );
}
export function unsubscribeAccountFromMarketing(
  transport: ApiTransport,
  input: ApiInput<"unsubscribeAccountFromMarketing">,
): Promise<ApiResponse<"unsubscribeAccountFromMarketing">> {
  return executeApiOperation<"unsubscribeAccountFromMarketing">(
    transport,
    "POST",
    "/marketing/account/unsubscribe",
    input,
    "application/json",
  );
}
export function getMarketingDashboard(
  transport: ApiTransport,
  input: ApiInput<"getMarketingDashboard">,
): Promise<ApiResponse<"getMarketingDashboard">> {
  return executeApiOperation<"getMarketingDashboard">(
    transport,
    "GET",
    "/marketing/dashboard",
    input,
    "application/json",
  );
}
export function listMarketingProfiles(
  transport: ApiTransport,
  input: ApiInput<"listMarketingProfiles">,
): Promise<ApiResponse<"listMarketingProfiles">> {
  return executeApiOperation<"listMarketingProfiles">(
    transport,
    "GET",
    "/marketing/profiles",
    input,
    "application/json",
  );
}
export function createMarketingProfile(
  transport: ApiTransport,
  input: ApiInput<"createMarketingProfile">,
): Promise<ApiResponse<"createMarketingProfile">> {
  return executeApiOperation<"createMarketingProfile">(
    transport,
    "POST",
    "/marketing/profiles",
    input,
    "application/json",
  );
}
export function confirmMarketingProfile(
  transport: ApiTransport,
  input: ApiInput<"confirmMarketingProfile">,
): Promise<ApiResponse<"confirmMarketingProfile">> {
  return executeApiOperation<"confirmMarketingProfile">(
    transport,
    "POST",
    "/marketing/profiles/{profileId}/confirm",
    input,
    "application/json",
  );
}
export function unsubscribeMarketingProfile(
  transport: ApiTransport,
  input: ApiInput<"unsubscribeMarketingProfile">,
): Promise<ApiResponse<"unsubscribeMarketingProfile">> {
  return executeApiOperation<"unsubscribeMarketingProfile">(
    transport,
    "POST",
    "/marketing/profiles/{profileId}/unsubscribe",
    input,
    "application/json",
  );
}
export function listMarketingLists(
  transport: ApiTransport,
  input: ApiInput<"listMarketingLists">,
): Promise<ApiResponse<"listMarketingLists">> {
  return executeApiOperation<"listMarketingLists">(
    transport,
    "GET",
    "/marketing/lists",
    input,
    "application/json",
  );
}
export function createMarketingList(
  transport: ApiTransport,
  input: ApiInput<"createMarketingList">,
): Promise<ApiResponse<"createMarketingList">> {
  return executeApiOperation<"createMarketingList">(
    transport,
    "POST",
    "/marketing/lists",
    input,
    "application/json",
  );
}
export function addMarketingListMember(
  transport: ApiTransport,
  input: ApiInput<"addMarketingListMember">,
): Promise<ApiResponse<"addMarketingListMember">> {
  return executeApiOperation<"addMarketingListMember">(
    transport,
    "POST",
    "/marketing/lists/{listId}/members/{profileId}",
    input,
    "application/json",
  );
}
export function listMarketingSegments(
  transport: ApiTransport,
  input: ApiInput<"listMarketingSegments">,
): Promise<ApiResponse<"listMarketingSegments">> {
  return executeApiOperation<"listMarketingSegments">(
    transport,
    "GET",
    "/marketing/segments",
    input,
    "application/json",
  );
}
export function createMarketingSegment(
  transport: ApiTransport,
  input: ApiInput<"createMarketingSegment">,
): Promise<ApiResponse<"createMarketingSegment">> {
  return executeApiOperation<"createMarketingSegment">(
    transport,
    "POST",
    "/marketing/segments",
    input,
    "application/json",
  );
}
export function listMarketingTemplates(
  transport: ApiTransport,
  input: ApiInput<"listMarketingTemplates">,
): Promise<ApiResponse<"listMarketingTemplates">> {
  return executeApiOperation<"listMarketingTemplates">(
    transport,
    "GET",
    "/marketing/templates",
    input,
    "application/json",
  );
}
export function createMarketingTemplate(
  transport: ApiTransport,
  input: ApiInput<"createMarketingTemplate">,
): Promise<ApiResponse<"createMarketingTemplate">> {
  return executeApiOperation<"createMarketingTemplate">(
    transport,
    "POST",
    "/marketing/templates",
    input,
    "application/json",
  );
}
export function listMarketingCampaigns(
  transport: ApiTransport,
  input: ApiInput<"listMarketingCampaigns">,
): Promise<ApiResponse<"listMarketingCampaigns">> {
  return executeApiOperation<"listMarketingCampaigns">(
    transport,
    "GET",
    "/marketing/campaigns",
    input,
    "application/json",
  );
}
export function createMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"createMarketingCampaign">,
): Promise<ApiResponse<"createMarketingCampaign">> {
  return executeApiOperation<"createMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns",
    input,
    "application/json",
  );
}
export function estimateMarketingAudience(
  transport: ApiTransport,
  input: ApiInput<"estimateMarketingAudience">,
): Promise<ApiResponse<"estimateMarketingAudience">> {
  return executeApiOperation<"estimateMarketingAudience">(
    transport,
    "POST",
    "/marketing/campaigns/audience-estimate",
    input,
    "application/json",
  );
}
export function generateMarketingCampaignDraft(
  transport: ApiTransport,
  input: ApiInput<"generateMarketingCampaignDraft">,
): Promise<ApiResponse<"generateMarketingCampaignDraft">> {
  return executeApiOperation<"generateMarketingCampaignDraft">(
    transport,
    "POST",
    "/marketing/ai/campaign-draft",
    input,
    "application/json",
  );
}
export function getMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"getMarketingCampaign">,
): Promise<ApiResponse<"getMarketingCampaign">> {
  return executeApiOperation<"getMarketingCampaign">(
    transport,
    "GET",
    "/marketing/campaigns/{campaignId}",
    input,
    "application/json",
  );
}
export function preflightMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"preflightMarketingCampaign">,
): Promise<ApiResponse<"preflightMarketingCampaign">> {
  return executeApiOperation<"preflightMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/preflight",
    input,
    "application/json",
  );
}
export function testSendMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"testSendMarketingCampaign">,
): Promise<ApiResponse<"testSendMarketingCampaign">> {
  return executeApiOperation<"testSendMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/test-send",
    input,
    "application/json",
  );
}
export function sendMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"sendMarketingCampaign">,
): Promise<ApiResponse<"sendMarketingCampaign">> {
  return executeApiOperation<"sendMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/send",
    input,
    "application/json",
  );
}
export function scheduleMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"scheduleMarketingCampaign">,
): Promise<ApiResponse<"scheduleMarketingCampaign">> {
  return executeApiOperation<"scheduleMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/schedule",
    input,
    "application/json",
  );
}
export function pauseMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"pauseMarketingCampaign">,
): Promise<ApiResponse<"pauseMarketingCampaign">> {
  return executeApiOperation<"pauseMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/pause",
    input,
    "application/json",
  );
}
export function cancelMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"cancelMarketingCampaign">,
): Promise<ApiResponse<"cancelMarketingCampaign">> {
  return executeApiOperation<"cancelMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/cancel",
    input,
    "application/json",
  );
}
export function listMarketingSuppressions(
  transport: ApiTransport,
  input: ApiInput<"listMarketingSuppressions">,
): Promise<ApiResponse<"listMarketingSuppressions">> {
  return executeApiOperation<"listMarketingSuppressions">(
    transport,
    "GET",
    "/marketing/suppressions",
    input,
    "application/json",
  );
}
export function receiveMarketingProviderWebhook(
  transport: ApiTransport,
  input: ApiInput<"receiveMarketingProviderWebhook">,
): Promise<ApiResponse<"receiveMarketingProviderWebhook">> {
  return executeApiOperation<"receiveMarketingProviderWebhook">(
    transport,
    "POST",
    "/marketing/provider-webhooks/{connectionId}",
    input,
    "application/json",
  );
}
export function resumeMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"resumeMarketingCampaign">,
): Promise<ApiResponse<"resumeMarketingCampaign">> {
  return executeApiOperation<"resumeMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/resume",
    input,
    "application/json",
  );
}
export function reviewMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"reviewMarketingCampaign">,
): Promise<ApiResponse<"reviewMarketingCampaign">> {
  return executeApiOperation<"reviewMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/review",
    input,
    "application/json",
  );
}
export function approveMarketingCampaign(
  transport: ApiTransport,
  input: ApiInput<"approveMarketingCampaign">,
): Promise<ApiResponse<"approveMarketingCampaign">> {
  return executeApiOperation<"approveMarketingCampaign">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/approve",
    input,
    "application/json",
  );
}
export function selectMarketingCampaignWinner(
  transport: ApiTransport,
  input: ApiInput<"selectMarketingCampaignWinner">,
): Promise<ApiResponse<"selectMarketingCampaignWinner">> {
  return executeApiOperation<"selectMarketingCampaignWinner">(
    transport,
    "POST",
    "/marketing/campaigns/{campaignId}/select-winner",
    input,
    "application/json",
  );
}
export function getMarketingAnalytics(
  transport: ApiTransport,
  input: ApiInput<"getMarketingAnalytics">,
): Promise<ApiResponse<"getMarketingAnalytics">> {
  return executeApiOperation<"getMarketingAnalytics">(
    transport,
    "GET",
    "/marketing/analytics",
    input,
    "application/json",
  );
}
export function recordMarketingConversion(
  transport: ApiTransport,
  input: ApiInput<"recordMarketingConversion">,
): Promise<ApiResponse<"recordMarketingConversion">> {
  return executeApiOperation<"recordMarketingConversion">(
    transport,
    "POST",
    "/marketing/conversions",
    input,
    "application/json",
  );
}
export function getMarketingUsage(
  transport: ApiTransport,
  input: ApiInput<"getMarketingUsage">,
): Promise<ApiResponse<"getMarketingUsage">> {
  return executeApiOperation<"getMarketingUsage">(
    transport,
    "GET",
    "/marketing/usage",
    input,
    "application/json",
  );
}
export function listMarketingJourneys(
  transport: ApiTransport,
  input: ApiInput<"listMarketingJourneys">,
): Promise<ApiResponse<"listMarketingJourneys">> {
  return executeApiOperation<"listMarketingJourneys">(
    transport,
    "GET",
    "/marketing/journeys",
    input,
    "application/json",
  );
}
export function createMarketingJourney(
  transport: ApiTransport,
  input: ApiInput<"createMarketingJourney">,
): Promise<ApiResponse<"createMarketingJourney">> {
  return executeApiOperation<"createMarketingJourney">(
    transport,
    "POST",
    "/marketing/journeys",
    input,
    "application/json",
  );
}
export function activateMarketingJourney(
  transport: ApiTransport,
  input: ApiInput<"activateMarketingJourney">,
): Promise<ApiResponse<"activateMarketingJourney">> {
  return executeApiOperation<"activateMarketingJourney">(
    transport,
    "POST",
    "/marketing/journeys/{journeyId}/activate",
    input,
    "application/json",
  );
}
export function pauseMarketingJourney(
  transport: ApiTransport,
  input: ApiInput<"pauseMarketingJourney">,
): Promise<ApiResponse<"pauseMarketingJourney">> {
  return executeApiOperation<"pauseMarketingJourney">(
    transport,
    "POST",
    "/marketing/journeys/{journeyId}/pause",
    input,
    "application/json",
  );
}
export function emitMarketingJourneyEvent(
  transport: ApiTransport,
  input: ApiInput<"emitMarketingJourneyEvent">,
): Promise<ApiResponse<"emitMarketingJourneyEvent">> {
  return executeApiOperation<"emitMarketingJourneyEvent">(
    transport,
    "POST",
    "/marketing/journeys/events",
    input,
    "application/json",
  );
}
export function listMarketingJourneyExecutions(
  transport: ApiTransport,
  input: ApiInput<"listMarketingJourneyExecutions">,
): Promise<ApiResponse<"listMarketingJourneyExecutions">> {
  return executeApiOperation<"listMarketingJourneyExecutions">(
    transport,
    "GET",
    "/marketing/journey-executions",
    input,
    "application/json",
  );
}
export function listMarketingWebhooks(
  transport: ApiTransport,
  input: ApiInput<"listMarketingWebhooks">,
): Promise<ApiResponse<"listMarketingWebhooks">> {
  return executeApiOperation<"listMarketingWebhooks">(
    transport,
    "GET",
    "/marketing/webhooks",
    input,
    "application/json",
  );
}
export function createMarketingWebhook(
  transport: ApiTransport,
  input: ApiInput<"createMarketingWebhook">,
): Promise<ApiResponse<"createMarketingWebhook">> {
  return executeApiOperation<"createMarketingWebhook">(
    transport,
    "POST",
    "/marketing/webhooks",
    input,
    "application/json",
  );
}
export function assistMarketingWithAi(
  transport: ApiTransport,
  input: ApiInput<"assistMarketingWithAi">,
): Promise<ApiResponse<"assistMarketingWithAi">> {
  return executeApiOperation<"assistMarketingWithAi">(
    transport,
    "POST",
    "/marketing/ai/assist",
    input,
    "application/json",
  );
}
export function listProspectingProfiles(
  transport: ApiTransport,
  input: ApiInput<"listProspectingProfiles">,
): Promise<ApiResponse<"listProspectingProfiles">> {
  return executeApiOperation<"listProspectingProfiles">(
    transport,
    "GET",
    "/crm/prospecting/profiles",
    input,
    "application/json",
  );
}
export function createProspectingProfile(
  transport: ApiTransport,
  input: ApiInput<"createProspectingProfile">,
): Promise<ApiResponse<"createProspectingProfile">> {
  return executeApiOperation<"createProspectingProfile">(
    transport,
    "POST",
    "/crm/prospecting/profiles",
    input,
    "application/json",
  );
}
export function listProspectingSources(
  transport: ApiTransport,
  input: ApiInput<"listProspectingSources">,
): Promise<ApiResponse<"listProspectingSources">> {
  return executeApiOperation<"listProspectingSources">(
    transport,
    "GET",
    "/crm/prospecting/sources",
    input,
    "application/json",
  );
}
export function discoverProspects(
  transport: ApiTransport,
  input: ApiInput<"discoverProspects">,
): Promise<ApiResponse<"discoverProspects">> {
  return executeApiOperation<"discoverProspects">(
    transport,
    "POST",
    "/crm/prospecting/discover",
    input,
    "application/json",
  );
}
export function getProspectOpportunityBrief(
  transport: ApiTransport,
  input: ApiInput<"getProspectOpportunityBrief">,
): Promise<ApiResponse<"getProspectOpportunityBrief">> {
  return executeApiOperation<"getProspectOpportunityBrief">(
    transport,
    "GET",
    "/crm/prospecting/candidates/{candidateId}/brief",
    input,
    "application/json",
  );
}
export function importProspectCandidate(
  transport: ApiTransport,
  input: ApiInput<"importProspectCandidate">,
): Promise<ApiResponse<"importProspectCandidate">> {
  return executeApiOperation<"importProspectCandidate">(
    transport,
    "POST",
    "/crm/prospecting/imports",
    input,
    "application/json",
  );
}
export function getProspectingUsage(
  transport: ApiTransport,
  input: ApiInput<"getProspectingUsage">,
): Promise<ApiResponse<"getProspectingUsage">> {
  return executeApiOperation<"getProspectingUsage">(
    transport,
    "GET",
    "/crm/prospecting/usage",
    input,
    "application/json",
  );
}
export function getCrmDashboard(
  transport: ApiTransport,
  input: ApiInput<"getCrmDashboard">,
): Promise<ApiResponse<"getCrmDashboard">> {
  return executeApiOperation<"getCrmDashboard">(
    transport,
    "GET",
    "/crm/dashboard",
    input,
    "application/json",
  );
}
export function listCrmOpportunities(
  transport: ApiTransport,
  input: ApiInput<"listCrmOpportunities">,
): Promise<ApiResponse<"listCrmOpportunities">> {
  return executeApiOperation<"listCrmOpportunities">(
    transport,
    "GET",
    "/crm/opportunities",
    input,
    "application/json",
  );
}
export function createCrmOpportunity(
  transport: ApiTransport,
  input: ApiInput<"createCrmOpportunity">,
): Promise<ApiResponse<"createCrmOpportunity">> {
  return executeApiOperation<"createCrmOpportunity">(
    transport,
    "POST",
    "/crm/opportunities",
    input,
    "application/json",
  );
}
export function getCrmOpportunity(
  transport: ApiTransport,
  input: ApiInput<"getCrmOpportunity">,
): Promise<ApiResponse<"getCrmOpportunity">> {
  return executeApiOperation<"getCrmOpportunity">(
    transport,
    "GET",
    "/crm/opportunities/{opportunityId}",
    input,
    "application/json",
  );
}
export function transitionCrmOpportunity(
  transport: ApiTransport,
  input: ApiInput<"transitionCrmOpportunity">,
): Promise<ApiResponse<"transitionCrmOpportunity">> {
  return executeApiOperation<"transitionCrmOpportunity">(
    transport,
    "POST",
    "/crm/opportunities/{opportunityId}/transition",
    input,
    "application/json",
  );
}
export function listCrmPipelines(
  transport: ApiTransport,
  input: ApiInput<"listCrmPipelines">,
): Promise<ApiResponse<"listCrmPipelines">> {
  return executeApiOperation<"listCrmPipelines">(
    transport,
    "GET",
    "/crm/pipelines",
    input,
    "application/json",
  );
}
export function createCrmPipeline(
  transport: ApiTransport,
  input: ApiInput<"createCrmPipeline">,
): Promise<ApiResponse<"createCrmPipeline">> {
  return executeApiOperation<"createCrmPipeline">(
    transport,
    "POST",
    "/crm/pipelines",
    input,
    "application/json",
  );
}
export function updateCrmPipeline(
  transport: ApiTransport,
  input: ApiInput<"updateCrmPipeline">,
): Promise<ApiResponse<"updateCrmPipeline">> {
  return executeApiOperation<"updateCrmPipeline">(
    transport,
    "PATCH",
    "/crm/pipelines/{pipelineId}",
    input,
    "application/json",
  );
}
export function listCrmProducts(
  transport: ApiTransport,
  input: ApiInput<"listCrmProducts">,
): Promise<ApiResponse<"listCrmProducts">> {
  return executeApiOperation<"listCrmProducts">(
    transport,
    "GET",
    "/crm/products",
    input,
    "application/json",
  );
}
export function createCrmProduct(
  transport: ApiTransport,
  input: ApiInput<"createCrmProduct">,
): Promise<ApiResponse<"createCrmProduct">> {
  return executeApiOperation<"createCrmProduct">(
    transport,
    "POST",
    "/crm/products",
    input,
    "application/json",
  );
}
export function updateCrmProduct(
  transport: ApiTransport,
  input: ApiInput<"updateCrmProduct">,
): Promise<ApiResponse<"updateCrmProduct">> {
  return executeApiOperation<"updateCrmProduct">(
    transport,
    "PATCH",
    "/crm/products/{productId}",
    input,
    "application/json",
  );
}
export function listCrmQuotes(
  transport: ApiTransport,
  input: ApiInput<"listCrmQuotes">,
): Promise<ApiResponse<"listCrmQuotes">> {
  return executeApiOperation<"listCrmQuotes">(
    transport,
    "GET",
    "/crm/quotes",
    input,
    "application/json",
  );
}
export function createCrmQuote(
  transport: ApiTransport,
  input: ApiInput<"createCrmQuote">,
): Promise<ApiResponse<"createCrmQuote">> {
  return executeApiOperation<"createCrmQuote">(
    transport,
    "POST",
    "/crm/quotes",
    input,
    "application/json",
  );
}
export function listCrmTasks(
  transport: ApiTransport,
  input: ApiInput<"listCrmTasks">,
): Promise<ApiResponse<"listCrmTasks">> {
  return executeApiOperation<"listCrmTasks">(
    transport,
    "GET",
    "/crm/tasks",
    input,
    "application/json",
  );
}
export function createCrmTask(
  transport: ApiTransport,
  input: ApiInput<"createCrmTask">,
): Promise<ApiResponse<"createCrmTask">> {
  return executeApiOperation<"createCrmTask">(
    transport,
    "POST",
    "/crm/tasks",
    input,
    "application/json",
  );
}
export function completeCrmTask(
  transport: ApiTransport,
  input: ApiInput<"completeCrmTask">,
): Promise<ApiResponse<"completeCrmTask">> {
  return executeApiOperation<"completeCrmTask">(
    transport,
    "POST",
    "/crm/tasks/{taskId}/complete",
    input,
    "application/json",
  );
}
export function getEducationAdminCatalog(
  transport: ApiTransport,
  input: ApiInput<"getEducationAdminCatalog">,
): Promise<ApiResponse<"getEducationAdminCatalog">> {
  return executeApiOperation<"getEducationAdminCatalog">(
    transport,
    "GET",
    "/education/admin/catalog",
    input,
    "application/json",
  );
}
export function putEducationAdminMarketsByMarketCode(
  transport: ApiTransport,
  input: ApiInput<"putEducationAdminMarketsByMarketCode">,
): Promise<ApiResponse<"putEducationAdminMarketsByMarketCode">> {
  return executeApiOperation<"putEducationAdminMarketsByMarketCode">(
    transport,
    "PUT",
    "/education/admin/markets/{marketCode}",
    input,
    "application/json",
  );
}
export function patchEducationAdminMarketsByMarketCodePlansByPlanId(
  transport: ApiTransport,
  input: ApiInput<"patchEducationAdminMarketsByMarketCodePlansByPlanId">,
): Promise<ApiResponse<"patchEducationAdminMarketsByMarketCodePlansByPlanId">> {
  return executeApiOperation<"patchEducationAdminMarketsByMarketCodePlansByPlanId">(
    transport,
    "PATCH",
    "/education/admin/markets/{marketCode}/plans/{planId}",
    input,
    "application/json",
  );
}
export function postEducationBookings(
  transport: ApiTransport,
  input: ApiInput<"postEducationBookings">,
): Promise<ApiResponse<"postEducationBookings">> {
  return executeApiOperation<"postEducationBookings">(
    transport,
    "POST",
    "/education/bookings",
    input,
    "application/json",
  );
}
export function getEducationCatalog(
  transport: ApiTransport,
  input: ApiInput<"getEducationCatalog">,
): Promise<ApiResponse<"getEducationCatalog">> {
  return executeApiOperation<"getEducationCatalog">(
    transport,
    "GET",
    "/education/catalog",
    input,
    "application/json",
  );
}
export function getEducationFavorites(
  transport: ApiTransport,
  input: ApiInput<"getEducationFavorites">,
): Promise<ApiResponse<"getEducationFavorites">> {
  return executeApiOperation<"getEducationFavorites">(
    transport,
    "GET",
    "/education/favorites",
    input,
    "application/json",
  );
}
export function patchEducationLeadsByLeadId(
  transport: ApiTransport,
  input: ApiInput<"patchEducationLeadsByLeadId">,
): Promise<ApiResponse<"patchEducationLeadsByLeadId">> {
  return executeApiOperation<"patchEducationLeadsByLeadId">(
    transport,
    "PATCH",
    "/education/leads/{leadId}",
    input,
    "application/json",
  );
}
export function postEducationLearnerRequests(
  transport: ApiTransport,
  input: ApiInput<"postEducationLearnerRequests">,
): Promise<ApiResponse<"postEducationLearnerRequests">> {
  return executeApiOperation<"postEducationLearnerRequests">(
    transport,
    "POST",
    "/education/learner-requests",
    input,
    "application/json",
  );
}
export function postEducationOffers(
  transport: ApiTransport,
  input: ApiInput<"postEducationOffers">,
): Promise<ApiResponse<"postEducationOffers">> {
  return executeApiOperation<"postEducationOffers">(
    transport,
    "POST",
    "/education/offers",
    input,
    "application/json",
  );
}
export function postEducationOnboardingSubmit(
  transport: ApiTransport,
  input: ApiInput<"postEducationOnboardingSubmit">,
): Promise<ApiResponse<"postEducationOnboardingSubmit">> {
  return executeApiOperation<"postEducationOnboardingSubmit">(
    transport,
    "POST",
    "/education/onboarding/submit",
    input,
    "application/json",
  );
}
export function getEducationCurrentOrganizationWorkspace(
  transport: ApiTransport,
  input: ApiInput<"getEducationCurrentOrganizationWorkspace">,
): Promise<ApiResponse<"getEducationCurrentOrganizationWorkspace">> {
  return executeApiOperation<"getEducationCurrentOrganizationWorkspace">(
    transport,
    "GET",
    "/education/organizations/workspace",
    input,
    "application/json",
  );
}
export function postEducationOrganizationsByOrganizationIdLocations(
  transport: ApiTransport,
  input: ApiInput<"postEducationOrganizationsByOrganizationIdLocations">,
): Promise<ApiResponse<"postEducationOrganizationsByOrganizationIdLocations">> {
  return executeApiOperation<"postEducationOrganizationsByOrganizationIdLocations">(
    transport,
    "POST",
    "/education/organizations/{organizationId}/locations",
    input,
    "application/json",
  );
}
export function postEducationOrganizationsByOrganizationIdMembers(
  transport: ApiTransport,
  input: ApiInput<"postEducationOrganizationsByOrganizationIdMembers">,
): Promise<ApiResponse<"postEducationOrganizationsByOrganizationIdMembers">> {
  return executeApiOperation<"postEducationOrganizationsByOrganizationIdMembers">(
    transport,
    "POST",
    "/education/organizations/{organizationId}/members",
    input,
    "application/json",
  );
}
export function getEducationOrganizationsByOrganizationIdWorkspace(
  transport: ApiTransport,
  input: ApiInput<"getEducationOrganizationsByOrganizationIdWorkspace">,
): Promise<ApiResponse<"getEducationOrganizationsByOrganizationIdWorkspace">> {
  return executeApiOperation<"getEducationOrganizationsByOrganizationIdWorkspace">(
    transport,
    "GET",
    "/education/organizations/{organizationId}/workspace",
    input,
    "application/json",
  );
}
export function postEducationSearch(
  transport: ApiTransport,
  input: ApiInput<"postEducationSearch">,
): Promise<ApiResponse<"postEducationSearch">> {
  return executeApiOperation<"postEducationSearch">(
    transport,
    "POST",
    "/education/search",
    input,
    "application/json",
  );
}
export function getEducationTutorsById(
  transport: ApiTransport,
  input: ApiInput<"getEducationTutorsById">,
): Promise<ApiResponse<"getEducationTutorsById">> {
  return executeApiOperation<"getEducationTutorsById">(
    transport,
    "GET",
    "/education/tutors/{id}",
    input,
    "application/json",
  );
}
export function putEducationTutorsById(
  transport: ApiTransport,
  input: ApiInput<"putEducationTutorsById">,
): Promise<ApiResponse<"putEducationTutorsById">> {
  return executeApiOperation<"putEducationTutorsById">(
    transport,
    "PUT",
    "/education/tutors/{id}",
    input,
    "application/json",
  );
}
export function putEducationTutorsByIdFavorite(
  transport: ApiTransport,
  input: ApiInput<"putEducationTutorsByIdFavorite">,
): Promise<ApiResponse<"putEducationTutorsByIdFavorite">> {
  return executeApiOperation<"putEducationTutorsByIdFavorite">(
    transport,
    "PUT",
    "/education/tutors/{id}/favorite",
    input,
    "application/json",
  );
}
export function getEducationWorkflowdraftsLearnerrequest(
  transport: ApiTransport,
  input: ApiInput<"getEducationWorkflowdraftsLearnerrequest">,
): Promise<ApiResponse<"getEducationWorkflowdraftsLearnerrequest">> {
  return executeApiOperation<"getEducationWorkflowdraftsLearnerrequest">(
    transport,
    "GET",
    "/education/workflow-drafts/learner-request",
    input,
    "application/json",
  );
}
export function putEducationWorkflowdraftsLearnerrequest(
  transport: ApiTransport,
  input: ApiInput<"putEducationWorkflowdraftsLearnerrequest">,
): Promise<ApiResponse<"putEducationWorkflowdraftsLearnerrequest">> {
  return executeApiOperation<"putEducationWorkflowdraftsLearnerrequest">(
    transport,
    "PUT",
    "/education/workflow-drafts/learner-request",
    input,
    "application/json",
  );
}
export function deleteEducationWorkflowdraftsLearnerrequest(
  transport: ApiTransport,
  input: ApiInput<"deleteEducationWorkflowdraftsLearnerrequest">,
): Promise<ApiResponse<"deleteEducationWorkflowdraftsLearnerrequest">> {
  return executeApiOperation<"deleteEducationWorkflowdraftsLearnerrequest">(
    transport,
    "DELETE",
    "/education/workflow-drafts/learner-request",
    input,
    "application/json",
  );
}
export function getEducationWorkflowdraftsTutoronboarding(
  transport: ApiTransport,
  input: ApiInput<"getEducationWorkflowdraftsTutoronboarding">,
): Promise<ApiResponse<"getEducationWorkflowdraftsTutoronboarding">> {
  return executeApiOperation<"getEducationWorkflowdraftsTutoronboarding">(
    transport,
    "GET",
    "/education/workflow-drafts/tutor-onboarding",
    input,
    "application/json",
  );
}
export function putEducationWorkflowdraftsTutoronboarding(
  transport: ApiTransport,
  input: ApiInput<"putEducationWorkflowdraftsTutoronboarding">,
): Promise<ApiResponse<"putEducationWorkflowdraftsTutoronboarding">> {
  return executeApiOperation<"putEducationWorkflowdraftsTutoronboarding">(
    transport,
    "PUT",
    "/education/workflow-drafts/tutor-onboarding",
    input,
    "application/json",
  );
}
export function deleteEducationWorkflowdraftsTutoronboarding(
  transport: ApiTransport,
  input: ApiInput<"deleteEducationWorkflowdraftsTutoronboarding">,
): Promise<ApiResponse<"deleteEducationWorkflowdraftsTutoronboarding">> {
  return executeApiOperation<"deleteEducationWorkflowdraftsTutoronboarding">(
    transport,
    "DELETE",
    "/education/workflow-drafts/tutor-onboarding",
    input,
    "application/json",
  );
}
export function getEducationCurrentTutorWorkspace(
  transport: ApiTransport,
  input: ApiInput<"getEducationCurrentTutorWorkspace">,
): Promise<ApiResponse<"getEducationCurrentTutorWorkspace">> {
  return executeApiOperation<"getEducationCurrentTutorWorkspace">(
    transport,
    "GET",
    "/education/workspace",
    input,
    "application/json",
  );
}
export function getEducationWorkspaceByTutorProfileId(
  transport: ApiTransport,
  input: ApiInput<"getEducationWorkspaceByTutorProfileId">,
): Promise<ApiResponse<"getEducationWorkspaceByTutorProfileId">> {
  return executeApiOperation<"getEducationWorkspaceByTutorProfileId">(
    transport,
    "GET",
    "/education/workspace/{tutorProfileId}",
    input,
    "application/json",
  );
}
export function putEmploymentAdminMarketsByMarketCode(
  transport: ApiTransport,
  input: ApiInput<"putEmploymentAdminMarketsByMarketCode">,
): Promise<ApiResponse<"putEmploymentAdminMarketsByMarketCode">> {
  return executeApiOperation<"putEmploymentAdminMarketsByMarketCode">(
    transport,
    "PUT",
    "/employment/admin/markets/{marketCode}",
    input,
    "application/json",
  );
}
export function patchEmploymentAdminOffersByOfferId(
  transport: ApiTransport,
  input: ApiInput<"patchEmploymentAdminOffersByOfferId">,
): Promise<ApiResponse<"patchEmploymentAdminOffersByOfferId">> {
  return executeApiOperation<"patchEmploymentAdminOffersByOfferId">(
    transport,
    "PATCH",
    "/employment/admin/offers/{offerId}",
    input,
    "application/json",
  );
}
export function getEmploymentAdminOverview(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentAdminOverview">,
): Promise<ApiResponse<"getEmploymentAdminOverview">> {
  return executeApiOperation<"getEmploymentAdminOverview">(
    transport,
    "GET",
    "/employment/admin/overview",
    input,
    "application/json",
  );
}
export function postEmploymentApplicationsByIdWithdraw(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentApplicationsByIdWithdraw">,
): Promise<ApiResponse<"postEmploymentApplicationsByIdWithdraw">> {
  return executeApiOperation<"postEmploymentApplicationsByIdWithdraw">(
    transport,
    "POST",
    "/employment/applications/{id}/withdraw",
    input,
    "application/json",
  );
}
export function postEmploymentCandidateAlerts(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentCandidateAlerts">,
): Promise<ApiResponse<"postEmploymentCandidateAlerts">> {
  return executeApiOperation<"postEmploymentCandidateAlerts">(
    transport,
    "POST",
    "/employment/candidate/alerts",
    input,
    "application/json",
  );
}
export function deleteEmploymentCandidateAlertsById(
  transport: ApiTransport,
  input: ApiInput<"deleteEmploymentCandidateAlertsById">,
): Promise<ApiResponse<"deleteEmploymentCandidateAlertsById">> {
  return executeApiOperation<"deleteEmploymentCandidateAlertsById">(
    transport,
    "DELETE",
    "/employment/candidate/alerts/{id}",
    input,
    "application/json",
  );
}
export function postEmploymentCandidateDataExport(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentCandidateDataExport">,
): Promise<ApiResponse<"postEmploymentCandidateDataExport">> {
  return executeApiOperation<"postEmploymentCandidateDataExport">(
    transport,
    "POST",
    "/employment/candidate/data-export",
    input,
    "application/json",
  );
}
export function postEmploymentCandidateDeletionRequest(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentCandidateDeletionRequest">,
): Promise<ApiResponse<"postEmploymentCandidateDeletionRequest">> {
  return executeApiOperation<"postEmploymentCandidateDeletionRequest">(
    transport,
    "POST",
    "/employment/candidate/deletion-request",
    input,
    "application/json",
  );
}
export function patchEmploymentCandidateInterviewsById(
  transport: ApiTransport,
  input: ApiInput<"patchEmploymentCandidateInterviewsById">,
): Promise<ApiResponse<"patchEmploymentCandidateInterviewsById">> {
  return executeApiOperation<"patchEmploymentCandidateInterviewsById">(
    transport,
    "PATCH",
    "/employment/candidate/interviews/{id}",
    input,
    "application/json",
  );
}
export function putEmploymentCandidateProfile(
  transport: ApiTransport,
  input: ApiInput<"putEmploymentCandidateProfile">,
): Promise<ApiResponse<"putEmploymentCandidateProfile">> {
  return executeApiOperation<"putEmploymentCandidateProfile">(
    transport,
    "PUT",
    "/employment/candidate/profile",
    input,
    "application/json",
  );
}
export function getEmploymentCandidateWorkspace(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentCandidateWorkspace">,
): Promise<ApiResponse<"getEmploymentCandidateWorkspace">> {
  return executeApiOperation<"getEmploymentCandidateWorkspace">(
    transport,
    "GET",
    "/employment/candidate/workspace",
    input,
    "application/json",
  );
}
export function getEmploymentCatalog(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentCatalog">,
): Promise<ApiResponse<"getEmploymentCatalog">> {
  return executeApiOperation<"getEmploymentCatalog">(
    transport,
    "GET",
    "/employment/catalog",
    input,
    "application/json",
  );
}
export function postEmploymentCheckouts(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentCheckouts">,
): Promise<ApiResponse<"postEmploymentCheckouts">> {
  return executeApiOperation<"postEmploymentCheckouts">(
    transport,
    "POST",
    "/employment/checkouts",
    input,
    "application/json",
  );
}
export function postEmploymentComplianceProhibitedLanguage(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentComplianceProhibitedLanguage">,
): Promise<ApiResponse<"postEmploymentComplianceProhibitedLanguage">> {
  return executeApiOperation<"postEmploymentComplianceProhibitedLanguage">(
    transport,
    "POST",
    "/employment/compliance/prohibited-language",
    input,
    "application/json",
  );
}
export function postEmploymentDrafts(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentDrafts">,
): Promise<ApiResponse<"postEmploymentDrafts">> {
  return executeApiOperation<"postEmploymentDrafts">(
    transport,
    "POST",
    "/employment/drafts",
    input,
    "application/json",
  );
}
export function getEmploymentDraftsById(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentDraftsById">,
): Promise<ApiResponse<"getEmploymentDraftsById">> {
  return executeApiOperation<"getEmploymentDraftsById">(
    transport,
    "GET",
    "/employment/drafts/{id}",
    input,
    "application/json",
  );
}
export function putEmploymentDraftsById(
  transport: ApiTransport,
  input: ApiInput<"putEmploymentDraftsById">,
): Promise<ApiResponse<"putEmploymentDraftsById">> {
  return executeApiOperation<"putEmploymentDraftsById">(
    transport,
    "PUT",
    "/employment/drafts/{id}",
    input,
    "application/json",
  );
}
export function postEmploymentDraftsByIdDuplicateCheck(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentDraftsByIdDuplicateCheck">,
): Promise<ApiResponse<"postEmploymentDraftsByIdDuplicateCheck">> {
  return executeApiOperation<"postEmploymentDraftsByIdDuplicateCheck">(
    transport,
    "POST",
    "/employment/drafts/{id}/duplicate-check",
    input,
    "application/json",
  );
}
export function putEmploymentDraftsByIdPublication(
  transport: ApiTransport,
  input: ApiInput<"putEmploymentDraftsByIdPublication">,
): Promise<ApiResponse<"putEmploymentDraftsByIdPublication">> {
  return executeApiOperation<"putEmploymentDraftsByIdPublication">(
    transport,
    "PUT",
    "/employment/drafts/{id}/publication",
    input,
    "application/json",
  );
}
export function postEmploymentDraftsByIdSubmit(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentDraftsByIdSubmit">,
): Promise<ApiResponse<"postEmploymentDraftsByIdSubmit">> {
  return executeApiOperation<"postEmploymentDraftsByIdSubmit">(
    transport,
    "POST",
    "/employment/drafts/{id}/submit",
    input,
    "application/json",
  );
}
export function postEmploymentEmployersByEmployerIdApplicationsByApplicationIdInterviews(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentEmployersByEmployerIdApplicationsByApplicationIdInterviews">,
): Promise<
  ApiResponse<"postEmploymentEmployersByEmployerIdApplicationsByApplicationIdInterviews">
> {
  return executeApiOperation<"postEmploymentEmployersByEmployerIdApplicationsByApplicationIdInterviews">(
    transport,
    "POST",
    "/employment/employers/{employerId}/applications/{applicationId}/interviews",
    input,
    "application/json",
  );
}
export function postEmploymentEmployersByEmployerIdApplicationsByApplicationIdNotes(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentEmployersByEmployerIdApplicationsByApplicationIdNotes">,
): Promise<
  ApiResponse<"postEmploymentEmployersByEmployerIdApplicationsByApplicationIdNotes">
> {
  return executeApiOperation<"postEmploymentEmployersByEmployerIdApplicationsByApplicationIdNotes">(
    transport,
    "POST",
    "/employment/employers/{employerId}/applications/{applicationId}/notes",
    input,
    "application/json",
  );
}
export function patchEmploymentEmployersByEmployerIdApplicationsByApplicationIdStage(
  transport: ApiTransport,
  input: ApiInput<"patchEmploymentEmployersByEmployerIdApplicationsByApplicationIdStage">,
): Promise<
  ApiResponse<"patchEmploymentEmployersByEmployerIdApplicationsByApplicationIdStage">
> {
  return executeApiOperation<"patchEmploymentEmployersByEmployerIdApplicationsByApplicationIdStage">(
    transport,
    "PATCH",
    "/employment/employers/{employerId}/applications/{applicationId}/stage",
    input,
    "application/json",
  );
}
export function postEmploymentEmployersByEmployerIdImports(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentEmployersByEmployerIdImports">,
): Promise<ApiResponse<"postEmploymentEmployersByEmployerIdImports">> {
  return executeApiOperation<"postEmploymentEmployersByEmployerIdImports">(
    transport,
    "POST",
    "/employment/employers/{employerId}/imports",
    input,
    "application/json",
  );
}
export function postEmploymentEmployersByEmployerIdImportsPreview(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentEmployersByEmployerIdImportsPreview">,
): Promise<ApiResponse<"postEmploymentEmployersByEmployerIdImportsPreview">> {
  return executeApiOperation<"postEmploymentEmployersByEmployerIdImportsPreview">(
    transport,
    "POST",
    "/employment/employers/{employerId}/imports/preview",
    input,
    "application/json",
  );
}
export function postEmploymentEmployersByEmployerIdJobsByJobIdDuplicate(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentEmployersByEmployerIdJobsByJobIdDuplicate">,
): Promise<
  ApiResponse<"postEmploymentEmployersByEmployerIdJobsByJobIdDuplicate">
> {
  return executeApiOperation<"postEmploymentEmployersByEmployerIdJobsByJobIdDuplicate">(
    transport,
    "POST",
    "/employment/employers/{employerId}/jobs/{jobId}/duplicate",
    input,
    "application/json",
  );
}
export function getEmploymentEmployersByEmployerIdWorkspace(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentEmployersByEmployerIdWorkspace">,
): Promise<ApiResponse<"getEmploymentEmployersByEmployerIdWorkspace">> {
  return executeApiOperation<"getEmploymentEmployersByEmployerIdWorkspace">(
    transport,
    "GET",
    "/employment/employers/{employerId}/workspace",
    input,
    "application/json",
  );
}
export function getEmploymentFavorites(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentFavorites">,
): Promise<ApiResponse<"getEmploymentFavorites">> {
  return executeApiOperation<"getEmploymentFavorites">(
    transport,
    "GET",
    "/employment/favorites",
    input,
    "application/json",
  );
}
export function getEmploymentJobsById(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentJobsById">,
): Promise<ApiResponse<"getEmploymentJobsById">> {
  return executeApiOperation<"getEmploymentJobsById">(
    transport,
    "GET",
    "/employment/jobs/{id}",
    input,
    "application/json",
  );
}
export function postEmploymentJobsByIdApplications(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentJobsByIdApplications">,
): Promise<ApiResponse<"postEmploymentJobsByIdApplications">> {
  return executeApiOperation<"postEmploymentJobsByIdApplications">(
    transport,
    "POST",
    "/employment/jobs/{id}/applications",
    input,
    "application/json",
  );
}
export function postEmploymentJobsByIdReport(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentJobsByIdReport">,
): Promise<ApiResponse<"postEmploymentJobsByIdReport">> {
  return executeApiOperation<"postEmploymentJobsByIdReport">(
    transport,
    "POST",
    "/employment/jobs/{id}/report",
    input,
    "application/json",
  );
}
export function putEmploymentJobsByIdSave(
  transport: ApiTransport,
  input: ApiInput<"putEmploymentJobsByIdSave">,
): Promise<ApiResponse<"putEmploymentJobsByIdSave">> {
  return executeApiOperation<"putEmploymentJobsByIdSave">(
    transport,
    "PUT",
    "/employment/jobs/{id}/save",
    input,
    "application/json",
  );
}
export function getEmploymentJobsByIdSimilar(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentJobsByIdSimilar">,
): Promise<ApiResponse<"getEmploymentJobsByIdSimilar">> {
  return executeApiOperation<"getEmploymentJobsByIdSimilar">(
    transport,
    "GET",
    "/employment/jobs/{id}/similar",
    input,
    "application/json",
  );
}
export function getEmploymentRecruiterEmployers(
  transport: ApiTransport,
  input: ApiInput<"getEmploymentRecruiterEmployers">,
): Promise<ApiResponse<"getEmploymentRecruiterEmployers">> {
  return executeApiOperation<"getEmploymentRecruiterEmployers">(
    transport,
    "GET",
    "/employment/recruiter/employers",
    input,
    "application/json",
  );
}
export function postEmploymentSearch(
  transport: ApiTransport,
  input: ApiInput<"postEmploymentSearch">,
): Promise<ApiResponse<"postEmploymentSearch">> {
  return executeApiOperation<"postEmploymentSearch">(
    transport,
    "POST",
    "/employment/search",
    input,
    "application/json",
  );
}
export function getFavorites(
  transport: ApiTransport,
  input: ApiInput<"getFavorites">,
): Promise<ApiResponse<"getFavorites">> {
  return executeApiOperation<"getFavorites">(
    transport,
    "GET",
    "/favorites",
    input,
    "application/json",
  );
}
export function getFeatureFlagEvaluation(
  transport: ApiTransport,
  input: ApiInput<"getFeatureFlagEvaluation">,
): Promise<ApiResponse<"getFeatureFlagEvaluation">> {
  return executeApiOperation<"getFeatureFlagEvaluation">(
    transport,
    "GET",
    "/feature-flags/{key}",
    input,
    "application/json",
  );
}
export function getFinanceAccountOverview(
  transport: ApiTransport,
  input: ApiInput<"getFinanceAccountOverview">,
): Promise<ApiResponse<"getFinanceAccountOverview">> {
  return executeApiOperation<"getFinanceAccountOverview">(
    transport,
    "GET",
    "/finance/account/overview",
    input,
    "application/json",
  );
}
export function getFinanceOrganizationOverview(
  transport: ApiTransport,
  input: ApiInput<"getFinanceOrganizationOverview">,
): Promise<ApiResponse<"getFinanceOrganizationOverview">> {
  return executeApiOperation<"getFinanceOrganizationOverview">(
    transport,
    "GET",
    "/finance/organization/overview",
    input,
    "application/json",
  );
}
export function getFinancePlatformExportsTransactions(
  transport: ApiTransport,
  input: ApiInput<"getFinancePlatformExportsTransactions">,
): Promise<ApiResponse<"getFinancePlatformExportsTransactions">> {
  return executeApiOperation<"getFinancePlatformExportsTransactions">(
    transport,
    "GET",
    "/finance/platform/exports/transactions",
    input,
    "application/json",
  );
}
export function getFinancePlatformOverview(
  transport: ApiTransport,
  input: ApiInput<"getFinancePlatformOverview">,
): Promise<ApiResponse<"getFinancePlatformOverview">> {
  return executeApiOperation<"getFinancePlatformOverview">(
    transport,
    "GET",
    "/finance/platform/overview",
    input,
    "application/json",
  );
}
export function getFinancePlatformReconciliation(
  transport: ApiTransport,
  input: ApiInput<"getFinancePlatformReconciliation">,
): Promise<ApiResponse<"getFinancePlatformReconciliation">> {
  return executeApiOperation<"getFinancePlatformReconciliation">(
    transport,
    "GET",
    "/finance/platform/reconciliation",
    input,
    "application/json",
  );
}
export function getFinancePlatformTransactions(
  transport: ApiTransport,
  input: ApiInput<"getFinancePlatformTransactions">,
): Promise<ApiResponse<"getFinancePlatformTransactions">> {
  return executeApiOperation<"getFinancePlatformTransactions">(
    transport,
    "GET",
    "/finance/platform/transactions",
    input,
    "application/json",
  );
}
export function getFinancePlatformTransactionsById(
  transport: ApiTransport,
  input: ApiInput<"getFinancePlatformTransactionsById">,
): Promise<ApiResponse<"getFinancePlatformTransactionsById">> {
  return executeApiOperation<"getFinancePlatformTransactionsById">(
    transport,
    "GET",
    "/finance/platform/transactions/{id}",
    input,
    "application/json",
  );
}
export function getHome(
  transport: ApiTransport,
  input: ApiInput<"getHome">,
): Promise<ApiResponse<"getHome">> {
  return executeApiOperation<"getHome">(
    transport,
    "GET",
    "/home",
    input,
    "application/json",
  );
}
export function getHomeTrending(
  transport: ApiTransport,
  input: ApiInput<"getHomeTrending">,
): Promise<ApiResponse<"getHomeTrending">> {
  return executeApiOperation<"getHomeTrending">(
    transport,
    "GET",
    "/home/trending",
    input,
    "application/json",
  );
}
export function postListingDrafts(
  transport: ApiTransport,
  input: ApiInput<"postListingDrafts">,
): Promise<ApiResponse<"postListingDrafts">> {
  return executeApiOperation<"postListingDrafts">(
    transport,
    "POST",
    "/listing-drafts",
    input,
    "application/json",
  );
}
export function getListingDraftsCurrent(
  transport: ApiTransport,
  input: ApiInput<"getListingDraftsCurrent">,
): Promise<ApiResponse<"getListingDraftsCurrent">> {
  return executeApiOperation<"getListingDraftsCurrent">(
    transport,
    "GET",
    "/listing-drafts/current",
    input,
    "application/json",
  );
}
export function putListingDraftsCurrent(
  transport: ApiTransport,
  input: ApiInput<"putListingDraftsCurrent">,
): Promise<ApiResponse<"putListingDraftsCurrent">> {
  return executeApiOperation<"putListingDraftsCurrent">(
    transport,
    "PUT",
    "/listing-drafts/current",
    input,
    "application/json",
  );
}
export function getDiscoverySitemapListings(
  transport: ApiTransport,
  input: ApiInput<"getDiscoverySitemapListings">,
): Promise<ApiResponse<"getDiscoverySitemapListings">> {
  return executeApiOperation<"getDiscoverySitemapListings">(
    transport,
    "GET",
    "/discovery/sitemap-listings",
    input,
    "application/json",
  );
}
export function getListings(
  transport: ApiTransport,
  input: ApiInput<"getListings">,
): Promise<ApiResponse<"getListings">> {
  return executeApiOperation<"getListings">(
    transport,
    "GET",
    "/listings",
    input,
    "application/json",
  );
}
export function postListingsCards(
  transport: ApiTransport,
  input: ApiInput<"postListingsCards">,
): Promise<ApiResponse<"postListingsCards">> {
  return executeApiOperation<"postListingsCards">(
    transport,
    "POST",
    "/listings/cards",
    input,
    "application/json",
  );
}
export function getListingCharacteristics(
  transport: ApiTransport,
  input: ApiInput<"getListingCharacteristics">,
): Promise<ApiResponse<"getListingCharacteristics">> {
  return executeApiOperation<"getListingCharacteristics">(
    transport,
    "GET",
    "/listings/{id}/characteristics",
    input,
    "application/json",
  );
}
export function getListingPriceQuote(
  transport: ApiTransport,
  input: ApiInput<"getListingPriceQuote">,
): Promise<ApiResponse<"getListingPriceQuote">> {
  return executeApiOperation<"getListingPriceQuote">(
    transport,
    "GET",
    "/listings/{id}/price-quote",
    input,
    "application/json",
  );
}
export function getListingsById(
  transport: ApiTransport,
  input: ApiInput<"getListingsById">,
): Promise<ApiResponse<"getListingsById">> {
  return executeApiOperation<"getListingsById">(
    transport,
    "GET",
    "/listings/{id}",
    input,
    "application/json",
  );
}
export function putListingsById(
  transport: ApiTransport,
  input: ApiInput<"putListingsById">,
): Promise<ApiResponse<"putListingsById">> {
  return executeApiOperation<"putListingsById">(
    transport,
    "PUT",
    "/listings/{id}",
    input,
    "application/json",
  );
}
export function deleteListingsById(
  transport: ApiTransport,
  input: ApiInput<"deleteListingsById">,
): Promise<ApiResponse<"deleteListingsById">> {
  return executeApiOperation<"deleteListingsById">(
    transport,
    "DELETE",
    "/listings/{id}",
    input,
    "application/json",
  );
}
export function postListingsByIdMarkSold(
  transport: ApiTransport,
  input: ApiInput<"postListingsByIdMarkSold">,
): Promise<ApiResponse<"postListingsByIdMarkSold">> {
  return executeApiOperation<"postListingsByIdMarkSold">(
    transport,
    "POST",
    "/listings/{id}/mark-sold",
    input,
    "application/json",
  );
}
export function putListingsByIdFavorite(
  transport: ApiTransport,
  input: ApiInput<"putListingsByIdFavorite">,
): Promise<ApiResponse<"putListingsByIdFavorite">> {
  return executeApiOperation<"putListingsByIdFavorite">(
    transport,
    "PUT",
    "/listings/{id}/favorite",
    input,
    "application/json",
  );
}
export function postListingsBulkimportParse(
  transport: ApiTransport,
  input: ApiInput<"postListingsBulkimportParse">,
): Promise<ApiResponse<"postListingsBulkimportParse">> {
  return executeApiOperation<"postListingsBulkimportParse">(
    transport,
    "POST",
    "/listings/bulk-import/parse",
    input,
    "application/json",
  );
}
export function postListingsBulkimportPublish(
  transport: ApiTransport,
  input: ApiInput<"postListingsBulkimportPublish">,
): Promise<ApiResponse<"postListingsBulkimportPublish">> {
  return executeApiOperation<"postListingsBulkimportPublish">(
    transport,
    "POST",
    "/listings/bulk-import/publish",
    input,
    "application/json",
  );
}
export function getListingsBulkimportTemplate(
  transport: ApiTransport,
  input: ApiInput<"getListingsBulkimportTemplate">,
): Promise<ApiResponse<"getListingsBulkimportTemplate">> {
  return executeApiOperation<"getListingsBulkimportTemplate">(
    transport,
    "GET",
    "/listings/bulk-import/template",
    input,
    "application/json",
  );
}
export function postListingsPublish(
  transport: ApiTransport,
  input: ApiInput<"postListingsPublish">,
): Promise<ApiResponse<"postListingsPublish">> {
  return executeApiOperation<"postListingsPublish">(
    transport,
    "POST",
    "/listings/publish",
    input,
    "application/json",
  );
}
export function getListingsSearch(
  transport: ApiTransport,
  input: ApiInput<"getListingsSearch">,
): Promise<ApiResponse<"getListingsSearch">> {
  return executeApiOperation<"getListingsSearch">(
    transport,
    "GET",
    "/listings/search",
    input,
    "application/json",
  );
}
export function postListingsSearch(
  transport: ApiTransport,
  input: ApiInput<"postListingsSearch">,
): Promise<ApiResponse<"postListingsSearch">> {
  return executeApiOperation<"postListingsSearch">(
    transport,
    "POST",
    "/listings/search",
    input,
    "application/json",
  );
}
export function getCurrencyCatalog(
  transport: ApiTransport,
  input: ApiInput<"getCurrencyCatalog">,
): Promise<ApiResponse<"getCurrencyCatalog">> {
  return executeApiOperation<"getCurrencyCatalog">(
    transport,
    "GET",
    "/currencies",
    input,
    "application/json",
  );
}
export function getAdminCurrencyCatalog(
  transport: ApiTransport,
  input: ApiInput<"getAdminCurrencyCatalog">,
): Promise<ApiResponse<"getAdminCurrencyCatalog">> {
  return executeApiOperation<"getAdminCurrencyCatalog">(
    transport,
    "GET",
    "/admin/currencies",
    input,
    "application/json",
  );
}
export function putAdminCurrency(
  transport: ApiTransport,
  input: ApiInput<"putAdminCurrency">,
): Promise<ApiResponse<"putAdminCurrency">> {
  return executeApiOperation<"putAdminCurrency">(
    transport,
    "PUT",
    "/admin/currencies/{code}",
    input,
    "application/json",
  );
}
export function putAdminExchangeRate(
  transport: ApiTransport,
  input: ApiInput<"putAdminExchangeRate">,
): Promise<ApiResponse<"putAdminExchangeRate">> {
  return executeApiOperation<"putAdminExchangeRate">(
    transport,
    "PUT",
    "/admin/exchange-rates/{baseCurrency}/{quoteCurrency}",
    input,
    "application/json",
  );
}
export function getMarkets(
  transport: ApiTransport,
  input: ApiInput<"getMarkets">,
): Promise<ApiResponse<"getMarkets">> {
  return executeApiOperation<"getMarkets">(
    transport,
    "GET",
    "/markets",
    input,
    "application/json",
  );
}
export function detectProbableMarket(
  transport: ApiTransport,
  input: ApiInput<"detectProbableMarket">,
): Promise<ApiResponse<"detectProbableMarket">> {
  return executeApiOperation<"detectProbableMarket">(
    transport,
    "GET",
    "/markets/detection",
    input,
    "application/json",
  );
}
export function detectMarketFromCoordinates(
  transport: ApiTransport,
  input: ApiInput<"detectMarketFromCoordinates">,
): Promise<ApiResponse<"detectMarketFromCoordinates">> {
  return executeApiOperation<"detectMarketFromCoordinates">(
    transport,
    "POST",
    "/markets/detection/coordinates",
    input,
    "application/json",
  );
}
export function getMarketsByCode(
  transport: ApiTransport,
  input: ApiInput<"getMarketsByCode">,
): Promise<ApiResponse<"getMarketsByCode">> {
  return executeApiOperation<"getMarketsByCode">(
    transport,
    "GET",
    "/markets/{code}",
    input,
    "application/json",
  );
}
export function getMarketsActive(
  transport: ApiTransport,
  input: ApiInput<"getMarketsActive">,
): Promise<ApiResponse<"getMarketsActive">> {
  return executeApiOperation<"getMarketsActive">(
    transport,
    "GET",
    "/markets/active",
    input,
    "application/json",
  );
}
export function postMarketsActive(
  transport: ApiTransport,
  input: ApiInput<"postMarketsActive">,
): Promise<ApiResponse<"postMarketsActive">> {
  return executeApiOperation<"postMarketsActive">(
    transport,
    "POST",
    "/markets/active",
    input,
    "application/json",
  );
}
export function getMarketsEffectiveByCode(
  transport: ApiTransport,
  input: ApiInput<"getMarketsEffectiveByCode">,
): Promise<ApiResponse<"getMarketsEffectiveByCode">> {
  return executeApiOperation<"getMarketsEffectiveByCode">(
    transport,
    "GET",
    "/markets/effective/{code}",
    input,
    "application/json",
  );
}
export function postMediaListingsUploads(
  transport: ApiTransport,
  input: ApiInput<"postMediaListingsUploads">,
): Promise<ApiResponse<"postMediaListingsUploads">> {
  return executeApiOperation<"postMediaListingsUploads">(
    transport,
    "POST",
    "/media/listings/uploads",
    input,
    "application/json",
  );
}
export function postMediaListingsUploadsByIdComplete(
  transport: ApiTransport,
  input: ApiInput<"postMediaListingsUploadsByIdComplete">,
): Promise<ApiResponse<"postMediaListingsUploadsByIdComplete">> {
  return executeApiOperation<"postMediaListingsUploadsByIdComplete">(
    transport,
    "POST",
    "/media/listings/uploads/{id}/complete",
    input,
    "application/json",
  );
}
export function postMediaPrivateDocumentsUploads(
  transport: ApiTransport,
  input: ApiInput<"postMediaPrivateDocumentsUploads">,
): Promise<ApiResponse<"postMediaPrivateDocumentsUploads">> {
  return executeApiOperation<"postMediaPrivateDocumentsUploads">(
    transport,
    "POST",
    "/media/private-documents/uploads",
    input,
    "application/json",
  );
}
export function postMediaPrivateDocumentsUploadsByIdComplete(
  transport: ApiTransport,
  input: ApiInput<"postMediaPrivateDocumentsUploadsByIdComplete">,
): Promise<ApiResponse<"postMediaPrivateDocumentsUploadsByIdComplete">> {
  return executeApiOperation<"postMediaPrivateDocumentsUploadsByIdComplete">(
    transport,
    "POST",
    "/media/private-documents/uploads/{id}/complete",
    input,
    "application/json",
  );
}
export function postMessagingBlock(
  transport: ApiTransport,
  input: ApiInput<"postMessagingBlock">,
): Promise<ApiResponse<"postMessagingBlock">> {
  return executeApiOperation<"postMessagingBlock">(
    transport,
    "POST",
    "/messaging/block",
    input,
    "application/json",
  );
}
export function getMessagingBlocked(
  transport: ApiTransport,
  input: ApiInput<"getMessagingBlocked">,
): Promise<ApiResponse<"getMessagingBlocked">> {
  return executeApiOperation<"getMessagingBlocked">(
    transport,
    "GET",
    "/messaging/blocked",
    input,
    "application/json",
  );
}
export function getMessagingConversations(
  transport: ApiTransport,
  input: ApiInput<"getMessagingConversations">,
): Promise<ApiResponse<"getMessagingConversations">> {
  return executeApiOperation<"getMessagingConversations">(
    transport,
    "GET",
    "/messaging/conversations",
    input,
    "application/json",
  );
}
export function postMessagingConversations(
  transport: ApiTransport,
  input: ApiInput<"postMessagingConversations">,
): Promise<ApiResponse<"postMessagingConversations">> {
  return executeApiOperation<"postMessagingConversations">(
    transport,
    "POST",
    "/messaging/conversations",
    input,
    "application/json",
  );
}
export function getMessagingConversationsById(
  transport: ApiTransport,
  input: ApiInput<"getMessagingConversationsById">,
): Promise<ApiResponse<"getMessagingConversationsById">> {
  return executeApiOperation<"getMessagingConversationsById">(
    transport,
    "GET",
    "/messaging/conversations/{id}",
    input,
    "application/json",
  );
}
export function getMessagingConversationsByIdMessages(
  transport: ApiTransport,
  input: ApiInput<"getMessagingConversationsByIdMessages">,
): Promise<ApiResponse<"getMessagingConversationsByIdMessages">> {
  return executeApiOperation<"getMessagingConversationsByIdMessages">(
    transport,
    "GET",
    "/messaging/conversations/{id}/messages",
    input,
    "application/json",
  );
}
export function postMessagingConversationsByIdMessages(
  transport: ApiTransport,
  input: ApiInput<"postMessagingConversationsByIdMessages">,
): Promise<ApiResponse<"postMessagingConversationsByIdMessages">> {
  return executeApiOperation<"postMessagingConversationsByIdMessages">(
    transport,
    "POST",
    "/messaging/conversations/{id}/messages",
    input,
    "application/json",
  );
}
export function postMessagingOffer(
  transport: ApiTransport,
  input: ApiInput<"postMessagingOffer">,
): Promise<ApiResponse<"postMessagingOffer">> {
  return executeApiOperation<"postMessagingOffer">(
    transport,
    "POST",
    "/messaging/offer",
    input,
    "application/json",
  );
}
export function postMessagingOfferResponse(
  transport: ApiTransport,
  input: ApiInput<"postMessagingOfferResponse">,
): Promise<ApiResponse<"postMessagingOfferResponse">> {
  return executeApiOperation<"postMessagingOfferResponse">(
    transport,
    "POST",
    "/messaging/offer-response",
    input,
    "application/json",
  );
}
export function postMessagingOffersIdCounter(
  transport: ApiTransport,
  input: ApiInput<"postMessagingOffersIdCounter">,
): Promise<ApiResponse<"postMessagingOffersIdCounter">> {
  return executeApiOperation<"postMessagingOffersIdCounter">(
    transport,
    "POST",
    "/messaging/offers/{id}/counter",
    input,
    "application/json",
  );
}
export function postMessagingOffersIdWithdraw(
  transport: ApiTransport,
  input: ApiInput<"postMessagingOffersIdWithdraw">,
): Promise<ApiResponse<"postMessagingOffersIdWithdraw">> {
  return executeApiOperation<"postMessagingOffersIdWithdraw">(
    transport,
    "POST",
    "/messaging/offers/{id}/withdraw",
    input,
    "application/json",
  );
}
export function postMessagingRead(
  transport: ApiTransport,
  input: ApiInput<"postMessagingRead">,
): Promise<ApiResponse<"postMessagingRead">> {
  return executeApiOperation<"postMessagingRead">(
    transport,
    "POST",
    "/messaging/read",
    input,
    "application/json",
  );
}
export function postMessagingSchedulePickup(
  transport: ApiTransport,
  input: ApiInput<"postMessagingSchedulePickup">,
): Promise<ApiResponse<"postMessagingSchedulePickup">> {
  return executeApiOperation<"postMessagingSchedulePickup">(
    transport,
    "POST",
    "/messaging/schedule-pickup",
    input,
    "application/json",
  );
}
export function postMessagingUnblock(
  transport: ApiTransport,
  input: ApiInput<"postMessagingUnblock">,
): Promise<ApiResponse<"postMessagingUnblock">> {
  return executeApiOperation<"postMessagingUnblock">(
    transport,
    "POST",
    "/messaging/unblock",
    input,
    "application/json",
  );
}
export function getOwnModerationAppeals(
  transport: ApiTransport,
  input: ApiInput<"getOwnModerationAppeals">,
): Promise<ApiResponse<"getOwnModerationAppeals">> {
  return executeApiOperation<"getOwnModerationAppeals">(
    transport,
    "GET",
    "/moderation/appeals/mine",
    input,
    "application/json",
  );
}
export function postModerationCaseAppeal(
  transport: ApiTransport,
  input: ApiInput<"postModerationCaseAppeal">,
): Promise<ApiResponse<"postModerationCaseAppeal">> {
  return executeApiOperation<"postModerationCaseAppeal">(
    transport,
    "POST",
    "/moderation/cases/{caseId}/appeals",
    input,
    "application/json",
  );
}
export function getOwnModerationCases(
  transport: ApiTransport,
  input: ApiInput<"getOwnModerationCases">,
): Promise<ApiResponse<"getOwnModerationCases">> {
  return executeApiOperation<"getOwnModerationCases">(
    transport,
    "GET",
    "/moderation/cases/mine",
    input,
    "application/json",
  );
}
export function getMonetizationBilling(
  transport: ApiTransport,
  input: ApiInput<"getMonetizationBilling">,
): Promise<ApiResponse<"getMonetizationBilling">> {
  return executeApiOperation<"getMonetizationBilling">(
    transport,
    "GET",
    "/monetization/billing",
    input,
    "application/json",
  );
}
export function postMonetizationCheckouts(
  transport: ApiTransport,
  input: ApiInput<"postMonetizationCheckouts">,
): Promise<ApiResponse<"postMonetizationCheckouts">> {
  return executeApiOperation<"postMonetizationCheckouts">(
    transport,
    "POST",
    "/monetization/checkouts",
    input,
    "application/json",
  );
}
export function getMonetizationEntitlements(
  transport: ApiTransport,
  input: ApiInput<"getMonetizationEntitlements">,
): Promise<ApiResponse<"getMonetizationEntitlements">> {
  return executeApiOperation<"getMonetizationEntitlements">(
    transport,
    "GET",
    "/monetization/entitlements",
    input,
    "application/json",
  );
}
export function getMonetizationInvoicesByIdDocument(
  transport: ApiTransport,
  input: ApiInput<"getMonetizationInvoicesByIdDocument">,
): Promise<ApiResponse<"getMonetizationInvoicesByIdDocument">> {
  return executeApiOperation<"getMonetizationInvoicesByIdDocument">(
    transport,
    "GET",
    "/monetization/invoices/{id}/document",
    input,
    "application/json",
  );
}
export function getMonetizationProfessionalPlans(
  transport: ApiTransport,
  input: ApiInput<"getMonetizationProfessionalPlans">,
): Promise<ApiResponse<"getMonetizationProfessionalPlans">> {
  return executeApiOperation<"getMonetizationProfessionalPlans">(
    transport,
    "GET",
    "/monetization/professional-plans",
    input,
    "application/json",
  );
}
export function postMonetizationPromotionsValidate(
  transport: ApiTransport,
  input: ApiInput<"postMonetizationPromotionsValidate">,
): Promise<ApiResponse<"postMonetizationPromotionsValidate">> {
  return executeApiOperation<"postMonetizationPromotionsValidate">(
    transport,
    "POST",
    "/monetization/promotions/validate",
    input,
    "application/json",
  );
}
export function postMonetizationQuotes(
  transport: ApiTransport,
  input: ApiInput<"postMonetizationQuotes">,
): Promise<ApiResponse<"postMonetizationQuotes">> {
  return executeApiOperation<"postMonetizationQuotes">(
    transport,
    "POST",
    "/monetization/quotes",
    input,
    "application/json",
  );
}
export function getMonetizationSubscriptions(
  transport: ApiTransport,
  input: ApiInput<"getMonetizationSubscriptions">,
): Promise<ApiResponse<"getMonetizationSubscriptions">> {
  return executeApiOperation<"getMonetizationSubscriptions">(
    transport,
    "GET",
    "/monetization/subscriptions",
    input,
    "application/json",
  );
}
export function patchMonetizationSubscriptionsById(
  transport: ApiTransport,
  input: ApiInput<"patchMonetizationSubscriptionsById">,
): Promise<ApiResponse<"patchMonetizationSubscriptionsById">> {
  return executeApiOperation<"patchMonetizationSubscriptionsById">(
    transport,
    "PATCH",
    "/monetization/subscriptions/{id}",
    input,
    "application/json",
  );
}
export function postMonetizationSubscriptionsByIdChange(
  transport: ApiTransport,
  input: ApiInput<"postMonetizationSubscriptionsByIdChange">,
): Promise<ApiResponse<"postMonetizationSubscriptionsByIdChange">> {
  return executeApiOperation<"postMonetizationSubscriptionsByIdChange">(
    transport,
    "POST",
    "/monetization/subscriptions/{id}/change",
    input,
    "application/json",
  );
}
export function postMonetizationSubscriptionsByIdChangePreview(
  transport: ApiTransport,
  input: ApiInput<"postMonetizationSubscriptionsByIdChangePreview">,
): Promise<ApiResponse<"postMonetizationSubscriptionsByIdChangePreview">> {
  return executeApiOperation<"postMonetizationSubscriptionsByIdChangePreview">(
    transport,
    "POST",
    "/monetization/subscriptions/{id}/change-preview",
    input,
    "application/json",
  );
}
export function postMonetizationTrials(
  transport: ApiTransport,
  input: ApiInput<"postMonetizationTrials">,
): Promise<ApiResponse<"postMonetizationTrials">> {
  return executeApiOperation<"postMonetizationTrials">(
    transport,
    "POST",
    "/monetization/trials",
    input,
    "application/json",
  );
}
export function getNotifications(
  transport: ApiTransport,
  input: ApiInput<"getNotifications">,
): Promise<ApiResponse<"getNotifications">> {
  return executeApiOperation<"getNotifications">(
    transport,
    "GET",
    "/notifications",
    input,
    "application/json",
  );
}
export function deleteNotificationsById(
  transport: ApiTransport,
  input: ApiInput<"deleteNotificationsById">,
): Promise<ApiResponse<"deleteNotificationsById">> {
  return executeApiOperation<"deleteNotificationsById">(
    transport,
    "DELETE",
    "/notifications/{id}",
    input,
    "application/json",
  );
}
export function postNotificationsByIdRead(
  transport: ApiTransport,
  input: ApiInput<"postNotificationsByIdRead">,
): Promise<ApiResponse<"postNotificationsByIdRead">> {
  return executeApiOperation<"postNotificationsByIdRead">(
    transport,
    "POST",
    "/notifications/{id}/read",
    input,
    "application/json",
  );
}
export function postNotificationsDevices(
  transport: ApiTransport,
  input: ApiInput<"postNotificationsDevices">,
): Promise<ApiResponse<"postNotificationsDevices">> {
  return executeApiOperation<"postNotificationsDevices">(
    transport,
    "POST",
    "/notifications/devices",
    input,
    "application/json",
  );
}
export function postNotificationsDevicesUnregister(
  transport: ApiTransport,
  input: ApiInput<"postNotificationsDevicesUnregister">,
): Promise<ApiResponse<"postNotificationsDevicesUnregister">> {
  return executeApiOperation<"postNotificationsDevicesUnregister">(
    transport,
    "POST",
    "/notifications/devices/unregister",
    input,
    "application/json",
  );
}
export function getNotificationPreferences(
  transport: ApiTransport,
  input: ApiInput<"getNotificationPreferences">,
): Promise<ApiResponse<"getNotificationPreferences">> {
  return executeApiOperation<"getNotificationPreferences">(
    transport,
    "GET",
    "/notifications/preferences",
    input,
    "application/json",
  );
}
export function putNotificationPreferences(
  transport: ApiTransport,
  input: ApiInput<"putNotificationPreferences">,
): Promise<ApiResponse<"putNotificationPreferences">> {
  return executeApiOperation<"putNotificationPreferences">(
    transport,
    "PUT",
    "/notifications/preferences",
    input,
    "application/json",
  );
}
export function postNotificationsReadAll(
  transport: ApiTransport,
  input: ApiInput<"postNotificationsReadAll">,
): Promise<ApiResponse<"postNotificationsReadAll">> {
  return executeApiOperation<"postNotificationsReadAll">(
    transport,
    "POST",
    "/notifications/read-all",
    input,
    "application/json",
  );
}
export function getNotificationsUnreadCount(
  transport: ApiTransport,
  input: ApiInput<"getNotificationsUnreadCount">,
): Promise<ApiResponse<"getNotificationsUnreadCount">> {
  return executeApiOperation<"getNotificationsUnreadCount">(
    transport,
    "GET",
    "/notifications/unread-count",
    input,
    "application/json",
  );
}
export function getOrdersById(
  transport: ApiTransport,
  input: ApiInput<"getOrdersById">,
): Promise<ApiResponse<"getOrdersById">> {
  return executeApiOperation<"getOrdersById">(
    transport,
    "GET",
    "/orders/{id}",
    input,
    "application/json",
  );
}
export function postOrdersByIdCancel(
  transport: ApiTransport,
  input: ApiInput<"postOrdersByIdCancel">,
): Promise<ApiResponse<"postOrdersByIdCancel">> {
  return executeApiOperation<"postOrdersByIdCancel">(
    transport,
    "POST",
    "/orders/{id}/cancel",
    input,
    "application/json",
  );
}
export function postOrdersByIdConfirmDelivery(
  transport: ApiTransport,
  input: ApiInput<"postOrdersByIdConfirmDelivery">,
): Promise<ApiResponse<"postOrdersByIdConfirmDelivery">> {
  return executeApiOperation<"postOrdersByIdConfirmDelivery">(
    transport,
    "POST",
    "/orders/{id}/confirm-delivery",
    input,
    "application/json",
  );
}
export function postOrdersByIdConfirmPin(
  transport: ApiTransport,
  input: ApiInput<"postOrdersByIdConfirmPin">,
): Promise<ApiResponse<"postOrdersByIdConfirmPin">> {
  return executeApiOperation<"postOrdersByIdConfirmPin">(
    transport,
    "POST",
    "/orders/{id}/confirm-pin",
    input,
    "application/json",
  );
}
export function postOrdersByIdDispute(
  transport: ApiTransport,
  input: ApiInput<"postOrdersByIdDispute">,
): Promise<ApiResponse<"postOrdersByIdDispute">> {
  return executeApiOperation<"postOrdersByIdDispute">(
    transport,
    "POST",
    "/orders/{id}/dispute",
    input,
    "application/json",
  );
}
export function postOrdersByIdHandoverCode(
  transport: ApiTransport,
  input: ApiInput<"postOrdersByIdHandoverCode">,
): Promise<ApiResponse<"postOrdersByIdHandoverCode">> {
  return executeApiOperation<"postOrdersByIdHandoverCode">(
    transport,
    "POST",
    "/orders/{id}/handover-code",
    input,
    "application/json",
  );
}
export function postOrdersByIdRefund(
  transport: ApiTransport,
  input: ApiInput<"postOrdersByIdRefund">,
): Promise<ApiResponse<"postOrdersByIdRefund">> {
  return executeApiOperation<"postOrdersByIdRefund">(
    transport,
    "POST",
    "/orders/{id}/refund",
    input,
    "application/json",
  );
}
export function getOrdersByIdReturns(
  transport: ApiTransport,
  input: ApiInput<"getOrdersByIdReturns">,
): Promise<ApiResponse<"getOrdersByIdReturns">> {
  return executeApiOperation<"getOrdersByIdReturns">(
    transport,
    "GET",
    "/orders/{id}/returns",
    input,
    "application/json",
  );
}
export function postOrdersByIdReturns(
  transport: ApiTransport,
  input: ApiInput<"postOrdersByIdReturns">,
): Promise<ApiResponse<"postOrdersByIdReturns">> {
  return executeApiOperation<"postOrdersByIdReturns">(
    transport,
    "POST",
    "/orders/{id}/returns",
    input,
    "application/json",
  );
}
export function postOrdersReturnsByReturnIdDecision(
  transport: ApiTransport,
  input: ApiInput<"postOrdersReturnsByReturnIdDecision">,
): Promise<ApiResponse<"postOrdersReturnsByReturnIdDecision">> {
  return executeApiOperation<"postOrdersReturnsByReturnIdDecision">(
    transport,
    "POST",
    "/orders/returns/{returnId}/decision",
    input,
    "application/json",
  );
}
export function postOrdersReturnsByReturnIdShipped(
  transport: ApiTransport,
  input: ApiInput<"postOrdersReturnsByReturnIdShipped">,
): Promise<ApiResponse<"postOrdersReturnsByReturnIdShipped">> {
  return executeApiOperation<"postOrdersReturnsByReturnIdShipped">(
    transport,
    "POST",
    "/orders/returns/{returnId}/shipped",
    input,
    "application/json",
  );
}
export function postOrdersReturnsByReturnIdReceived(
  transport: ApiTransport,
  input: ApiInput<"postOrdersReturnsByReturnIdReceived">,
): Promise<ApiResponse<"postOrdersReturnsByReturnIdReceived">> {
  return executeApiOperation<"postOrdersReturnsByReturnIdReceived">(
    transport,
    "POST",
    "/orders/returns/{returnId}/received",
    input,
    "application/json",
  );
}
export function postOrdersByIdShip(
  transport: ApiTransport,
  input: ApiInput<"postOrdersByIdShip">,
): Promise<ApiResponse<"postOrdersByIdShip">> {
  return executeApiOperation<"postOrdersByIdShip">(
    transport,
    "POST",
    "/orders/{id}/ship",
    input,
    "application/json",
  );
}
export function postOrdersDirectPurchase(
  transport: ApiTransport,
  input: ApiInput<"postOrdersDirectPurchase">,
): Promise<ApiResponse<"postOrdersDirectPurchase">> {
  return executeApiOperation<"postOrdersDirectPurchase">(
    transport,
    "POST",
    "/orders/direct-purchase",
    input,
    "application/json",
  );
}
export function postOrdersDirectPurchaseQuote(
  transport: ApiTransport,
  input: ApiInput<"postOrdersDirectPurchaseQuote">,
): Promise<ApiResponse<"postOrdersDirectPurchaseQuote">> {
  return executeApiOperation<"postOrdersDirectPurchaseQuote">(
    transport,
    "POST",
    "/orders/direct-purchase/quote",
    input,
    "application/json",
  );
}
export function getOrdersPurchases(
  transport: ApiTransport,
  input: ApiInput<"getOrdersPurchases">,
): Promise<ApiResponse<"getOrdersPurchases">> {
  return executeApiOperation<"getOrdersPurchases">(
    transport,
    "GET",
    "/orders/purchases",
    input,
    "application/json",
  );
}
export function postOrdersReservation(
  transport: ApiTransport,
  input: ApiInput<"postOrdersReservation">,
): Promise<ApiResponse<"postOrdersReservation">> {
  return executeApiOperation<"postOrdersReservation">(
    transport,
    "POST",
    "/orders/reservation",
    input,
    "application/json",
  );
}
export function getOrdersSales(
  transport: ApiTransport,
  input: ApiInput<"getOrdersSales">,
): Promise<ApiResponse<"getOrdersSales">> {
  return executeApiOperation<"getOrdersSales">(
    transport,
    "GET",
    "/orders/sales",
    input,
    "application/json",
  );
}
export function getPaymentsBalanceBySellerId(
  transport: ApiTransport,
  input: ApiInput<"getPaymentsBalanceBySellerId">,
): Promise<ApiResponse<"getPaymentsBalanceBySellerId">> {
  return executeApiOperation<"getPaymentsBalanceBySellerId">(
    transport,
    "GET",
    "/payments/balance/{sellerId}",
    input,
    "application/json",
  );
}
export function postPaymentsIntent(
  transport: ApiTransport,
  input: ApiInput<"postPaymentsIntent">,
): Promise<ApiResponse<"postPaymentsIntent">> {
  return executeApiOperation<"postPaymentsIntent">(
    transport,
    "POST",
    "/payments/intent",
    input,
    "application/json",
  );
}
export function postPaymentsPayout(
  transport: ApiTransport,
  input: ApiInput<"postPaymentsPayout">,
): Promise<ApiResponse<"postPaymentsPayout">> {
  return executeApiOperation<"postPaymentsPayout">(
    transport,
    "POST",
    "/payments/payout",
    input,
    "application/json",
  );
}
export function listProviderConnections(
  transport: ApiTransport,
  input: ApiInput<"listProviderConnections">,
): Promise<ApiResponse<"listProviderConnections">> {
  return executeApiOperation<"listProviderConnections">(
    transport,
    "GET",
    "/provider-connections",
    input,
    "application/json",
  );
}
export function createProviderConnection(
  transport: ApiTransport,
  input: ApiInput<"createProviderConnection">,
): Promise<ApiResponse<"createProviderConnection">> {
  return executeApiOperation<"createProviderConnection">(
    transport,
    "POST",
    "/provider-connections",
    input,
    "application/json",
  );
}
export function rotateProviderConnectionCredential(
  transport: ApiTransport,
  input: ApiInput<"rotateProviderConnectionCredential">,
): Promise<ApiResponse<"rotateProviderConnectionCredential">> {
  return executeApiOperation<"rotateProviderConnectionCredential">(
    transport,
    "PUT",
    "/provider-connections/{connectionId}/credential",
    input,
    "application/json",
  );
}
export function postPublicationEntitlements(
  transport: ApiTransport,
  input: ApiInput<"postPublicationEntitlements">,
): Promise<ApiResponse<"postPublicationEntitlements">> {
  return executeApiOperation<"postPublicationEntitlements">(
    transport,
    "POST",
    "/publication/entitlements",
    input,
    "application/json",
  );
}
export function putRealEstateAdminMarketsByMarketCode(
  transport: ApiTransport,
  input: ApiInput<"putRealEstateAdminMarketsByMarketCode">,
): Promise<ApiResponse<"putRealEstateAdminMarketsByMarketCode">> {
  return executeApiOperation<"putRealEstateAdminMarketsByMarketCode">(
    transport,
    "PUT",
    "/real-estate/admin/markets/{marketCode}",
    input,
    "application/json",
  );
}
export function patchRealEstateAdminMarketsByMarketCodeAddOnsByAddOnId(
  transport: ApiTransport,
  input: ApiInput<"patchRealEstateAdminMarketsByMarketCodeAddOnsByAddOnId">,
): Promise<
  ApiResponse<"patchRealEstateAdminMarketsByMarketCodeAddOnsByAddOnId">
> {
  return executeApiOperation<"patchRealEstateAdminMarketsByMarketCodeAddOnsByAddOnId">(
    transport,
    "PATCH",
    "/real-estate/admin/markets/{marketCode}/add-ons/{addOnId}",
    input,
    "application/json",
  );
}
export function patchRealEstateAdminMarketsByMarketCodeOffersByOfferId(
  transport: ApiTransport,
  input: ApiInput<"patchRealEstateAdminMarketsByMarketCodeOffersByOfferId">,
): Promise<
  ApiResponse<"patchRealEstateAdminMarketsByMarketCodeOffersByOfferId">
> {
  return executeApiOperation<"patchRealEstateAdminMarketsByMarketCodeOffersByOfferId">(
    transport,
    "PATCH",
    "/real-estate/admin/markets/{marketCode}/offers/{offerId}",
    input,
    "application/json",
  );
}
export function getRealEstateAdminOverview(
  transport: ApiTransport,
  input: ApiInput<"getRealEstateAdminOverview">,
): Promise<ApiResponse<"getRealEstateAdminOverview">> {
  return executeApiOperation<"getRealEstateAdminOverview">(
    transport,
    "GET",
    "/real-estate/admin/overview",
    input,
    "application/json",
  );
}
export function postRealEstateAgenciesByOrganizationIdImports(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateAgenciesByOrganizationIdImports">,
): Promise<ApiResponse<"postRealEstateAgenciesByOrganizationIdImports">> {
  return executeApiOperation<"postRealEstateAgenciesByOrganizationIdImports">(
    transport,
    "POST",
    "/real-estate/agencies/{organizationId}/imports",
    input,
    "application/json",
  );
}
export function patchRealEstateAgenciesByOrganizationIdLeadsByLeadId(
  transport: ApiTransport,
  input: ApiInput<"patchRealEstateAgenciesByOrganizationIdLeadsByLeadId">,
): Promise<
  ApiResponse<"patchRealEstateAgenciesByOrganizationIdLeadsByLeadId">
> {
  return executeApiOperation<"patchRealEstateAgenciesByOrganizationIdLeadsByLeadId">(
    transport,
    "PATCH",
    "/real-estate/agencies/{organizationId}/leads/{leadId}",
    input,
    "application/json",
  );
}
export function postRealEstateAgenciesByOrganizationIdLeadsByLeadIdNotes(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateAgenciesByOrganizationIdLeadsByLeadIdNotes">,
): Promise<
  ApiResponse<"postRealEstateAgenciesByOrganizationIdLeadsByLeadIdNotes">
> {
  return executeApiOperation<"postRealEstateAgenciesByOrganizationIdLeadsByLeadIdNotes">(
    transport,
    "POST",
    "/real-estate/agencies/{organizationId}/leads/{leadId}/notes",
    input,
    "application/json",
  );
}
export function getRealEstateAgenciesByOrganizationIdLeadsExport(
  transport: ApiTransport,
  input: ApiInput<"getRealEstateAgenciesByOrganizationIdLeadsExport">,
): Promise<ApiResponse<"getRealEstateAgenciesByOrganizationIdLeadsExport">> {
  return executeApiOperation<"getRealEstateAgenciesByOrganizationIdLeadsExport">(
    transport,
    "GET",
    "/real-estate/agencies/{organizationId}/leads/export",
    input,
    "application/json",
  );
}
export function getRealEstateAgenciesByOrganizationIdWorkspace(
  transport: ApiTransport,
  input: ApiInput<"getRealEstateAgenciesByOrganizationIdWorkspace">,
): Promise<ApiResponse<"getRealEstateAgenciesByOrganizationIdWorkspace">> {
  return executeApiOperation<"getRealEstateAgenciesByOrganizationIdWorkspace">(
    transport,
    "GET",
    "/real-estate/agencies/{organizationId}/workspace",
    input,
    "application/json",
  );
}
export function getRealEstateCatalog(
  transport: ApiTransport,
  input: ApiInput<"getRealEstateCatalog">,
): Promise<ApiResponse<"getRealEstateCatalog">> {
  return executeApiOperation<"getRealEstateCatalog">(
    transport,
    "GET",
    "/real-estate/catalog",
    input,
    "application/json",
  );
}
export function postRealEstateCheckouts(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateCheckouts">,
): Promise<ApiResponse<"postRealEstateCheckouts">> {
  return executeApiOperation<"postRealEstateCheckouts">(
    transport,
    "POST",
    "/real-estate/checkouts",
    input,
    "application/json",
  );
}
export function postRealEstateCheckoutsByCheckoutIdRefunds(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateCheckoutsByCheckoutIdRefunds">,
): Promise<ApiResponse<"postRealEstateCheckoutsByCheckoutIdRefunds">> {
  return executeApiOperation<"postRealEstateCheckoutsByCheckoutIdRefunds">(
    transport,
    "POST",
    "/real-estate/checkouts/{checkoutId}/refunds",
    input,
    "application/json",
  );
}
export function postRealestateDrafts(
  transport: ApiTransport,
  input: ApiInput<"postRealestateDrafts">,
): Promise<ApiResponse<"postRealestateDrafts">> {
  return executeApiOperation<"postRealestateDrafts">(
    transport,
    "POST",
    "/real-estate/drafts",
    input,
    "application/json",
  );
}
export function getRealEstateDraftsById(
  transport: ApiTransport,
  input: ApiInput<"getRealEstateDraftsById">,
): Promise<ApiResponse<"getRealEstateDraftsById">> {
  return executeApiOperation<"getRealEstateDraftsById">(
    transport,
    "GET",
    "/real-estate/drafts/{id}",
    input,
    "application/json",
  );
}
export function putRealEstateDraftsById(
  transport: ApiTransport,
  input: ApiInput<"putRealEstateDraftsById">,
): Promise<ApiResponse<"putRealEstateDraftsById">> {
  return executeApiOperation<"putRealEstateDraftsById">(
    transport,
    "PUT",
    "/real-estate/drafts/{id}",
    input,
    "application/json",
  );
}
export function postRealEstateDraftsByIdSubmit(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateDraftsByIdSubmit">,
): Promise<ApiResponse<"postRealEstateDraftsByIdSubmit">> {
  return executeApiOperation<"postRealEstateDraftsByIdSubmit">(
    transport,
    "POST",
    "/real-estate/drafts/{id}/submit",
    input,
    "application/json",
  );
}
export function postRealEstateLeads(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateLeads">,
): Promise<ApiResponse<"postRealEstateLeads">> {
  return executeApiOperation<"postRealEstateLeads">(
    transport,
    "POST",
    "/real-estate/leads",
    input,
    "application/json",
  );
}
export function postRealEstateLeadsByLeadIdAppointments(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateLeadsByLeadIdAppointments">,
): Promise<ApiResponse<"postRealEstateLeadsByLeadIdAppointments">> {
  return executeApiOperation<"postRealEstateLeadsByLeadIdAppointments">(
    transport,
    "POST",
    "/real-estate/leads/{leadId}/appointments",
    input,
    "application/json",
  );
}
export function getRealEstatePropertiesById(
  transport: ApiTransport,
  input: ApiInput<"getRealEstatePropertiesById">,
): Promise<ApiResponse<"getRealEstatePropertiesById">> {
  return executeApiOperation<"getRealEstatePropertiesById">(
    transport,
    "GET",
    "/real-estate/properties/{id}",
    input,
    "application/json",
  );
}
export function getRealEstatePropertiesByIdComparables(
  transport: ApiTransport,
  input: ApiInput<"getRealEstatePropertiesByIdComparables">,
): Promise<ApiResponse<"getRealEstatePropertiesByIdComparables">> {
  return executeApiOperation<"getRealEstatePropertiesByIdComparables">(
    transport,
    "GET",
    "/real-estate/properties/{id}/comparables",
    input,
    "application/json",
  );
}
export function getRealEstatePropertiesByIdDocumentsByDocumentIdAccess(
  transport: ApiTransport,
  input: ApiInput<"getRealEstatePropertiesByIdDocumentsByDocumentIdAccess">,
): Promise<
  ApiResponse<"getRealEstatePropertiesByIdDocumentsByDocumentIdAccess">
> {
  return executeApiOperation<"getRealEstatePropertiesByIdDocumentsByDocumentIdAccess">(
    transport,
    "GET",
    "/real-estate/properties/{id}/documents/{documentId}/access",
    input,
    "application/json",
  );
}
export function getRealEstateRecentlyViewed(
  transport: ApiTransport,
  input: ApiInput<"getRealEstateRecentlyViewed">,
): Promise<ApiResponse<"getRealEstateRecentlyViewed">> {
  return executeApiOperation<"getRealEstateRecentlyViewed">(
    transport,
    "GET",
    "/real-estate/recently-viewed",
    input,
    "application/json",
  );
}
export function postRealEstateRecentlyViewed(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateRecentlyViewed">,
): Promise<ApiResponse<"postRealEstateRecentlyViewed">> {
  return executeApiOperation<"postRealEstateRecentlyViewed">(
    transport,
    "POST",
    "/real-estate/recently-viewed",
    input,
    "application/json",
  );
}
export function postRealEstateSearch(
  transport: ApiTransport,
  input: ApiInput<"postRealEstateSearch">,
): Promise<ApiResponse<"postRealEstateSearch">> {
  return executeApiOperation<"postRealEstateSearch">(
    transport,
    "POST",
    "/real-estate/search",
    input,
    "application/json",
  );
}
export function postReports(
  transport: ApiTransport,
  input: ApiInput<"postReports">,
): Promise<ApiResponse<"postReports">> {
  return executeApiOperation<"postReports">(
    transport,
    "POST",
    "/reports",
    input,
    "application/json",
  );
}
export function getOrderReviewEligibility(
  transport: ApiTransport,
  input: ApiInput<"getOrderReviewEligibility">,
): Promise<ApiResponse<"getOrderReviewEligibility">> {
  return executeApiOperation<"getOrderReviewEligibility">(
    transport,
    "GET",
    "/orders/{id}/review",
    input,
    "application/json",
  );
}
export function postReviewsSubmit(
  transport: ApiTransport,
  input: ApiInput<"postReviewsSubmit">,
): Promise<ApiResponse<"postReviewsSubmit">> {
  return executeApiOperation<"postReviewsSubmit">(
    transport,
    "POST",
    "/reviews/submit",
    input,
    "application/json",
  );
}
export function getReviewsUserByUserId(
  transport: ApiTransport,
  input: ApiInput<"getReviewsUserByUserId">,
): Promise<ApiResponse<"getReviewsUserByUserId">> {
  return executeApiOperation<"getReviewsUserByUserId">(
    transport,
    "GET",
    "/reviews/user/{userId}",
    input,
    "application/json",
  );
}
export function getSupportCases(
  transport: ApiTransport,
  input: ApiInput<"getSupportCases">,
): Promise<ApiResponse<"getSupportCases">> {
  return executeApiOperation<"getSupportCases">(
    transport,
    "GET",
    "/support/cases",
    input,
    "application/json",
  );
}
export function postSupportCases(
  transport: ApiTransport,
  input: ApiInput<"postSupportCases">,
): Promise<ApiResponse<"postSupportCases">> {
  return executeApiOperation<"postSupportCases">(
    transport,
    "POST",
    "/support/cases",
    input,
    "application/json",
  );
}
export function getSupportCasesById(
  transport: ApiTransport,
  input: ApiInput<"getSupportCasesById">,
): Promise<ApiResponse<"getSupportCasesById">> {
  return executeApiOperation<"getSupportCasesById">(
    transport,
    "GET",
    "/support/cases/{id}",
    input,
    "application/json",
  );
}
export function patchSupportCasesById(
  transport: ApiTransport,
  input: ApiInput<"patchSupportCasesById">,
): Promise<ApiResponse<"patchSupportCasesById">> {
  return executeApiOperation<"patchSupportCasesById">(
    transport,
    "PATCH",
    "/support/cases/{id}",
    input,
    "application/json",
  );
}
export function postSupportCasesByIdNotes(
  transport: ApiTransport,
  input: ApiInput<"postSupportCasesByIdNotes">,
): Promise<ApiResponse<"postSupportCasesByIdNotes">> {
  return executeApiOperation<"postSupportCasesByIdNotes">(
    transport,
    "POST",
    "/support/cases/{id}/notes",
    input,
    "application/json",
  );
}
export function getSupportCasesMine(
  transport: ApiTransport,
  input: ApiInput<"getSupportCasesMine">,
): Promise<ApiResponse<"getSupportCasesMine">> {
  return executeApiOperation<"getSupportCasesMine">(
    transport,
    "GET",
    "/support/cases/mine",
    input,
    "application/json",
  );
}
export function getSupportMetrics(
  transport: ApiTransport,
  input: ApiInput<"getSupportMetrics">,
): Promise<ApiResponse<"getSupportMetrics">> {
  return executeApiOperation<"getSupportMetrics">(
    transport,
    "GET",
    "/support/metrics",
    input,
    "application/json",
  );
}
export function getTaxonomyV1Tree(
  transport: ApiTransport,
  input: ApiInput<"getTaxonomyV1Tree">,
): Promise<ApiResponse<"getTaxonomyV1Tree">> {
  return executeApiOperation<"getTaxonomyV1Tree">(
    transport,
    "GET",
    "/taxonomy/v1/tree",
    input,
    "application/json",
  );
}
export function resolveTaxonomyV1PublicationSchema(
  transport: ApiTransport,
  input: ApiInput<"resolveTaxonomyV1PublicationSchema">,
): Promise<ApiResponse<"resolveTaxonomyV1PublicationSchema">> {
  return executeApiOperation<"resolveTaxonomyV1PublicationSchema">(
    transport,
    "GET",
    "/taxonomy/v1/resolve",
    input,
    "application/json",
  );
}
export function getTaxonomyV1Options(
  transport: ApiTransport,
  input: ApiInput<"getTaxonomyV1Options">,
): Promise<ApiResponse<"getTaxonomyV1Options">> {
  return executeApiOperation<"getTaxonomyV1Options">(
    transport,
    "GET",
    "/taxonomy/v1/options/{optionSetId}",
    input,
    "application/json",
  );
}
export function getProfessionalUsers(
  transport: ApiTransport,
  input: ApiInput<"getProfessionalUsers">,
): Promise<ApiResponse<"getProfessionalUsers">> {
  return executeApiOperation<"getProfessionalUsers">(
    transport,
    "GET",
    "/users/professionals",
    input,
    "application/json",
  );
}
export function getUsersById(
  transport: ApiTransport,
  input: ApiInput<"getUsersById">,
): Promise<ApiResponse<"getUsersById">> {
  return executeApiOperation<"getUsersById">(
    transport,
    "GET",
    "/users/{id}",
    input,
    "application/json",
  );
}
export function putUsersById(
  transport: ApiTransport,
  input: ApiInput<"putUsersById">,
): Promise<ApiResponse<"putUsersById">> {
  return executeApiOperation<"putUsersById">(
    transport,
    "PUT",
    "/users/{id}",
    input,
    "application/json",
  );
}
export function postVerificationBusinessRegistration(
  transport: ApiTransport,
  input: ApiInput<"postVerificationBusinessRegistration">,
): Promise<ApiResponse<"postVerificationBusinessRegistration">> {
  return executeApiOperation<"postVerificationBusinessRegistration">(
    transport,
    "POST",
    "/verification/business-registration",
    input,
    "application/json",
  );
}
export function getVerificationSiretLookupBySiret(
  transport: ApiTransport,
  input: ApiInput<"getVerificationSiretLookupBySiret">,
): Promise<ApiResponse<"getVerificationSiretLookupBySiret">> {
  return executeApiOperation<"getVerificationSiretLookupBySiret">(
    transport,
    "GET",
    "/verification/siret-lookup/{siret}",
    input,
    "application/json",
  );
}
export function getVerificationStatusByUserId(
  transport: ApiTransport,
  input: ApiInput<"getVerificationStatusByUserId">,
): Promise<ApiResponse<"getVerificationStatusByUserId">> {
  return executeApiOperation<"getVerificationStatusByUserId">(
    transport,
    "GET",
    "/verification/status/{userId}",
    input,
    "application/json",
  );
}
export function postWebhooksComplianceByProvider(
  transport: ApiTransport,
  input: ApiInput<"postWebhooksComplianceByProvider">,
): Promise<ApiResponse<"postWebhooksComplianceByProvider">> {
  return executeApiOperation<"postWebhooksComplianceByProvider">(
    transport,
    "POST",
    "/webhooks/compliance/{provider}",
    input,
    "application/json",
  );
}
export function postWebhooksStripe(
  transport: ApiTransport,
  input: ApiInput<"postWebhooksStripe">,
): Promise<ApiResponse<"postWebhooksStripe">> {
  return executeApiOperation<"postWebhooksStripe">(
    transport,
    "POST",
    "/webhooks/stripe",
    input,
    "application/json",
  );
}
export function postWebhooksStripeConnectV2(
  transport: ApiTransport,
  input: ApiInput<"postWebhooksStripeConnectV2">,
): Promise<ApiResponse<"postWebhooksStripeConnectV2">> {
  return executeApiOperation<"postWebhooksStripeConnectV2">(
    transport,
    "POST",
    "/webhooks/stripe-connect-v2",
    input,
    "application/json",
  );
}
export function getWatchSubscriptions(
  transport: ApiTransport,
  input: ApiInput<"getWatchSubscriptions">,
): Promise<ApiResponse<"getWatchSubscriptions">> {
  return executeApiOperation<"getWatchSubscriptions">(
    transport,
    "GET",
    "/watch-subscriptions",
    input,
    "application/json",
  );
}
export function postWatchSubscription(
  transport: ApiTransport,
  input: ApiInput<"postWatchSubscription">,
): Promise<ApiResponse<"postWatchSubscription">> {
  return executeApiOperation<"postWatchSubscription">(
    transport,
    "POST",
    "/watch-subscriptions",
    input,
    "application/json",
  );
}
export function patchWatchSubscription(
  transport: ApiTransport,
  input: ApiInput<"patchWatchSubscription">,
): Promise<ApiResponse<"patchWatchSubscription">> {
  return executeApiOperation<"patchWatchSubscription">(
    transport,
    "PATCH",
    "/watch-subscriptions/{id}",
    input,
    "application/json",
  );
}
export function deleteWatchSubscription(
  transport: ApiTransport,
  input: ApiInput<"deleteWatchSubscription">,
): Promise<ApiResponse<"deleteWatchSubscription">> {
  return executeApiOperation<"deleteWatchSubscription">(
    transport,
    "DELETE",
    "/watch-subscriptions/{id}",
    input,
    "application/json",
  );
}
export function getWorkspaceProAnalyticsBySellerId(
  transport: ApiTransport,
  input: ApiInput<"getWorkspaceProAnalyticsBySellerId">,
): Promise<ApiResponse<"getWorkspaceProAnalyticsBySellerId">> {
  return executeApiOperation<"getWorkspaceProAnalyticsBySellerId">(
    transport,
    "GET",
    "/workspace/pro-analytics/{sellerId}",
    input,
    "application/json",
  );
}
export function activateInvoicingForCurrentOrganization(
  transport: ApiTransport,
  input: ApiInput<"activateInvoicingForCurrentOrganization">,
): Promise<ApiResponse<"activateInvoicingForCurrentOrganization">> {
  return executeApiOperation<"activateInvoicingForCurrentOrganization">(
    transport,
    "POST",
    "/invoicing/activation",
    input,
    "application/json",
  );
}
export function getInvoicingWorkspace(
  transport: ApiTransport,
  input: ApiInput<"getInvoicingWorkspace">,
): Promise<ApiResponse<"getInvoicingWorkspace">> {
  return executeApiOperation<"getInvoicingWorkspace">(
    transport,
    "GET",
    "/invoicing/workspace",
    input,
    "application/json",
  );
}
export function listInvoicingLegalEntities(
  transport: ApiTransport,
  input: ApiInput<"listInvoicingLegalEntities">,
): Promise<ApiResponse<"listInvoicingLegalEntities">> {
  return executeApiOperation<"listInvoicingLegalEntities">(
    transport,
    "GET",
    "/invoicing/legal-entities",
    input,
    "application/json",
  );
}
export function createInvoicingLegalEntity(
  transport: ApiTransport,
  input: ApiInput<"createInvoicingLegalEntity">,
): Promise<ApiResponse<"createInvoicingLegalEntity">> {
  return executeApiOperation<"createInvoicingLegalEntity">(
    transport,
    "POST",
    "/invoicing/legal-entities",
    input,
    "application/json",
  );
}
export function bootstrapInvoicingLegalEntityFromOrganization(
  transport: ApiTransport,
  input: ApiInput<"bootstrapInvoicingLegalEntityFromOrganization">,
): Promise<ApiResponse<"bootstrapInvoicingLegalEntityFromOrganization">> {
  return executeApiOperation<"bootstrapInvoicingLegalEntityFromOrganization">(
    transport,
    "POST",
    "/invoicing/legal-entities/from-organization",
    input,
    "application/json",
  );
}
export function listInvoicingParties(
  transport: ApiTransport,
  input: ApiInput<"listInvoicingParties">,
): Promise<ApiResponse<"listInvoicingParties">> {
  return executeApiOperation<"listInvoicingParties">(
    transport,
    "GET",
    "/invoicing/parties",
    input,
    "application/json",
  );
}
export function createInvoicingParty(
  transport: ApiTransport,
  input: ApiInput<"createInvoicingParty">,
): Promise<ApiResponse<"createInvoicingParty">> {
  return executeApiOperation<"createInvoicingParty">(
    transport,
    "POST",
    "/invoicing/parties",
    input,
    "application/json",
  );
}
export function listInvoicingInvoices(
  transport: ApiTransport,
  input: ApiInput<"listInvoicingInvoices">,
): Promise<ApiResponse<"listInvoicingInvoices">> {
  return executeApiOperation<"listInvoicingInvoices">(
    transport,
    "GET",
    "/invoicing/invoices",
    input,
    "application/json",
  );
}
export function createInvoicingInvoice(
  transport: ApiTransport,
  input: ApiInput<"createInvoicingInvoice">,
): Promise<ApiResponse<"createInvoicingInvoice">> {
  return executeApiOperation<"createInvoicingInvoice">(
    transport,
    "POST",
    "/invoicing/invoices",
    input,
    "application/json",
  );
}
export function getInvoicingInvoice(
  transport: ApiTransport,
  input: ApiInput<"getInvoicingInvoice">,
): Promise<ApiResponse<"getInvoicingInvoice">> {
  return executeApiOperation<"getInvoicingInvoice">(
    transport,
    "GET",
    "/invoicing/invoices/{invoiceId}",
    input,
    "application/json",
  );
}
export function updateInvoicingInvoiceDraft(
  transport: ApiTransport,
  input: ApiInput<"updateInvoicingInvoiceDraft">,
): Promise<ApiResponse<"updateInvoicingInvoiceDraft">> {
  return executeApiOperation<"updateInvoicingInvoiceDraft">(
    transport,
    "PUT",
    "/invoicing/invoices/{invoiceId}",
    input,
    "application/json",
  );
}
export function finalizeInvoicingInvoice(
  transport: ApiTransport,
  input: ApiInput<"finalizeInvoicingInvoice">,
): Promise<ApiResponse<"finalizeInvoicingInvoice">> {
  return executeApiOperation<"finalizeInvoicingInvoice">(
    transport,
    "POST",
    "/invoicing/invoices/{invoiceId}/finalize",
    input,
    "application/json",
  );
}
export function getInvoicingDocument(
  transport: ApiTransport,
  input: ApiInput<"getInvoicingDocument">,
): Promise<ApiResponse<"getInvoicingDocument">> {
  return executeApiOperation<"getInvoicingDocument">(
    transport,
    "GET",
    "/invoicing/invoices/{invoiceId}/document",
    input,
    "application/json",
  );
}
export function getWorkspaceSummaryByUserId(
  transport: ApiTransport,
  input: ApiInput<"getWorkspaceSummaryByUserId">,
): Promise<ApiResponse<"getWorkspaceSummaryByUserId">> {
  return executeApiOperation<"getWorkspaceSummaryByUserId">(
    transport,
    "GET",
    "/workspace/summary/{userId}",
    input,
    "application/json",
  );
}
export function getDeliveryAvailability(
  transport: ApiTransport,
  input: ApiInput<"getDeliveryAvailability">,
): Promise<ApiResponse<"getDeliveryAvailability">> {
  return executeApiOperation<"getDeliveryAvailability">(
    transport,
    "GET",
    "/delivery/availability",
    input,
    "application/json",
  );
}
export function getDeliveryFavorites(
  transport: ApiTransport,
  input: ApiInput<"getDeliveryFavorites">,
): Promise<ApiResponse<"getDeliveryFavorites">> {
  return executeApiOperation<"getDeliveryFavorites">(
    transport,
    "GET",
    "/delivery/favorites",
    input,
    "application/json",
  );
}
export function getDeliveryRequests(
  transport: ApiTransport,
  input: ApiInput<"getDeliveryRequests">,
): Promise<ApiResponse<"getDeliveryRequests">> {
  return executeApiOperation<"getDeliveryRequests">(
    transport,
    "GET",
    "/delivery/requests",
    input,
    "application/json",
  );
}
export function postDeliveryRequest(
  transport: ApiTransport,
  input: ApiInput<"postDeliveryRequest">,
): Promise<ApiResponse<"postDeliveryRequest">> {
  return executeApiOperation<"postDeliveryRequest">(
    transport,
    "POST",
    "/delivery/requests",
    input,
    "application/json",
  );
}
export function getDeliveryRequest(
  transport: ApiTransport,
  input: ApiInput<"getDeliveryRequest">,
): Promise<ApiResponse<"getDeliveryRequest">> {
  return executeApiOperation<"getDeliveryRequest">(
    transport,
    "GET",
    "/delivery/requests/{requestId}",
    input,
    "application/json",
  );
}
export function putDeliveryRequestFavorite(
  transport: ApiTransport,
  input: ApiInput<"putDeliveryRequestFavorite">,
): Promise<ApiResponse<"putDeliveryRequestFavorite">> {
  return executeApiOperation<"putDeliveryRequestFavorite">(
    transport,
    "PUT",
    "/delivery/requests/{requestId}/favorite",
    input,
    "application/json",
  );
}
export function postDeliveryRequestPublish(
  transport: ApiTransport,
  input: ApiInput<"postDeliveryRequestPublish">,
): Promise<ApiResponse<"postDeliveryRequestPublish">> {
  return executeApiOperation<"postDeliveryRequestPublish">(
    transport,
    "POST",
    "/delivery/requests/{requestId}/publish",
    input,
    "application/json",
  );
}
export function getDeliveryCourierProfile(
  transport: ApiTransport,
  input: ApiInput<"getDeliveryCourierProfile">,
): Promise<ApiResponse<"getDeliveryCourierProfile">> {
  return executeApiOperation<"getDeliveryCourierProfile">(
    transport,
    "GET",
    "/delivery/courier/profile",
    input,
    "application/json",
  );
}
export function putDeliveryCourierProfile(
  transport: ApiTransport,
  input: ApiInput<"putDeliveryCourierProfile">,
): Promise<ApiResponse<"putDeliveryCourierProfile">> {
  return executeApiOperation<"putDeliveryCourierProfile">(
    transport,
    "PUT",
    "/delivery/courier/profile",
    input,
    "application/json",
  );
}
export function getOwnDeliveryRequests(
  transport: ApiTransport,
  input: ApiInput<"getOwnDeliveryRequests">,
): Promise<ApiResponse<"getOwnDeliveryRequests">> {
  return executeApiOperation<"getOwnDeliveryRequests">(
    transport,
    "GET",
    "/delivery/me/requests",
    input,
    "application/json",
  );
}
export function getOwnDeliveryRequest(
  transport: ApiTransport,
  input: ApiInput<"getOwnDeliveryRequest">,
): Promise<ApiResponse<"getOwnDeliveryRequest">> {
  return executeApiOperation<"getOwnDeliveryRequest">(
    transport,
    "GET",
    "/delivery/me/requests/{requestId}",
    input,
    "application/json",
  );
}
export function postDeliveryApplication(
  transport: ApiTransport,
  input: ApiInput<"postDeliveryApplication">,
): Promise<ApiResponse<"postDeliveryApplication">> {
  return executeApiOperation<"postDeliveryApplication">(
    transport,
    "POST",
    "/delivery/requests/{requestId}/applications",
    input,
    "application/json",
  );
}
export function getOwnDeliveryApplications(
  transport: ApiTransport,
  input: ApiInput<"getOwnDeliveryApplications">,
): Promise<ApiResponse<"getOwnDeliveryApplications">> {
  return executeApiOperation<"getOwnDeliveryApplications">(
    transport,
    "GET",
    "/delivery/me/applications",
    input,
    "application/json",
  );
}
export function postDeliveryApplicationWithdraw(
  transport: ApiTransport,
  input: ApiInput<"postDeliveryApplicationWithdraw">,
): Promise<ApiResponse<"postDeliveryApplicationWithdraw">> {
  return executeApiOperation<"postDeliveryApplicationWithdraw">(
    transport,
    "POST",
    "/delivery/applications/{applicationId}/withdraw",
    input,
    "application/json",
  );
}
export function postDeliveryApplicationAccept(
  transport: ApiTransport,
  input: ApiInput<"postDeliveryApplicationAccept">,
): Promise<ApiResponse<"postDeliveryApplicationAccept">> {
  return executeApiOperation<"postDeliveryApplicationAccept">(
    transport,
    "POST",
    "/delivery/requests/{requestId}/applications/{applicationId}/accept",
    input,
    "application/json",
  );
}
export function postDeliveryRequestTransition(
  transport: ApiTransport,
  input: ApiInput<"postDeliveryRequestTransition">,
): Promise<ApiResponse<"postDeliveryRequestTransition">> {
  return executeApiOperation<"postDeliveryRequestTransition">(
    transport,
    "POST",
    "/delivery/requests/{requestId}/transition",
    input,
    "application/json",
  );
}
export function getAdminDeliveryRequests(
  transport: ApiTransport,
  input: ApiInput<"getAdminDeliveryRequests">,
): Promise<ApiResponse<"getAdminDeliveryRequests">> {
  return executeApiOperation<"getAdminDeliveryRequests">(
    transport,
    "GET",
    "/admin/delivery/requests",
    input,
    "application/json",
  );
}
export function postAdminDeliveryRequestSuspend(
  transport: ApiTransport,
  input: ApiInput<"postAdminDeliveryRequestSuspend">,
): Promise<ApiResponse<"postAdminDeliveryRequestSuspend">> {
  return executeApiOperation<"postAdminDeliveryRequestSuspend">(
    transport,
    "POST",
    "/admin/delivery/requests/{requestId}/suspend",
    input,
    "application/json",
  );
}
export function getAdminTaxonomyDraft(
  transport: ApiTransport,
  input: ApiInput<"getAdminTaxonomyDraft">,
): Promise<ApiResponse<"getAdminTaxonomyDraft">> {
  return executeApiOperation<"getAdminTaxonomyDraft">(
    transport,
    "GET",
    "/admin/taxonomy/draft",
    input,
    "application/json",
  );
}
export function updateAdminTaxonomyDraft(
  transport: ApiTransport,
  input: ApiInput<"updateAdminTaxonomyDraft">,
): Promise<ApiResponse<"updateAdminTaxonomyDraft">> {
  return executeApiOperation<"updateAdminTaxonomyDraft">(
    transport,
    "PUT",
    "/admin/taxonomy/draft",
    input,
    "application/json",
  );
}
export function getAdminTaxonomyPreview(
  transport: ApiTransport,
  input: ApiInput<"getAdminTaxonomyPreview">,
): Promise<ApiResponse<"getAdminTaxonomyPreview">> {
  return executeApiOperation<"getAdminTaxonomyPreview">(
    transport,
    "GET",
    "/admin/taxonomy/preview",
    input,
    "application/json",
  );
}
export function publishAdminTaxonomyRevision(
  transport: ApiTransport,
  input: ApiInput<"publishAdminTaxonomyRevision">,
): Promise<ApiResponse<"publishAdminTaxonomyRevision">> {
  return executeApiOperation<"publishAdminTaxonomyRevision">(
    transport,
    "POST",
    "/admin/taxonomy/publish",
    input,
    "application/json",
  );
}
export function rollbackAdminTaxonomyRevision(
  transport: ApiTransport,
  input: ApiInput<"rollbackAdminTaxonomyRevision">,
): Promise<ApiResponse<"rollbackAdminTaxonomyRevision">> {
  return executeApiOperation<"rollbackAdminTaxonomyRevision">(
    transport,
    "POST",
    "/admin/taxonomy/rollback",
    input,
    "application/json",
  );
}
export function getAdminTaxonomyHistory(
  transport: ApiTransport,
  input: ApiInput<"getAdminTaxonomyHistory">,
): Promise<ApiResponse<"getAdminTaxonomyHistory">> {
  return executeApiOperation<"getAdminTaxonomyHistory">(
    transport,
    "GET",
    "/admin/taxonomy/history",
    input,
    "application/json",
  );
}
export function getTaxonomyHeaderNavigation(
  transport: ApiTransport,
  input: ApiInput<"getTaxonomyHeaderNavigation">,
): Promise<ApiResponse<"getTaxonomyHeaderNavigation">> {
  return executeApiOperation<"getTaxonomyHeaderNavigation">(
    transport,
    "GET",
    "/taxonomy/v1/header-navigation",
    input,
    "application/json",
  );
}
export function getTaxonomyNodesById(
  transport: ApiTransport,
  input: ApiInput<"getTaxonomyNodesById">,
): Promise<ApiResponse<"getTaxonomyNodesById">> {
  return executeApiOperation<"getTaxonomyNodesById">(
    transport,
    "GET",
    "/taxonomy/v1/nodes/{id}",
    input,
    "application/json",
  );
}
export function getTaxonomyRoot(
  transport: ApiTransport,
  input: ApiInput<"getTaxonomyRoot">,
): Promise<ApiResponse<"getTaxonomyRoot">> {
  return executeApiOperation<"getTaxonomyRoot">(
    transport,
    "GET",
    "/taxonomy/v1/root",
    input,
    "application/json",
  );
}
export function getTaxonomySearchFilters(
  transport: ApiTransport,
  input: ApiInput<"getTaxonomySearchFilters">,
): Promise<ApiResponse<"getTaxonomySearchFilters">> {
  return executeApiOperation<"getTaxonomySearchFilters">(
    transport,
    "GET",
    "/taxonomy/v1/search-filters",
    input,
    "application/json",
  );
}
export function getDiscoveryCollections(
  transport: ApiTransport,
  input: ApiInput<"getDiscoveryCollections">,
): Promise<ApiResponse<"getDiscoveryCollections">> {
  return executeApiOperation<"getDiscoveryCollections">(
    transport,
    "GET",
    "/discovery/collections",
    input,
    "application/json",
  );
}
export function getGeoMapConfig(
  transport: ApiTransport,
  input: ApiInput<"getGeoMapConfig">,
): Promise<ApiResponse<"getGeoMapConfig">> {
  return executeApiOperation<"getGeoMapConfig">(
    transport,
    "GET",
    "/geo/map-config",
    input,
    "application/json",
  );
}
export function getGeoAddressSuggestions(
  transport: ApiTransport,
  input: ApiInput<"getGeoAddressSuggestions">,
): Promise<ApiResponse<"getGeoAddressSuggestions">> {
  return executeApiOperation<"getGeoAddressSuggestions">(
    transport,
    "GET",
    "/geo/address-suggestions",
    input,
    "application/json",
  );
}
export function getGeoReverseGeocoding(
  transport: ApiTransport,
  input: ApiInput<"getGeoReverseGeocoding">,
): Promise<ApiResponse<"getGeoReverseGeocoding">> {
  return executeApiOperation<"getGeoReverseGeocoding">(
    transport,
    "GET",
    "/geo/reverse",
    input,
    "application/json",
  );
}
export function getMessagingPresence(
  transport: ApiTransport,
  input: ApiInput<"getMessagingPresence">,
): Promise<ApiResponse<"getMessagingPresence">> {
  return executeApiOperation<"getMessagingPresence">(
    transport,
    "GET",
    "/messaging/presence",
    input,
    "application/json",
  );
}
export function postMessagingPresence(
  transport: ApiTransport,
  input: ApiInput<"postMessagingPresence">,
): Promise<ApiResponse<"postMessagingPresence">> {
  return executeApiOperation<"postMessagingPresence">(
    transport,
    "POST",
    "/messaging/presence",
    input,
    "application/json",
  );
}
export const generatedApiOperations = {
  getDigitalPolicy,
  getDigitalSellerProfile,
  putDigitalSellerProfile,
  getDigitalSellerProvisioningTasks,
  postDigitalAssetUpload,
  postDigitalAssetUploadComplete,
  getDigitalAsset,
  deleteDigitalAsset,
  postDigitalAccessSecret,
  postDigitalCredentialBatch,
  postDigitalCredentialInventory,
  getDigitalCredentialInventory,
  postDigitalFulfillmentVersion,
  getDigitalEntitlements,
  getDigitalEntitlement,
  postDigitalDownloadGrant,
  postDigitalRevealGrant,
  postDigitalAccessGrantConsume,
  postDigitalProvisionedAccess,
  postDigitalAccessReport,
  getDigitalAdminOverview,
  getDigitalAdminPolicy,
  postDigitalAdminPolicyDraft,
  postDigitalAdminPolicyActivate,
  postDigitalAssetModeration,
  postDigitalFulfillmentModeration,
  postDigitalAccessReportResolve,
  postAccountDelete,
  getAccountExport,
  getAccountListings,
  postAccountUpgradeToProfessional,
  getAdminAuditLogs,
  getAdminBusinessRules,
  postAdminBusinessRulesDrafts,
  postAdminBusinessRulesSimulate,
  postAdminBusinessRulesVersionsByIdApprove,
  postAdminBusinessRulesVersionsByIdPublish,
  postAdminBusinessRulesVersionsByIdRollback,
  postAdminBusinessRulesVersionsByIdSubmit,
  getAdminCommissionsAnalytics,
  getAdminCommissionsCalculationsById,
  postAdminCommissionsCalculationsByIdReversals,
  postAdminCommissionsDrafts,
  postAdminCommissionsSimulate,
  postAdminCommissionsVersionsByIdApprove,
  postAdminCommissionsVersionsByIdPublish,
  postAdminCommissionsVersionsByIdSubmit,
  getAdminComplianceAudit,
  postAdminComplianceRetentionRun,
  getAdminComplianceReviews,
  postAdminComplianceReviewsByCaseIdDecision,
  getAdminComplianceRules,
  putAdminComplianceRulesByRuleId,
  postAdminComplianceUsersByUserIdRequirements,
  getAdminComplianceUsersByUserIdStatus,
  patchAdminCountriesByCode,
  getAdminCountriesByCodeChanges,
  postAdminCountriesByCodeChangesByIdApprove,
  postAdminCountriesByCodeChangesByIdReject,
  getAdminDiscoveryConfiguration,
  postAdminDiscoveryConfigurationDrafts,
  postAdminDiscoveryConfigurationPublish,
  postAdminDiscoveryExplain,
  getAdminDiscoveryMetrics,
  getAdminFeatureFlags,
  putAdminFeatureFlag,
  putAdminFeatureFlagRule,
  getSolutions,
  getSolutionBySlug,
  getAdminSolutions,
  postAdminSolution,
  putAdminSolutionsOrder,
  patchAdminSolution,
  postAdminSolutionLifecycle,
  getAdminSolutionLifecycleHistory,
  getAdminModerationAppeals,
  postAdminModerationAppealDecision,
  getAdminModerationCases,
  postAdminMonetizationComplimentaryGrantsRequests,
  postAdminMonetizationComplimentaryGrantsRequestsByIdDecision,
  postAdminProvidersByProviderIdTest,
  getAdminProvidersControlPlane,
  getAdminReports,
  postAdminReportsByReportIdResolve,
  getAdminStats,
  getAdminHomepageConfiguration,
  putAdminHomepageConfiguration,
  postAdminHomepagePreview,
  postAdminHomepagePublish,
  getAdminTaxonomyHeaderNavigation,
  putAdminTaxonomyHeaderNavigation,
  getAdminTrendingConfig,
  putAdminTrendingConfig,
  putAdminTrendingOverridesByTopicKey,
  getAdminUsers,
  getAdminUserCapabilities,
  updateAdminUserCapabilityOverrides,
  putAdminUsersByUserIdStatus,
  updateAdminUserStaffStatus,
  putAdminUsersByUserIdVerification,
  postAiListingAssistance,
  postAiListingSafety,
  postAnalyticsEvents,
  getAnalyticsOverview,
  getAnalyticsAcquisition,
  getAnalyticsSearch,
  getAnalyticsMonetization,
  getAnalyticsSeo,
  getAnalyticsProviders,
  getAnalyticsSeller,
  postAuthDomainHandoffExchange,
  postAuthDomainHandoffStart,
  deleteAuthIdentitiesByProvider,
  postAuthLogin,
  postAuthLogout,
  postAuthLogoutAll,
  getAuthMe,
  getAuthMfa,
  deleteAuthMfa,
  postAuthMfaChallenge,
  postAuthMfaConfirm,
  postAuthMfaSessionConfirm,
  postAuthMfaSetup,
  postAuthOauthByProviderStart,
  postAuthOauthCompleteProfile,
  postAuthOauthFacebookDataDeletion,
  getAuthOauthFacebookDataDeletionStatus,
  postAuthOauthNativeExchange,
  getAuthOauthProviders,
  postAuthPasswordAdd,
  postAuthPasswordChange,
  postAuthPasswordForgot,
  postAuthPasswordReset,
  postAuthReauthenticate,
  postAuthRefresh,
  postAuthRegister,
  getAuthSecurity,
  getAuthSessions,
  deleteAuthSessionsById,
  postAuthSwitchRole,
  postAuthVerifyEmail,
  postAuthVerifyEmailResend,
  postAuthVerifyPhone,
  putAutoAdminMarketsByMarketCode,
  patchAutoAdminMarketsByMarketCodeAddOnsByAddOnId,
  patchAutoAdminMarketsByMarketCodePlansByPlanId,
  getAutoAdminOverview,
  getAutoCatalog,
  postAutoDealersByOrganizationIdImports,
  patchAutoDealersByOrganizationIdLeadsByLeadId,
  getAutoDealersByOrganizationIdWorkspace,
  postAutoDrafts,
  getAutoDraftsById,
  putAutoDraftsById,
  postAutoDraftsByIdDuplicateCheck,
  postAutoDraftsByIdSubmit,
  getAutoFavorites,
  postAutoLeads,
  postAutoSearch,
  postAutoVehicles,
  getAutoVehiclesById,
  putAutoVehiclesByIdFavorite,
  getBusinessRulesCatalog,
  postBusinessRulesEligibility,
  postComplianceIdentitySession,
  postComplianceManualReview,
  postCompliancePaymentOnboarding,
  postComplianceRequirements,
  getComplianceStatus,
  checkCrmAccountDuplicates,
  listCrmAccounts,
  createCrmAccount,
  getCrmAccount,
  updateCrmAccount,
  getCrmAccountShongreIntelligence,
  listCrmActivities,
  createCrmActivity,
  listCrmContacts,
  createCrmContact,
  getCrmContact,
  updateCrmContact,
  listCrmCustomFields,
  createCrmCustomField,
  listCrmSavedViews,
  createCrmSavedView,
  updateCrmSavedView,
  deleteCrmSavedView,
  createPublicMarketingSubscription,
  confirmPublicMarketingSubscription,
  getPublicMarketingPreferences,
  updatePublicMarketingPreferences,
  unsubscribePublicMarketingProfile,
  getAccountMarketingSubscription,
  subscribeAccountToMarketing,
  updateAccountMarketingPreferences,
  unsubscribeAccountFromMarketing,
  getMarketingDashboard,
  listMarketingProfiles,
  createMarketingProfile,
  confirmMarketingProfile,
  unsubscribeMarketingProfile,
  listMarketingLists,
  createMarketingList,
  addMarketingListMember,
  listMarketingSegments,
  createMarketingSegment,
  listMarketingTemplates,
  createMarketingTemplate,
  listMarketingCampaigns,
  createMarketingCampaign,
  estimateMarketingAudience,
  generateMarketingCampaignDraft,
  getMarketingCampaign,
  preflightMarketingCampaign,
  testSendMarketingCampaign,
  sendMarketingCampaign,
  scheduleMarketingCampaign,
  pauseMarketingCampaign,
  cancelMarketingCampaign,
  listMarketingSuppressions,
  receiveMarketingProviderWebhook,
  resumeMarketingCampaign,
  reviewMarketingCampaign,
  approveMarketingCampaign,
  selectMarketingCampaignWinner,
  getMarketingAnalytics,
  recordMarketingConversion,
  getMarketingUsage,
  listMarketingJourneys,
  createMarketingJourney,
  activateMarketingJourney,
  pauseMarketingJourney,
  emitMarketingJourneyEvent,
  listMarketingJourneyExecutions,
  listMarketingWebhooks,
  createMarketingWebhook,
  assistMarketingWithAi,
  listProspectingProfiles,
  createProspectingProfile,
  listProspectingSources,
  discoverProspects,
  getProspectOpportunityBrief,
  importProspectCandidate,
  getProspectingUsage,
  getCrmDashboard,
  listCrmOpportunities,
  createCrmOpportunity,
  getCrmOpportunity,
  transitionCrmOpportunity,
  listCrmPipelines,
  createCrmPipeline,
  updateCrmPipeline,
  listCrmProducts,
  createCrmProduct,
  updateCrmProduct,
  listCrmQuotes,
  createCrmQuote,
  listCrmTasks,
  createCrmTask,
  completeCrmTask,
  getEducationAdminCatalog,
  putEducationAdminMarketsByMarketCode,
  patchEducationAdminMarketsByMarketCodePlansByPlanId,
  postEducationBookings,
  getEducationCatalog,
  getEducationFavorites,
  patchEducationLeadsByLeadId,
  postEducationLearnerRequests,
  postEducationOffers,
  postEducationOnboardingSubmit,
  getEducationCurrentOrganizationWorkspace,
  postEducationOrganizationsByOrganizationIdLocations,
  postEducationOrganizationsByOrganizationIdMembers,
  getEducationOrganizationsByOrganizationIdWorkspace,
  postEducationSearch,
  getEducationTutorsById,
  putEducationTutorsById,
  putEducationTutorsByIdFavorite,
  getEducationWorkflowdraftsLearnerrequest,
  putEducationWorkflowdraftsLearnerrequest,
  deleteEducationWorkflowdraftsLearnerrequest,
  getEducationWorkflowdraftsTutoronboarding,
  putEducationWorkflowdraftsTutoronboarding,
  deleteEducationWorkflowdraftsTutoronboarding,
  getEducationCurrentTutorWorkspace,
  getEducationWorkspaceByTutorProfileId,
  putEmploymentAdminMarketsByMarketCode,
  patchEmploymentAdminOffersByOfferId,
  getEmploymentAdminOverview,
  postEmploymentApplicationsByIdWithdraw,
  postEmploymentCandidateAlerts,
  deleteEmploymentCandidateAlertsById,
  postEmploymentCandidateDataExport,
  postEmploymentCandidateDeletionRequest,
  patchEmploymentCandidateInterviewsById,
  putEmploymentCandidateProfile,
  getEmploymentCandidateWorkspace,
  getEmploymentCatalog,
  postEmploymentCheckouts,
  postEmploymentComplianceProhibitedLanguage,
  postEmploymentDrafts,
  getEmploymentDraftsById,
  putEmploymentDraftsById,
  postEmploymentDraftsByIdDuplicateCheck,
  putEmploymentDraftsByIdPublication,
  postEmploymentDraftsByIdSubmit,
  postEmploymentEmployersByEmployerIdApplicationsByApplicationIdInterviews,
  postEmploymentEmployersByEmployerIdApplicationsByApplicationIdNotes,
  patchEmploymentEmployersByEmployerIdApplicationsByApplicationIdStage,
  postEmploymentEmployersByEmployerIdImports,
  postEmploymentEmployersByEmployerIdImportsPreview,
  postEmploymentEmployersByEmployerIdJobsByJobIdDuplicate,
  getEmploymentEmployersByEmployerIdWorkspace,
  getEmploymentFavorites,
  getEmploymentJobsById,
  postEmploymentJobsByIdApplications,
  postEmploymentJobsByIdReport,
  putEmploymentJobsByIdSave,
  getEmploymentJobsByIdSimilar,
  getEmploymentRecruiterEmployers,
  postEmploymentSearch,
  getFavorites,
  getFeatureFlagEvaluation,
  getFinanceAccountOverview,
  getFinanceOrganizationOverview,
  getFinancePlatformExportsTransactions,
  getFinancePlatformOverview,
  getFinancePlatformReconciliation,
  getFinancePlatformTransactions,
  getFinancePlatformTransactionsById,
  getHome,
  getHomeTrending,
  postListingDrafts,
  getListingDraftsCurrent,
  putListingDraftsCurrent,
  getDiscoverySitemapListings,
  getListings,
  postListingsCards,
  getListingCharacteristics,
  getListingPriceQuote,
  getListingsById,
  putListingsById,
  deleteListingsById,
  postListingsByIdMarkSold,
  putListingsByIdFavorite,
  postListingsBulkimportParse,
  postListingsBulkimportPublish,
  getListingsBulkimportTemplate,
  postListingsPublish,
  getListingsSearch,
  postListingsSearch,
  getCurrencyCatalog,
  getAdminCurrencyCatalog,
  putAdminCurrency,
  putAdminExchangeRate,
  getMarkets,
  detectProbableMarket,
  detectMarketFromCoordinates,
  getMarketsByCode,
  getMarketsActive,
  postMarketsActive,
  getMarketsEffectiveByCode,
  postMediaListingsUploads,
  postMediaListingsUploadsByIdComplete,
  postMediaPrivateDocumentsUploads,
  postMediaPrivateDocumentsUploadsByIdComplete,
  postMessagingBlock,
  getMessagingBlocked,
  getMessagingConversations,
  postMessagingConversations,
  getMessagingConversationsById,
  getMessagingConversationsByIdMessages,
  postMessagingConversationsByIdMessages,
  postMessagingOffer,
  postMessagingOfferResponse,
  postMessagingOffersIdCounter,
  postMessagingOffersIdWithdraw,
  postMessagingRead,
  postMessagingSchedulePickup,
  postMessagingUnblock,
  getOwnModerationAppeals,
  postModerationCaseAppeal,
  getOwnModerationCases,
  getMonetizationBilling,
  postMonetizationCheckouts,
  getMonetizationEntitlements,
  getMonetizationInvoicesByIdDocument,
  getMonetizationProfessionalPlans,
  postMonetizationPromotionsValidate,
  postMonetizationQuotes,
  getMonetizationSubscriptions,
  patchMonetizationSubscriptionsById,
  postMonetizationSubscriptionsByIdChange,
  postMonetizationSubscriptionsByIdChangePreview,
  postMonetizationTrials,
  getNotifications,
  deleteNotificationsById,
  postNotificationsByIdRead,
  postNotificationsDevices,
  postNotificationsDevicesUnregister,
  getNotificationPreferences,
  putNotificationPreferences,
  postNotificationsReadAll,
  getNotificationsUnreadCount,
  getOrdersById,
  postOrdersByIdCancel,
  postOrdersByIdConfirmDelivery,
  postOrdersByIdConfirmPin,
  postOrdersByIdDispute,
  postOrdersByIdHandoverCode,
  postOrdersByIdRefund,
  getOrdersByIdReturns,
  postOrdersByIdReturns,
  postOrdersReturnsByReturnIdDecision,
  postOrdersReturnsByReturnIdShipped,
  postOrdersReturnsByReturnIdReceived,
  postOrdersByIdShip,
  postOrdersDirectPurchase,
  postOrdersDirectPurchaseQuote,
  getOrdersPurchases,
  postOrdersReservation,
  getOrdersSales,
  getPaymentsBalanceBySellerId,
  postPaymentsIntent,
  postPaymentsPayout,
  listProviderConnections,
  createProviderConnection,
  rotateProviderConnectionCredential,
  postPublicationEntitlements,
  putRealEstateAdminMarketsByMarketCode,
  patchRealEstateAdminMarketsByMarketCodeAddOnsByAddOnId,
  patchRealEstateAdminMarketsByMarketCodeOffersByOfferId,
  getRealEstateAdminOverview,
  postRealEstateAgenciesByOrganizationIdImports,
  patchRealEstateAgenciesByOrganizationIdLeadsByLeadId,
  postRealEstateAgenciesByOrganizationIdLeadsByLeadIdNotes,
  getRealEstateAgenciesByOrganizationIdLeadsExport,
  getRealEstateAgenciesByOrganizationIdWorkspace,
  getRealEstateCatalog,
  postRealEstateCheckouts,
  postRealEstateCheckoutsByCheckoutIdRefunds,
  postRealestateDrafts,
  getRealEstateDraftsById,
  putRealEstateDraftsById,
  postRealEstateDraftsByIdSubmit,
  postRealEstateLeads,
  postRealEstateLeadsByLeadIdAppointments,
  getRealEstatePropertiesById,
  getRealEstatePropertiesByIdComparables,
  getRealEstatePropertiesByIdDocumentsByDocumentIdAccess,
  getRealEstateRecentlyViewed,
  postRealEstateRecentlyViewed,
  postRealEstateSearch,
  postReports,
  getOrderReviewEligibility,
  postReviewsSubmit,
  getReviewsUserByUserId,
  getSupportCases,
  postSupportCases,
  getSupportCasesById,
  patchSupportCasesById,
  postSupportCasesByIdNotes,
  getSupportCasesMine,
  getSupportMetrics,
  getTaxonomyV1Tree,
  resolveTaxonomyV1PublicationSchema,
  getTaxonomyV1Options,
  getProfessionalUsers,
  getUsersById,
  putUsersById,
  postVerificationBusinessRegistration,
  getVerificationSiretLookupBySiret,
  getVerificationStatusByUserId,
  postWebhooksComplianceByProvider,
  postWebhooksStripe,
  postWebhooksStripeConnectV2,
  getWatchSubscriptions,
  postWatchSubscription,
  patchWatchSubscription,
  deleteWatchSubscription,
  getWorkspaceProAnalyticsBySellerId,
  activateInvoicingForCurrentOrganization,
  getInvoicingWorkspace,
  listInvoicingLegalEntities,
  createInvoicingLegalEntity,
  bootstrapInvoicingLegalEntityFromOrganization,
  listInvoicingParties,
  createInvoicingParty,
  listInvoicingInvoices,
  createInvoicingInvoice,
  getInvoicingInvoice,
  updateInvoicingInvoiceDraft,
  finalizeInvoicingInvoice,
  getInvoicingDocument,
  getWorkspaceSummaryByUserId,
  getDeliveryAvailability,
  getDeliveryFavorites,
  getDeliveryRequests,
  postDeliveryRequest,
  getDeliveryRequest,
  putDeliveryRequestFavorite,
  postDeliveryRequestPublish,
  getDeliveryCourierProfile,
  putDeliveryCourierProfile,
  getOwnDeliveryRequests,
  getOwnDeliveryRequest,
  postDeliveryApplication,
  getOwnDeliveryApplications,
  postDeliveryApplicationWithdraw,
  postDeliveryApplicationAccept,
  postDeliveryRequestTransition,
  getAdminDeliveryRequests,
  postAdminDeliveryRequestSuspend,
  getAdminTaxonomyDraft,
  updateAdminTaxonomyDraft,
  getAdminTaxonomyPreview,
  publishAdminTaxonomyRevision,
  rollbackAdminTaxonomyRevision,
  getAdminTaxonomyHistory,
  getTaxonomyHeaderNavigation,
  getTaxonomyNodesById,
  getTaxonomyRoot,
  getTaxonomySearchFilters,
  getDiscoveryCollections,
  getGeoMapConfig,
  getGeoAddressSuggestions,
  getGeoReverseGeocoding,
  getMessagingPresence,
  postMessagingPresence,
} as const;
export type GeneratedApiOperationId = keyof typeof generatedApiOperations;
type AnyGeneratedApiOperation = (
  transport: ApiTransport,
  input: any,
) => Promise<any>;
export function executeGeneratedApiOperation<
  Id extends GeneratedApiOperationId,
>(
  transport: ApiTransport,
  operationId: Id,
  input: ApiInput<Id>,
): Promise<ApiResponse<Id>> {
  const operation = generatedApiOperations[
    operationId
  ] as AnyGeneratedApiOperation;
  return operation(transport, input) as Promise<ApiResponse<Id>>;
}
