# Canonical endpoint inventory

> Generated from `backend/openapi/openapi.json`. Do not edit by hand.

- Contract version: `1.0.0`
- API base path: `/api/v1`
- Operations: **453**
- Specification SHA-256: `03e21f09dd1142c1`

## account

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/account/delete` | `postAccountDelete` | `permission` | `marketplace.customer.access` | `200` |

## admin-audit-logs

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/audit-logs` | `getAdminAuditLogs` | `permission` | `audit.read` | `200` |

## admin-business-rules

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/admin/business-rules/drafts` | `postAdminBusinessRulesDrafts` | `permission` | `commercial_rules.edit` | `200` |
| `POST` | `/admin/business-rules/simulate` | `postAdminBusinessRulesSimulate` | `permission` | `commercial_rules.read` | `200` |
| `POST` | `/admin/business-rules/versions/{id}/approve` | `postAdminBusinessRulesVersionsByIdApprove` | `permission` | `commercial_rules.approve` | `200` |
| `POST` | `/admin/business-rules/versions/{id}/publish` | `postAdminBusinessRulesVersionsByIdPublish` | `permission` | `commercial_rules.publish` | `200` |
| `POST` | `/admin/business-rules/versions/{id}/rollback` | `postAdminBusinessRulesVersionsByIdRollback` | `permission` | `commercial_rules.publish` | `200` |
| `POST` | `/admin/business-rules/versions/{id}/submit` | `postAdminBusinessRulesVersionsByIdSubmit` | `permission` | `commercial_rules.edit` | `200` |
| `GET` | `/admin/business-rules` | `getAdminBusinessRules` | `permission` | `commercial_rules.read` | `200` |

## admin-commissions

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/commissions/analytics` | `getAdminCommissionsAnalytics` | `permission` | `commissions.analytics.read` | `200` |
| `POST` | `/admin/commissions/calculations/{id}/reversals` | `postAdminCommissionsCalculationsByIdReversals` | `permission` | `commissions.manage` | `200` |
| `GET` | `/admin/commissions/calculations/{id}` | `getAdminCommissionsCalculationsById` | `permission` | `commissions.read` | `200` |
| `POST` | `/admin/commissions/drafts` | `postAdminCommissionsDrafts` | `permission` | `commissions.manage` | `200` |
| `POST` | `/admin/commissions/simulate` | `postAdminCommissionsSimulate` | `permission` | `commissions.simulate` | `200` |
| `POST` | `/admin/commissions/versions/{id}/approve` | `postAdminCommissionsVersionsByIdApprove` | `permission` | `commissions.publish` | `200` |
| `POST` | `/admin/commissions/versions/{id}/publish` | `postAdminCommissionsVersionsByIdPublish` | `permission` | `commissions.publish` | `200` |
| `POST` | `/admin/commissions/versions/{id}/submit` | `postAdminCommissionsVersionsByIdSubmit` | `permission` | `commissions.manage` | `200` |

## admin-compliance

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/compliance/audit` | `getAdminComplianceAudit` | `permission` | `compliance.audit.read` | `200` |
| `POST` | `/admin/compliance/retention/run` | `postAdminComplianceRetentionRun` | `permission` | `compliance.retention.manage` | `200` |
| `POST` | `/admin/compliance/reviews/{caseId}/decision` | `postAdminComplianceReviewsByCaseIdDecision` | `permission` | `compliance.review` | `200` |
| `GET` | `/admin/compliance/reviews` | `getAdminComplianceReviews` | `permission` | `compliance.review` | `200` |
| `PUT` | `/admin/compliance/rules/{ruleId}` | `putAdminComplianceRulesByRuleId` | `permission` | `compliance.policy.manage` | `200` |
| `GET` | `/admin/compliance/rules` | `getAdminComplianceRules` | `permission` | `compliance.policy.read` | `200` |
| `POST` | `/admin/compliance/users/{userId}/requirements` | `postAdminComplianceUsersByUserIdRequirements` | `permission` | `compliance.review` | `200` |
| `GET` | `/admin/compliance/users/{userId}/status` | `getAdminComplianceUsersByUserIdStatus` | `permission` | `compliance.sensitive.read` | `200` |

## admin-countries

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/admin/countries/{code}/changes/{id}/approve` | `postAdminCountriesByCodeChangesByIdApprove` | `permission` | `market.configure` | `200` |
| `POST` | `/admin/countries/{code}/changes/{id}/reject` | `postAdminCountriesByCodeChangesByIdReject` | `permission` | `market.configure` | `200` |
| `GET` | `/admin/countries/{code}/changes` | `getAdminCountriesByCodeChanges` | `permission` | `market.manage` | `200` |
| `PATCH` | `/admin/countries/{code}` | `patchAdminCountriesByCode` | `permission` | `market.manage` | `200` |

## admin-discovery

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/admin/discovery/configuration/drafts` | `postAdminDiscoveryConfigurationDrafts` | `permission` | `commercial_rules.edit` | `200` |
| `POST` | `/admin/discovery/configuration/publish` | `postAdminDiscoveryConfigurationPublish` | `permission` | `commercial_rules.publish` | `200` |
| `GET` | `/admin/discovery/configuration` | `getAdminDiscoveryConfiguration` | `permission` | `commercial_rules.read` | `200` |
| `POST` | `/admin/discovery/explain` | `postAdminDiscoveryExplain` | `permission` | `commercial_rules.read` | `200` |
| `GET` | `/admin/discovery/metrics` | `getAdminDiscoveryMetrics` | `permission` | `commercial_rules.read` | `200` |

## admin-feature-flags

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `PUT` | `/admin/feature-flags/{key}/rules/{ruleId}` | `putAdminFeatureFlagRule` | `permission` | `admin.configuration.manage` | `200` |
| `PUT` | `/admin/feature-flags/{key}` | `putAdminFeatureFlag` | `permission` | `admin.configuration.manage` | `200` |
| `GET` | `/admin/feature-flags` | `getAdminFeatureFlags` | `permission` | `admin.configuration.manage` | `200` |

## admin-homepage

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/homepage/configuration` | `getAdminHomepageConfiguration` | `permission` | `admin.configuration.manage` | `200` |
| `PUT` | `/admin/homepage/configuration` | `putAdminHomepageConfiguration` | `permission` | `admin.configuration.manage` | `200` |
| `POST` | `/admin/homepage/preview` | `postAdminHomepagePreview` | `permission` | `admin.configuration.manage` | `200` |
| `POST` | `/admin/homepage/publish` | `postAdminHomepagePublish` | `permission` | `admin.configuration.manage` | `200` |

## admin-monetization

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/admin/monetization/complimentary-grants/requests/{id}/decision` | `postAdminMonetizationComplimentaryGrantsRequestsByIdDecision` | `permission` | `monetization.complimentary_grants.create` | `200` |
| `POST` | `/admin/monetization/complimentary-grants/requests` | `postAdminMonetizationComplimentaryGrantsRequests` | `permission` | `monetization.complimentary_grants.request` | `200` |

## admin-providers

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/admin/providers/{providerId}/test` | `postAdminProvidersByProviderIdTest` | `permission` | `provider.test` | `200` |
| `GET` | `/admin/providers/control-plane` | `getAdminProvidersControlPlane` | `permission` | `provider.read` | `200` |

## admin-reports

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/admin/reports/{reportId}/resolve` | `postAdminReportsByReportIdResolve` | `permission` | `report.review` | `200` |
| `GET` | `/admin/reports` | `getAdminReports` | `permission` | `report.review` | `200` |

## admin-stats

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/stats` | `getAdminStats` | `permission` | `admin.configuration.manage` | `200` |

## admin-taxonomy

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/taxonomy/header-navigation` | `getAdminTaxonomyHeaderNavigation` | `permission` | `taxonomy.manage` | `200` |
| `PUT` | `/admin/taxonomy/header-navigation` | `putAdminTaxonomyHeaderNavigation` | `permission` | `taxonomy.manage` | `200` |

## admin-trending

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/trending/config` | `getAdminTrendingConfig` | `permission` | `admin.configuration.manage` | `200` |
| `PUT` | `/admin/trending/config` | `putAdminTrendingConfig` | `permission` | `admin.configuration.manage` | `200` |
| `PUT` | `/admin/trending/overrides/{topicKey}` | `putAdminTrendingOverridesByTopicKey` | `permission` | `admin.configuration.manage` | `200` |

## admin-users

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/users/{userId}/capabilities` | `getAdminUserCapabilities` | `permission` | `admin.permissions.manage` | `200` |
| `PUT` | `/admin/users/{userId}/capability-overrides` | `updateAdminUserCapabilityOverrides` | `permission` | `admin.permissions.manage` | `200` |
| `PUT` | `/admin/users/{userId}/staff-status` | `updateAdminUserStaffStatus` | `permission` | `admin.staff.manage` | `200` |
| `PUT` | `/admin/users/{userId}/status` | `putAdminUsersByUserIdStatus` | `permission` | `user.read` | `200` |
| `PUT` | `/admin/users/{userId}/verification` | `putAdminUsersByUserIdVerification` | `permission` | `user.verify` | `200` |
| `GET` | `/admin/users` | `getAdminUsers` | `permission` | `user.read` | `200` |

## ai

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/ai/listing-assistance` | `postAiListingAssistance` | `permission` | `listing.create` | `200` |
| `POST` | `/ai/listing-safety` | `postAiListingSafety` | `permission` | `listing.create` | `200` |

## analytics

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/analytics/acquisition` | `getAnalyticsAcquisition` | `permission` | `analytics.marketing.read` | `200` |
| `POST` | `/analytics/events` | `postAnalyticsEvents` | `public` | — | `202` |
| `GET` | `/analytics/monetization` | `getAnalyticsMonetization` | `permission` | `analytics.finance.read` | `200` |
| `GET` | `/analytics/overview` | `getAnalyticsOverview` | `permission` | `analytics.platform.read` | `200` |
| `GET` | `/analytics/providers` | `getAnalyticsProviders` | `permission` | `analytics.technical.read` | `200` |
| `GET` | `/analytics/search` | `getAnalyticsSearch` | `permission` | `analytics.marketing.read` | `200` |
| `GET` | `/analytics/sellers/{sellerId}` | `getAnalyticsSeller` | `permission` | `store.analytics.read.own` | `200` |
| `GET` | `/analytics/seo` | `getAnalyticsSeo` | `permission` | `analytics.marketing.read` | `200` |

## auth

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/auth/domain-handoff/exchange` | `postAuthDomainHandoffExchange` | `public` | — | `200` |
| `POST` | `/auth/domain-handoff/start` | `postAuthDomainHandoffStart` | `permission` | `marketplace.customer.access` | `200` |
| `DELETE` | `/auth/identities/{provider}` | `deleteAuthIdentitiesByProvider` | `authenticated` | — | `200` |
| `POST` | `/auth/login` | `postAuthLogin` | `public` | — | `200` |
| `POST` | `/auth/logout-all` | `postAuthLogoutAll` | `authenticated` | — | `200` |
| `POST` | `/auth/logout` | `postAuthLogout` | `public` | — | `200` |
| `GET` | `/auth/me` | `getAuthMe` | `public` | — | `200` |
| `POST` | `/auth/mfa/challenge` | `postAuthMfaChallenge` | `public` | — | `200` |
| `POST` | `/auth/mfa/confirm` | `postAuthMfaConfirm` | `authenticated` | — | `200` |
| `POST` | `/auth/mfa/session-confirm` | `postAuthMfaSessionConfirm` | `authenticated` | — | `200` |
| `POST` | `/auth/mfa/setup` | `postAuthMfaSetup` | `authenticated` | — | `200` |
| `DELETE` | `/auth/mfa` | `deleteAuthMfa` | `authenticated` | — | `200` |
| `GET` | `/auth/mfa` | `getAuthMfa` | `authenticated` | — | `200` |
| `GET` | `/auth/oauth/{provider}/callback` | `getAuthOauthByProviderCallback` | `public` | — | `302` |
| `POST` | `/auth/oauth/{provider}/callback` | `postAuthOauthByProviderCallback` | `public` | — | `302` |
| `POST` | `/auth/oauth/{provider}/start` | `postAuthOauthByProviderStart` | `public` | — | `200` |
| `POST` | `/auth/oauth/complete-profile` | `postAuthOauthCompleteProfile` | `public` | — | `200` |
| `GET` | `/auth/oauth/facebook/data-deletion/status` | `getAuthOauthFacebookDataDeletionStatus` | `public` | — | `200` |
| `POST` | `/auth/oauth/facebook/data-deletion` | `postAuthOauthFacebookDataDeletion` | `public` | — | `200` |
| `POST` | `/auth/oauth/native-exchange` | `postAuthOauthNativeExchange` | `public` | — | `200` |
| `GET` | `/auth/oauth/providers` | `getAuthOauthProviders` | `public` | — | `200` |
| `POST` | `/auth/password/add` | `postAuthPasswordAdd` | `authenticated` | — | `200` |
| `POST` | `/auth/password/change` | `postAuthPasswordChange` | `authenticated` | — | `200` |
| `POST` | `/auth/password/forgot` | `postAuthPasswordForgot` | `public` | — | `200` |
| `POST` | `/auth/password/reset` | `postAuthPasswordReset` | `public` | — | `200` |
| `POST` | `/auth/reauthenticate` | `postAuthReauthenticate` | `authenticated` | — | `200` |
| `POST` | `/auth/refresh` | `postAuthRefresh` | `public` | — | `200` |
| `POST` | `/auth/register` | `postAuthRegister` | `public` | — | `200` |
| `GET` | `/auth/security` | `getAuthSecurity` | `authenticated` | — | `200` |
| `DELETE` | `/auth/sessions/{id}` | `deleteAuthSessionsById` | `authenticated` | — | `200` |
| `GET` | `/auth/sessions` | `getAuthSessions` | `authenticated` | — | `200` |
| `POST` | `/auth/switch-role` | `postAuthSwitchRole` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/auth/verify-email/resend` | `postAuthVerifyEmailResend` | `public` | — | `200` |
| `POST` | `/auth/verify-email` | `postAuthVerifyEmail` | `public` | — | `200` |
| `POST` | `/auth/verify-phone` | `postAuthVerifyPhone` | `permission` | `marketplace.customer.access` | `200` |

## auto

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `PATCH` | `/auto/admin/markets/{marketCode}/add-ons/{addOnId}` | `patchAutoAdminMarketsByMarketCodeAddOnsByAddOnId` | `permission` | `auto.admin.manage` | `200` |
| `PATCH` | `/auto/admin/markets/{marketCode}/plans/{planId}` | `patchAutoAdminMarketsByMarketCodePlansByPlanId` | `permission` | `auto.admin.manage` | `200` |
| `PATCH` | `/auto/admin/markets/{marketCode}/types/{type}` | `patchAutoAdminMarketsByMarketCodeTypesByType` | `permission` | `auto.admin.manage` | `200` |
| `PUT` | `/auto/admin/markets/{marketCode}` | `putAutoAdminMarketsByMarketCode` | `permission` | `auto.admin.manage` | `200` |
| `GET` | `/auto/admin/overview` | `getAutoAdminOverview` | `permission` | `auto.admin.manage` | `200` |
| `GET` | `/auto/catalog` | `getAutoCatalog` | `public` | — | `200` |
| `POST` | `/auto/dealers/{organizationId}/imports` | `postAutoDealersByOrganizationIdImports` | `permission` | `auto.inventory.import.own` | `200` |
| `PATCH` | `/auto/dealers/{organizationId}/leads/{leadId}` | `patchAutoDealersByOrganizationIdLeadsByLeadId` | `permission` | `auto.lead.manage.own` | `200` |
| `GET` | `/auto/dealers/{organizationId}/workspace` | `getAutoDealersByOrganizationIdWorkspace` | `permission` | `auto.dealer.manage.own` | `200` |
| `POST` | `/auto/drafts/{id}/duplicate-check` | `postAutoDraftsByIdDuplicateCheck` | `permission` | `auto.vehicle.manage.own` | `200` |
| `POST` | `/auto/drafts/{id}/submit` | `postAutoDraftsByIdSubmit` | `permission` | `auto.vehicle.manage.own` | `200` |
| `GET` | `/auto/drafts/{id}` | `getAutoDraftsById` | `permission` | `auto.vehicle.manage.own` | `200` |
| `PUT` | `/auto/drafts/{id}` | `putAutoDraftsById` | `permission` | `auto.vehicle.manage.own` | `200` |
| `POST` | `/auto/drafts` | `postAutoDrafts` | `permission` | `auto.vehicle.manage.own` | `200` |
| `GET` | `/auto/favorites` | `getAutoFavorites` | `permission` | `favorite.manage.own` | `200` |
| `POST` | `/auto/leads` | `postAutoLeads` | `public` | — | `200` |
| `POST` | `/auto/search` | `postAutoSearch` | `public` | — | `200` |
| `POST` | `/auto/vehicles/{id}/favorite` | `postAutoVehiclesByIdFavorite` | `permission` | `favorite.manage.own` | `200` |
| `GET` | `/auto/vehicles/{id}` | `getAutoVehiclesById` | `public` | — | `200` |
| `POST` | `/auto/vehicles` | `postAutoVehicles` | `permission` | `auto.vehicle.manage.own` | `200` |

## business-rules

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/business-rules/catalog` | `getBusinessRulesCatalog` | `public` | — | `200` |
| `POST` | `/business-rules/eligibility` | `postBusinessRulesEligibility` | `permission` | `marketplace.customer.access` | `200` |

## compliance

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/compliance/identity/session` | `postComplianceIdentitySession` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/compliance/manual-review` | `postComplianceManualReview` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/compliance/payment/onboarding` | `postCompliancePaymentOnboarding` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/compliance/requirements` | `postComplianceRequirements` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/compliance/status` | `getComplianceStatus` | `permission` | `marketplace.customer.access` | `200` |

## crm

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/crm/account-duplicates/check` | `checkCrmAccountDuplicates` | `permission` | `crm.accounts.read` | `200` |
| `GET` | `/crm/accounts/{accountId}/shongre` | `getCrmAccountShongreIntelligence` | `permission` | `crm.accounts.read` | `200` |
| `GET` | `/crm/accounts/{accountId}` | `getCrmAccount` | `permission` | `crm.accounts.read` | `200` |
| `PATCH` | `/crm/accounts/{accountId}` | `updateCrmAccount` | `permission` | `crm.accounts.update` | `200` |
| `GET` | `/crm/accounts` | `listCrmAccounts` | `permission` | `crm.accounts.read` | `200` |
| `POST` | `/crm/accounts` | `createCrmAccount` | `permission` | `crm.accounts.create` | `201` |
| `GET` | `/crm/activities` | `listCrmActivities` | `permission` | `crm.activities.read` | `200` |
| `POST` | `/crm/activities` | `createCrmActivity` | `permission` | `crm.activities.create` | `201` |
| `GET` | `/crm/contacts/{contactId}` | `getCrmContact` | `permission` | `crm.contacts.read` | `200` |
| `PATCH` | `/crm/contacts/{contactId}` | `updateCrmContact` | `permission` | `crm.contacts.update` | `200` |
| `GET` | `/crm/contacts` | `listCrmContacts` | `permission` | `crm.contacts.read` | `200` |
| `POST` | `/crm/contacts` | `createCrmContact` | `permission` | `crm.contacts.create` | `201` |
| `GET` | `/crm/custom-fields` | `listCrmCustomFields` | `permission` | `crm.custom_fields.read` | `200` |
| `POST` | `/crm/custom-fields` | `createCrmCustomField` | `permission` | `crm.custom_fields.manage` | `201` |
| `GET` | `/crm/dashboard` | `getCrmDashboard` | `permission` | `crm.dashboard.read` | `200` |
| `POST` | `/crm/opportunities/{opportunityId}/transition` | `transitionCrmOpportunity` | `permission` | `crm.opportunities.transition` | `200` |
| `GET` | `/crm/opportunities/{opportunityId}` | `getCrmOpportunity` | `permission` | `crm.opportunities.read` | `200` |
| `GET` | `/crm/opportunities` | `listCrmOpportunities` | `permission` | `crm.opportunities.read` | `200` |
| `POST` | `/crm/opportunities` | `createCrmOpportunity` | `permission` | `crm.opportunities.create` | `201` |
| `PATCH` | `/crm/pipelines/{pipelineId}` | `updateCrmPipeline` | `permission` | `crm.pipelines.manage` | `200` |
| `GET` | `/crm/pipelines` | `listCrmPipelines` | `permission` | `crm.pipelines.read` | `200` |
| `POST` | `/crm/pipelines` | `createCrmPipeline` | `permission` | `crm.pipelines.manage` | `200` |
| `PATCH` | `/crm/products/{productId}` | `updateCrmProduct` | `permission` | `crm.products.manage` | `200` |
| `GET` | `/crm/products` | `listCrmProducts` | `permission` | `crm.products.read` | `200` |
| `POST` | `/crm/products` | `createCrmProduct` | `permission` | `crm.products.manage` | `201` |
| `GET` | `/crm/prospecting/candidates/{candidateId}/brief` | `getProspectOpportunityBrief` | `permission` | `crm.prospecting.score` | `200` |
| `POST` | `/crm/prospecting/discover` | `discoverProspects` | `permission` | `crm.prospecting.discover` | `200` |
| `POST` | `/crm/prospecting/imports` | `importProspectCandidate` | `permission` | `crm.prospecting.import` | `201` |
| `GET` | `/crm/prospecting/profiles` | `listProspectingProfiles` | `permission` | `crm.prospecting.read` | `200` |
| `POST` | `/crm/prospecting/profiles` | `createProspectingProfile` | `permission` | `crm.prospecting.profiles.manage` | `201` |
| `GET` | `/crm/prospecting/sources` | `listProspectingSources` | `permission` | `crm.prospecting.read` | `200` |
| `GET` | `/crm/prospecting/usage` | `getProspectingUsage` | `permission` | `crm.prospecting.read` | `200` |
| `GET` | `/crm/quotes` | `listCrmQuotes` | `permission` | `crm.quotes.read` | `200` |
| `POST` | `/crm/quotes` | `createCrmQuote` | `permission` | `crm.quotes.create` | `201` |
| `DELETE` | `/crm/saved-views/{savedViewId}` | `deleteCrmSavedView` | `permission` | `crm.access` | `200` |
| `PUT` | `/crm/saved-views/{savedViewId}` | `updateCrmSavedView` | `permission` | `crm.access` | `200` |
| `GET` | `/crm/saved-views` | `listCrmSavedViews` | `permission` | `crm.access` | `200` |
| `POST` | `/crm/saved-views` | `createCrmSavedView` | `permission` | `crm.access` | `201` |
| `POST` | `/crm/tasks/{taskId}/complete` | `completeCrmTask` | `permission` | `crm.tasks.complete` | `200` |
| `GET` | `/crm/tasks` | `listCrmTasks` | `permission` | `crm.tasks.read` | `200` |
| `POST` | `/crm/tasks` | `createCrmTask` | `permission` | `crm.tasks.create` | `201` |
| `GET` | `/provider-connections` | `listProviderConnections` | `permission` | `provider.configuration.read` | `200` |

## education

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/education/admin/catalog` | `getEducationAdminCatalog` | `permission` | `course.admin.manage` | `200` |
| `PATCH` | `/education/admin/markets/{marketCode}/plans/{planId}` | `patchEducationAdminMarketsByMarketCodePlansByPlanId` | `permission` | `course.admin.manage` | `200` |
| `PATCH` | `/education/admin/markets/{marketCode}/subjects/{subjectId}` | `patchEducationAdminMarketsByMarketCodeSubjectsBySubjectId` | `permission` | `course.admin.manage` | `200` |
| `PUT` | `/education/admin/markets/{marketCode}` | `putEducationAdminMarketsByMarketCode` | `permission` | `course.admin.manage` | `200` |
| `POST` | `/education/bookings` | `postEducationBookings` | `permission` | `course.booking.create` | `200` |
| `GET` | `/education/catalog` | `getEducationCatalog` | `public` | — | `200` |
| `GET` | `/education/favorites` | `getEducationFavorites` | `permission` | `favorite.manage.own` | `200` |
| `PATCH` | `/education/leads/{leadId}` | `patchEducationLeadsByLeadId` | `permission` | `course.lead.respond.own` | `200` |
| `POST` | `/education/learner-requests` | `postEducationLearnerRequests` | `permission` | `course.request.create` | `200` |
| `POST` | `/education/offers` | `postEducationOffers` | `permission` | `course.offer.manage.own` | `200` |
| `POST` | `/education/onboarding/submit` | `postEducationOnboardingSubmit` | `permission` | `course.profile.manage.own` | `200` |
| `POST` | `/education/organizations/{organizationId}/locations` | `postEducationOrganizationsByOrganizationIdLocations` | `permission` | `course.organization.manage.own` | `200` |
| `POST` | `/education/organizations/{organizationId}/members` | `postEducationOrganizationsByOrganizationIdMembers` | `permission` | `course.organization.manage.own` | `200` |
| `GET` | `/education/organizations/{organizationId}/workspace` | `getEducationOrganizationsByOrganizationIdWorkspace` | `permission` | `course.organization.manage.own` | `200` |
| `POST` | `/education/search` | `postEducationSearch` | `public` | — | `200` |
| `POST` | `/education/tutors/{id}/favorite` | `postEducationTutorsByIdFavorite` | `permission` | `favorite.manage.own` | `200` |
| `GET` | `/education/tutors/{id}` | `getEducationTutorsById` | `public` | — | `200` |
| `PUT` | `/education/tutors/{id}` | `putEducationTutorsById` | `permission` | `course.profile.manage.own` | `200` |
| `DELETE` | `/education/workflow-drafts/learner-request` | `deleteEducationWorkflowdraftsLearnerrequest` | `permission` | `course.request.create` | `200` |
| `GET` | `/education/workflow-drafts/learner-request` | `getEducationWorkflowdraftsLearnerrequest` | `permission` | `course.request.create` | `200` |
| `PUT` | `/education/workflow-drafts/learner-request` | `putEducationWorkflowdraftsLearnerrequest` | `permission` | `course.request.create` | `200` |
| `DELETE` | `/education/workflow-drafts/tutor-onboarding` | `deleteEducationWorkflowdraftsTutoronboarding` | `permission` | `course.profile.manage.own` | `200` |
| `GET` | `/education/workflow-drafts/tutor-onboarding` | `getEducationWorkflowdraftsTutoronboarding` | `permission` | `course.profile.manage.own` | `200` |
| `PUT` | `/education/workflow-drafts/tutor-onboarding` | `putEducationWorkflowdraftsTutoronboarding` | `permission` | `course.profile.manage.own` | `200` |
| `GET` | `/education/workspace/{tutorProfileId}` | `getEducationWorkspaceByTutorProfileId` | `permission` | `course.lead.read.own` | `200` |

## employment

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `PUT` | `/employment/admin/markets/{marketCode}` | `putEmploymentAdminMarketsByMarketCode` | `permission` | `employment.admin.manage` | `200` |
| `PATCH` | `/employment/admin/offers/{offerId}` | `patchEmploymentAdminOffersByOfferId` | `permission` | `employment.admin.manage` | `200` |
| `GET` | `/employment/admin/overview` | `getEmploymentAdminOverview` | `permission` | `employment.admin.manage` | `200` |
| `POST` | `/employment/applications/{id}/withdraw` | `postEmploymentApplicationsByIdWithdraw` | `permission` | `employment.candidate.manage.own` | `200` |
| `DELETE` | `/employment/candidate/alerts/{id}` | `deleteEmploymentCandidateAlertsById` | `permission` | `employment.candidate.manage.own` | `200` |
| `POST` | `/employment/candidate/alerts` | `postEmploymentCandidateAlerts` | `permission` | `employment.candidate.manage.own` | `200` |
| `POST` | `/employment/candidate/data-export` | `postEmploymentCandidateDataExport` | `permission` | `employment.candidate.manage.own` | `200` |
| `POST` | `/employment/candidate/deletion-request` | `postEmploymentCandidateDeletionRequest` | `permission` | `employment.candidate.manage.own` | `200` |
| `PATCH` | `/employment/candidate/interviews/{id}` | `patchEmploymentCandidateInterviewsById` | `permission` | `employment.candidate.manage.own` | `200` |
| `PUT` | `/employment/candidate/profile` | `putEmploymentCandidateProfile` | `permission` | `employment.candidate.manage.own` | `200` |
| `GET` | `/employment/candidate/workspace` | `getEmploymentCandidateWorkspace` | `permission` | `employment.candidate.manage.own` | `200` |
| `GET` | `/employment/catalog` | `getEmploymentCatalog` | `public` | — | `200` |
| `POST` | `/employment/checkouts` | `postEmploymentCheckouts` | `permission` | `payment.initiate` | `200` |
| `POST` | `/employment/compliance/prohibited-language` | `postEmploymentComplianceProhibitedLanguage` | `permission` | `employment.job.manage.own` | `200` |
| `POST` | `/employment/drafts/{id}/duplicate-check` | `postEmploymentDraftsByIdDuplicateCheck` | `permission` | `employment.job.manage.own` | `200` |
| `PUT` | `/employment/drafts/{id}/publication` | `putEmploymentDraftsByIdPublication` | `permission` | `employment.job.manage.own` | `200` |
| `POST` | `/employment/drafts/{id}/submit` | `postEmploymentDraftsByIdSubmit` | `permission` | `employment.job.manage.own` | `200` |
| `GET` | `/employment/drafts/{id}` | `getEmploymentDraftsById` | `permission` | `employment.job.manage.own` | `200` |
| `PUT` | `/employment/drafts/{id}` | `putEmploymentDraftsById` | `permission` | `employment.job.manage.own` | `200` |
| `POST` | `/employment/drafts` | `postEmploymentDrafts` | `permission` | `employment.job.manage.own` | `200` |
| `POST` | `/employment/employers/{employerId}/applications/{applicationId}/interviews` | `postEmploymentEmployersByEmployerIdApplicationsByApplicationIdInterviews` | `permission` | `employment.application.manage.own` | `200` |
| `POST` | `/employment/employers/{employerId}/applications/{applicationId}/notes` | `postEmploymentEmployersByEmployerIdApplicationsByApplicationIdNotes` | `permission` | `employment.application.manage.own` | `200` |
| `PATCH` | `/employment/employers/{employerId}/applications/{applicationId}/stage` | `patchEmploymentEmployersByEmployerIdApplicationsByApplicationIdStage` | `permission` | `employment.application.manage.own` | `200` |
| `POST` | `/employment/employers/{employerId}/imports/preview` | `postEmploymentEmployersByEmployerIdImportsPreview` | `permission` | `employment.import.own` | `200` |
| `POST` | `/employment/employers/{employerId}/imports` | `postEmploymentEmployersByEmployerIdImports` | `permission` | `employment.import.own` | `200` |
| `POST` | `/employment/employers/{employerId}/jobs/{jobId}/duplicate` | `postEmploymentEmployersByEmployerIdJobsByJobIdDuplicate` | `permission` | `employment.recruiter.manage.own` | `200` |
| `GET` | `/employment/employers/{employerId}/workspace` | `getEmploymentEmployersByEmployerIdWorkspace` | `permission` | `employment.recruiter.manage.own` | `200` |
| `POST` | `/employment/jobs/{id}/applications` | `postEmploymentJobsByIdApplications` | `permission` | `employment.candidate.manage.own` | `200` |
| `POST` | `/employment/jobs/{id}/report` | `postEmploymentJobsByIdReport` | `permission` | `employment.candidate.manage.own` | `200` |
| `POST` | `/employment/jobs/{id}/save` | `postEmploymentJobsByIdSave` | `permission` | `employment.candidate.manage.own` | `200` |
| `GET` | `/employment/jobs/{id}/similar` | `getEmploymentJobsByIdSimilar` | `public` | — | `200` |
| `GET` | `/employment/jobs/{id}` | `getEmploymentJobsById` | `public` | — | `200` |
| `GET` | `/employment/recruiter/employers` | `getEmploymentRecruiterEmployers` | `permission` | `employment.recruiter.manage.own` | `200` |
| `POST` | `/employment/search` | `postEmploymentSearch` | `public` | — | `200` |

## favorites

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/favorites` | `getFavorites` | `permission` | `favorite.manage.own` | `200` |

## feature-flags

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/feature-flags/{key}` | `getFeatureFlagEvaluation` | `public` | — | `200` |

## finance

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/finance/account/overview` | `getFinanceAccountOverview` | `permission` | `finance.account.read.own` | `200` |
| `GET` | `/finance/organization/overview` | `getFinanceOrganizationOverview` | `permission` | `finance.organization.read.own` | `200` |
| `GET` | `/finance/platform/exports/transactions` | `getFinancePlatformExportsTransactions` | `permission` | `finance.exports.read` | `200` |
| `GET` | `/finance/platform/overview` | `getFinancePlatformOverview` | `permission` | `finance.platform.read` | `200` |
| `GET` | `/finance/platform/reconciliation` | `getFinancePlatformReconciliation` | `permission` | `finance.reconciliation.manage` | `200` |
| `GET` | `/finance/platform/transactions/{id}` | `getFinancePlatformTransactionsById` | `permission` | `finance.transactions.read` | `200` |
| `GET` | `/finance/platform/transactions` | `getFinancePlatformTransactions` | `permission` | `finance.transactions.read` | `200` |

## home

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/home/trending` | `getHomeTrending` | `public` | — | `200` |
| `GET` | `/home` | `getHome` | `public` | — | `200` |

## invoicing

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/invoicing/activation` | `activateInvoicingForCurrentOrganization` | `permission` | `subscription.manage.own` | `200` |
| `GET` | `/invoicing/invoices/{invoiceId}/document` | `getInvoicingDocument` | `permission` | `invoice.read` | `200` |
| `POST` | `/invoicing/invoices/{invoiceId}/finalize` | `finalizeInvoicingInvoice` | `permission` | `invoice.finalize` | `200` |
| `GET` | `/invoicing/invoices/{invoiceId}` | `getInvoicingInvoice` | `permission` | `invoice.read` | `200` |
| `PUT` | `/invoicing/invoices/{invoiceId}` | `updateInvoicingInvoiceDraft` | `permission` | `invoice.create` | `200` |
| `GET` | `/invoicing/invoices` | `listInvoicingInvoices` | `permission` | `invoice.read` | `200` |
| `POST` | `/invoicing/invoices` | `createInvoicingInvoice` | `permission` | `invoice.create` | `201` |
| `POST` | `/invoicing/legal-entities/from-organization` | `bootstrapInvoicingLegalEntityFromOrganization` | `permission` | `invoicing.tenant.manage` | `200` |
| `GET` | `/invoicing/legal-entities` | `listInvoicingLegalEntities` | `permission` | `invoice.read` | `200` |
| `POST` | `/invoicing/legal-entities` | `createInvoicingLegalEntity` | `permission` | `invoicing.tenant.manage` | `201` |
| `GET` | `/invoicing/parties` | `listInvoicingParties` | `permission` | `invoice.read` | `200` |
| `POST` | `/invoicing/parties` | `createInvoicingParty` | `permission` | `invoice.party.manage` | `201` |
| `GET` | `/invoicing/workspace` | `getInvoicingWorkspace` | `permission` | `invoice.read` | `200` |

## listing-drafts

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/listing-drafts/current` | `getListingDraftsCurrent` | `permission` | `listing.create` | `200` |
| `PUT` | `/listing-drafts/current` | `putListingDraftsCurrent` | `permission` | `listing.create` | `200` |
| `POST` | `/listing-drafts` | `postListingDrafts` | `permission` | `listing.create` | `200` |

## listings

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/listings/{id}/favorite` | `postListingsByIdFavorite` | `permission` | `favorite.manage.own` | `200` |
| `DELETE` | `/listings/{id}` | `deleteListingsById` | `permission` | `listing.delete.own` | `200` |
| `GET` | `/listings/{id}` | `getListingsById` | `public` | — | `200` |
| `PUT` | `/listings/{id}` | `putListingsById` | `permission` | `listing.update.own` | `200` |
| `POST` | `/listings/bulk-import/parse` | `postListingsBulkimportParse` | `permission` | `listing.create` | `200` |
| `POST` | `/listings/bulk-import/publish` | `postListingsBulkimportPublish` | `permission` | `listing.publish` | `200` |
| `GET` | `/listings/bulk-import/template` | `getListingsBulkimportTemplate` | `permission` | `listing.create` | `200` |
| `POST` | `/listings/publish` | `postListingsPublish` | `permission` | `listing.publish` | `200` |
| `POST` | `/listings/search` | `postListingsSearch` | `public` | — | `200` |
| `GET` | `/listings` | `getListings` | `public` | — | `200` |

## marketing

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `PUT` | `/marketing/account/preferences` | `updateAccountMarketingPreferences` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/marketing/account/subscription` | `getAccountMarketingSubscription` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/marketing/account/subscription` | `subscribeAccountToMarketing` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/marketing/account/unsubscribe` | `unsubscribeAccountFromMarketing` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/marketing/ai/assist` | `assistMarketingWithAi` | `permission` | `marketing.campaigns.create` | `200` |
| `POST` | `/marketing/ai/campaign-draft` | `generateMarketingCampaignDraft` | `permission` | `marketing.campaigns.create` | `200` |
| `GET` | `/marketing/analytics` | `getMarketingAnalytics` | `permission` | `marketing.analytics.read` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/approve` | `approveMarketingCampaign` | `permission` | `marketing.campaigns.approve` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/cancel` | `cancelMarketingCampaign` | `permission` | `marketing.campaigns.cancel` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/pause` | `pauseMarketingCampaign` | `permission` | `marketing.campaigns.pause` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/preflight` | `preflightMarketingCampaign` | `permission` | `marketing.campaigns.read` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/resume` | `resumeMarketingCampaign` | `permission` | `marketing.campaigns.pause` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/review` | `reviewMarketingCampaign` | `permission` | `marketing.campaigns.update` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/schedule` | `scheduleMarketingCampaign` | `permission` | `marketing.campaigns.send` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/select-winner` | `selectMarketingCampaignWinner` | `permission` | `marketing.campaigns.update` | `200` |
| `POST` | `/marketing/campaigns/{campaignId}/send` | `sendMarketingCampaign` | `permission` | `marketing.campaigns.send` | `202` |
| `POST` | `/marketing/campaigns/{campaignId}/test-send` | `testSendMarketingCampaign` | `permission` | `marketing.campaigns.send` | `200` |
| `GET` | `/marketing/campaigns/{campaignId}` | `getMarketingCampaign` | `permission` | `marketing.campaigns.read` | `200` |
| `POST` | `/marketing/campaigns/audience-estimate` | `estimateMarketingAudience` | `permission` | `marketing.campaigns.read` | `200` |
| `GET` | `/marketing/campaigns` | `listMarketingCampaigns` | `permission` | `marketing.campaigns.read` | `200` |
| `POST` | `/marketing/campaigns` | `createMarketingCampaign` | `permission` | `marketing.campaigns.create` | `201` |
| `POST` | `/marketing/conversions` | `recordMarketingConversion` | `permission` | `marketing.campaigns.update` | `202` |
| `GET` | `/marketing/dashboard` | `getMarketingDashboard` | `permission` | `marketing.dashboard.read` | `200` |
| `GET` | `/marketing/journey-executions` | `listMarketingJourneyExecutions` | `permission` | `marketing.automation.read` | `200` |
| `POST` | `/marketing/journeys/{journeyId}/activate` | `activateMarketingJourney` | `permission` | `marketing.automation.manage` | `200` |
| `POST` | `/marketing/journeys/{journeyId}/pause` | `pauseMarketingJourney` | `permission` | `marketing.automation.manage` | `200` |
| `POST` | `/marketing/journeys/events` | `emitMarketingJourneyEvent` | `permission` | `marketing.automation.manage` | `202` |
| `GET` | `/marketing/journeys` | `listMarketingJourneys` | `permission` | `marketing.automation.read` | `200` |
| `POST` | `/marketing/journeys` | `createMarketingJourney` | `permission` | `marketing.automation.manage` | `201` |
| `POST` | `/marketing/lists/{listId}/members/{profileId}` | `addMarketingListMember` | `permission` | `marketing.lists.manage` | `200` |
| `GET` | `/marketing/lists` | `listMarketingLists` | `permission` | `marketing.lists.read` | `200` |
| `POST` | `/marketing/lists` | `createMarketingList` | `permission` | `marketing.lists.manage` | `201` |
| `POST` | `/marketing/profiles/{profileId}/confirm` | `confirmMarketingProfile` | `permission` | `marketing.profiles.manage` | `200` |
| `POST` | `/marketing/profiles/{profileId}/unsubscribe` | `unsubscribeMarketingProfile` | `permission` | `marketing.profiles.manage` | `200` |
| `GET` | `/marketing/profiles` | `listMarketingProfiles` | `permission` | `marketing.profiles.read` | `200` |
| `POST` | `/marketing/profiles` | `createMarketingProfile` | `permission` | `marketing.profiles.manage` | `201` |
| `POST` | `/marketing/provider-webhooks/{connectionId}` | `receiveMarketingProviderWebhook` | `public` | — | `200` |
| `POST` | `/marketing/public/confirm` | `confirmPublicMarketingSubscription` | `public` | — | `200` |
| `GET` | `/marketing/public/preferences` | `getPublicMarketingPreferences` | `public` | — | `200` |
| `PUT` | `/marketing/public/preferences` | `updatePublicMarketingPreferences` | `public` | — | `200` |
| `POST` | `/marketing/public/subscriptions` | `createPublicMarketingSubscription` | `public` | — | `202` |
| `POST` | `/marketing/public/unsubscribe` | `unsubscribePublicMarketingProfile` | `public` | — | `200` |
| `GET` | `/marketing/segments` | `listMarketingSegments` | `permission` | `marketing.segments.read` | `200` |
| `POST` | `/marketing/segments` | `createMarketingSegment` | `permission` | `marketing.segments.manage` | `201` |
| `GET` | `/marketing/suppressions` | `listMarketingSuppressions` | `permission` | `marketing.compliance.read` | `200` |
| `GET` | `/marketing/templates` | `listMarketingTemplates` | `permission` | `marketing.templates.read` | `200` |
| `POST` | `/marketing/templates` | `createMarketingTemplate` | `permission` | `marketing.templates.manage` | `201` |
| `GET` | `/marketing/track/click` | `recordMarketingClick` | `public` | — | `302` |
| `GET` | `/marketing/track/open` | `recordMarketingOpen` | `public` | — | `200` |
| `GET` | `/marketing/usage` | `getMarketingUsage` | `permission` | `marketing.dashboard.read` | `200` |
| `GET` | `/marketing/webhooks` | `listMarketingWebhooks` | `permission` | `marketing.settings.manage` | `200` |
| `POST` | `/marketing/webhooks` | `createMarketingWebhook` | `permission` | `marketing.settings.manage` | `201` |

## markets

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/markets/{code}` | `getMarketsByCode` | `public` | — | `200` |
| `GET` | `/markets/active` | `getMarketsActive` | `public` | — | `200` |
| `POST` | `/markets/active` | `postMarketsActive` | `permission` | `market.manage` | `200` |
| `POST` | `/markets/detection/coordinates` | `detectMarketFromCoordinates` | `public` | — | `200` |
| `GET` | `/markets/detection` | `detectProbableMarket` | `public` | — | `200` |
| `GET` | `/markets/effective/{code}` | `getMarketsEffectiveByCode` | `public` | — | `200` |
| `GET` | `/markets` | `getMarkets` | `public` | — | `200` |

## media

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/media/listings/uploads/{id}/complete` | `postMediaListingsUploadsByIdComplete` | `permission` | `listing.create` | `200` |
| `POST` | `/media/listings/uploads` | `postMediaListingsUploads` | `permission` | `listing.create` | `200` |
| `POST` | `/media/private-documents/uploads/{id}/complete` | `postMediaPrivateDocumentsUploadsByIdComplete` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/media/private-documents/uploads` | `postMediaPrivateDocumentsUploads` | `permission` | `marketplace.customer.access` | `200` |

## messaging

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/messaging/blocked` | `getMessagingBlocked` | `permission` | `message.block` | `200` |
| `POST` | `/messaging/block` | `postMessagingBlock` | `permission` | `message.block` | `200` |
| `GET` | `/messaging/conversations/{id}/messages` | `getMessagingConversationsByIdMessages` | `permission` | `message.read.own` | `200` |
| `POST` | `/messaging/conversations/{id}/messages` | `postMessagingConversationsByIdMessages` | `permission` | `message.send` | `200` |
| `GET` | `/messaging/conversations/{id}` | `getMessagingConversationsById` | `permission` | `message.read.own` | `200` |
| `GET` | `/messaging/conversations` | `getMessagingConversations` | `permission` | `message.read.own` | `200` |
| `POST` | `/messaging/conversations` | `postMessagingConversations` | `permission` | `message.send` | `200` |
| `POST` | `/messaging/offer-response` | `postMessagingOfferResponse` | `permission` | `message.send` | `200` |
| `POST` | `/messaging/offer` | `postMessagingOffer` | `permission` | `message.send` | `200` |
| `POST` | `/messaging/offers/{id}/counter` | `postMessagingOffersIdCounter` | `permission` | `message.send` | `200` |
| `POST` | `/messaging/offers/{id}/withdraw` | `postMessagingOffersIdWithdraw` | `permission` | `message.send` | `200` |
| `POST` | `/messaging/read` | `postMessagingRead` | `permission` | `message.read.own` | `200` |
| `POST` | `/messaging/schedule-pickup` | `postMessagingSchedulePickup` | `permission` | `message.send` | `200` |
| `POST` | `/messaging/unblock` | `postMessagingUnblock` | `permission` | `message.block` | `200` |

## moderation

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/admin/moderation/appeals/{appealId}/decision` | `postAdminModerationAppealDecision` | `permission` | `moderation.action` | `200` |
| `GET` | `/admin/moderation/appeals` | `getAdminModerationAppeals` | `permission` | `moderation.review` | `200` |
| `GET` | `/admin/moderation/cases` | `getAdminModerationCases` | `permission` | `moderation.review` | `200` |
| `GET` | `/moderation/appeals/mine` | `getOwnModerationAppeals` | `permission` | `report.create` | `200` |
| `POST` | `/moderation/cases/{caseId}/appeals` | `postModerationCaseAppeal` | `permission` | `report.create` | `200` |
| `GET` | `/moderation/cases/mine` | `getOwnModerationCases` | `permission` | `report.create` | `200` |

## monetization

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/monetization/billing` | `getMonetizationBilling` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/monetization/checkouts` | `postMonetizationCheckouts` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/monetization/entitlements` | `getMonetizationEntitlements` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/monetization/invoices/{id}/document` | `getMonetizationInvoicesByIdDocument` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/monetization/professional-plans` | `getMonetizationProfessionalPlans` | `public` | — | `200` |
| `POST` | `/monetization/promotions/validate` | `postMonetizationPromotionsValidate` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/monetization/quotes` | `postMonetizationQuotes` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/monetization/subscriptions/{id}/change-preview` | `postMonetizationSubscriptionsByIdChangePreview` | `permission` | `subscription.manage.own` | `200` |
| `POST` | `/monetization/subscriptions/{id}/change` | `postMonetizationSubscriptionsByIdChange` | `permission` | `subscription.manage.own` | `200` |
| `PATCH` | `/monetization/subscriptions/{id}` | `patchMonetizationSubscriptionsById` | `permission` | `subscription.manage.own` | `200` |
| `GET` | `/monetization/subscriptions` | `getMonetizationSubscriptions` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/monetization/trials` | `postMonetizationTrials` | `permission` | `subscription.manage.own` | `200` |

## notifications

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/notifications/{id}/read` | `postNotificationsByIdRead` | `permission` | `marketplace.customer.access` | `200` |
| `DELETE` | `/notifications/{id}` | `deleteNotificationsById` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/notifications/devices/unregister` | `postNotificationsDevicesUnregister` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/notifications/devices` | `postNotificationsDevices` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/notifications/preferences` | `getNotificationPreferences` | `permission` | `marketplace.customer.access` | `200` |
| `PUT` | `/notifications/preferences` | `putNotificationPreferences` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/notifications/read-all` | `postNotificationsReadAll` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/notifications/unread-count` | `getNotificationsUnreadCount` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/notifications` | `getNotifications` | `permission` | `marketplace.customer.access` | `200` |

## operations

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/health` | `getApiHealth` | `public` | — | `200` |
| `GET` | `/api/ready` | `getApiReadiness` | `public` | — | `200` |
| `GET` | `/health` | `getHealth` | `public` | — | `200` |
| `GET` | `/livez` | `getLiveness` | `public` | — | `200` |
| `GET` | `/readyz` | `getReadiness` | `public` | — | `200` |

## orders

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/orders/{id}/cancel` | `postOrdersByIdCancel` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/orders/{id}/confirm-delivery` | `postOrdersByIdConfirmDelivery` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/orders/{id}/confirm-pin` | `postOrdersByIdConfirmPin` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/orders/{id}/dispute` | `postOrdersByIdDispute` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/orders/{id}/handover-code` | `postOrdersByIdHandoverCode` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/orders/{id}/refund` | `postOrdersByIdRefund` | `permission` | `order.refund` | `200` |
| `POST` | `/orders/{id}/ship` | `postOrdersByIdShip` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/orders/{id}` | `getOrdersById` | `permission` | `order.read.own` | `200` |
| `POST` | `/orders/direct-purchase/quote` | `postOrdersDirectPurchaseQuote` | `permission` | `order.create` | `200` |
| `POST` | `/orders/direct-purchase` | `postOrdersDirectPurchase` | `permission` | `order.create` | `200` |
| `GET` | `/orders/purchases` | `getOrdersPurchases` | `permission` | `order.read.own` | `200` |
| `POST` | `/orders/reservation` | `postOrdersReservation` | `permission` | `order.create` | `200` |
| `GET` | `/orders/sales` | `getOrdersSales` | `permission` | `order.manage.seller` | `200` |

## payments

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/payments/balance/{sellerId}` | `getPaymentsBalanceBySellerId` | `permission` | `order.manage.seller` | `200` |
| `POST` | `/payments/intent` | `postPaymentsIntent` | `permission` | `payment.initiate` | `200` |
| `POST` | `/payments/payout` | `postPaymentsPayout` | `permission` | `order.manage.seller` | `200` |

## providers

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `PUT` | `/provider-connections/{connectionId}/credential` | `rotateProviderConnectionCredential` | `permission` | `provider.credentials.manage` | `200` |
| `POST` | `/provider-connections` | `createProviderConnection` | `permission` | `provider.configuration.manage` | `200` |

## publication

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/publication/entitlements` | `postPublicationEntitlements` | `permission` | `listing.create` | `200` |

## real-estate

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `PATCH` | `/real-estate/admin/markets/{marketCode}/add-ons/{addOnId}` | `patchRealEstateAdminMarketsByMarketCodeAddOnsByAddOnId` | `permission` | `immo.admin.manage` | `200` |
| `PATCH` | `/real-estate/admin/markets/{marketCode}/field-rules/{ruleId}` | `patchRealEstateAdminMarketsByMarketCodeFieldRulesByRuleId` | `permission` | `immo.admin.manage` | `200` |
| `PATCH` | `/real-estate/admin/markets/{marketCode}/offers/{offerId}` | `patchRealEstateAdminMarketsByMarketCodeOffersByOfferId` | `permission` | `immo.admin.manage` | `200` |
| `PATCH` | `/real-estate/admin/markets/{marketCode}/types/{type}` | `patchRealEstateAdminMarketsByMarketCodeTypesByType` | `permission` | `immo.admin.manage` | `200` |
| `PUT` | `/real-estate/admin/markets/{marketCode}` | `putRealEstateAdminMarketsByMarketCode` | `permission` | `immo.admin.manage` | `200` |
| `GET` | `/real-estate/admin/overview` | `getRealEstateAdminOverview` | `permission` | `immo.admin.manage` | `200` |
| `POST` | `/real-estate/agencies/{organizationId}/imports` | `postRealEstateAgenciesByOrganizationIdImports` | `permission` | `immo.inventory.import.own` | `200` |
| `POST` | `/real-estate/agencies/{organizationId}/leads/{leadId}/notes` | `postRealEstateAgenciesByOrganizationIdLeadsByLeadIdNotes` | `permission` | `immo.lead.manage.own` | `200` |
| `PATCH` | `/real-estate/agencies/{organizationId}/leads/{leadId}` | `patchRealEstateAgenciesByOrganizationIdLeadsByLeadId` | `permission` | `immo.lead.manage.own` | `200` |
| `GET` | `/real-estate/agencies/{organizationId}/leads/export` | `getRealEstateAgenciesByOrganizationIdLeadsExport` | `permission` | `immo.lead.manage.own` | `200` |
| `GET` | `/real-estate/agencies/{organizationId}/workspace` | `getRealEstateAgenciesByOrganizationIdWorkspace` | `permission` | `immo.agency.manage.own` | `200` |
| `GET` | `/real-estate/catalog` | `getRealEstateCatalog` | `public` | — | `200` |
| `POST` | `/real-estate/checkouts/{checkoutId}/refunds` | `postRealEstateCheckoutsByCheckoutIdRefunds` | `permission` | `payment.refund` | `200` |
| `POST` | `/real-estate/checkouts` | `postRealEstateCheckouts` | `permission` | `payment.initiate` | `200` |
| `POST` | `/real-estate/drafts/{id}/submit` | `postRealEstateDraftsByIdSubmit` | `permission` | `immo.property.manage.own` | `200` |
| `GET` | `/real-estate/drafts/{id}` | `getRealEstateDraftsById` | `permission` | `immo.property.manage.own` | `200` |
| `PUT` | `/real-estate/drafts/{id}` | `putRealEstateDraftsById` | `permission` | `immo.property.manage.own` | `200` |
| `POST` | `/real-estate/drafts` | `postRealestateDrafts` | `permission` | `immo.property.manage.own` | `200` |
| `POST` | `/real-estate/leads/{leadId}/appointments` | `postRealEstateLeadsByLeadIdAppointments` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/real-estate/leads` | `postRealEstateLeads` | `public` | — | `200` |
| `GET` | `/real-estate/properties/{id}/comparables` | `getRealEstatePropertiesByIdComparables` | `public` | — | `200` |
| `GET` | `/real-estate/properties/{id}/documents/{documentId}/access` | `getRealEstatePropertiesByIdDocumentsByDocumentIdAccess` | `permission` | `immo.property.manage.own` | `200` |
| `GET` | `/real-estate/properties/{id}` | `getRealEstatePropertiesById` | `public` | — | `200` |
| `GET` | `/real-estate/recently-viewed` | `getRealEstateRecentlyViewed` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/real-estate/recently-viewed` | `postRealEstateRecentlyViewed` | `permission` | `marketplace.customer.access` | `200` |
| `POST` | `/real-estate/search` | `postRealEstateSearch` | `public` | — | `200` |

## reports

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/reports` | `postReports` | `permission` | `report.create` | `200` |

## reviews

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/reviews/submit` | `postReviewsSubmit` | `permission` | `review.create` | `200` |
| `GET` | `/reviews/user/{userId}` | `getReviewsUserByUserId` | `public` | — | `200` |

## support

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/support/cases/{id}/notes` | `postSupportCasesByIdNotes` | `authenticated` | — | `200` |
| `GET` | `/support/cases/{id}` | `getSupportCasesById` | `authenticated` | — | `200` |
| `PATCH` | `/support/cases/{id}` | `patchSupportCasesById` | `permission` | `support.case.manage` | `200` |
| `GET` | `/support/cases/mine` | `getSupportCasesMine` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/support/cases` | `getSupportCases` | `permission` | `support.case.read` | `200` |
| `POST` | `/support/cases` | `postSupportCases` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/support/metrics` | `getSupportMetrics` | `permission` | `support.case.read` | `200` |

## taxonomy

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/taxonomy/header-navigation` | `getTaxonomyHeaderNavigation` | `public` | — | `200` |
| `GET` | `/taxonomy/nodes/{id}/attributes` | `getTaxonomyNodesByIdAttributes` | `public` | — | `200` |
| `GET` | `/taxonomy/nodes/{id}/children` | `getTaxonomyNodesByIdChildren` | `public` | — | `200` |
| `GET` | `/taxonomy/nodes/{id}` | `getTaxonomyNodesById` | `public` | — | `200` |
| `GET` | `/taxonomy/root` | `getTaxonomyRoot` | `public` | — | `200` |
| `GET` | `/taxonomy/search-filters` | `getTaxonomySearchFilters` | `public` | — | `200` |
| `GET` | `/taxonomy/slug/{slug}` | `getTaxonomySlugBySlug` | `public` | — | `200` |
| `GET` | `/taxonomy/v4/options/{optionSetId}` | `getTaxonomyV4Options` | `public` | — | `200` |
| `GET` | `/taxonomy/v4/resolve` | `resolveTaxonomyV4PublicationSchema` | `public` | — | `200` |
| `GET` | `/taxonomy/v4/tree` | `getTaxonomyV4Tree` | `public` | — | `200` |

## users

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/users/{id}` | `getUsersById` | `public` | — | `200` |
| `PUT` | `/users/{id}` | `putUsersById` | `permission` | `profile.update.own` | `200` |

## verification

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/verification/business-registration` | `postVerificationBusinessRegistration` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/verification/siret-lookup/{siret}` | `getVerificationSiretLookupBySiret` | `permission` | `marketplace.customer.access` | `200` |
| `GET` | `/verification/status/{userId}` | `getVerificationStatusByUserId` | `permission` | `marketplace.customer.access` | `200` |

## webhooks

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/webhooks/compliance/{provider}` | `postWebhooksComplianceByProvider` | `public` | — | `200` |
| `POST` | `/webhooks/stripe-connect-v2` | `postWebhooksStripeConnectV2` | `public` | — | `200` |
| `POST` | `/webhooks/stripe` | `postWebhooksStripe` | `public` | — | `200` |

## workspace

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/workspace/pro-analytics/{sellerId}` | `getWorkspaceProAnalyticsBySellerId` | `permission` | `store.manage.own` | `200` |
| `GET` | `/workspace/summary/{userId}` | `getWorkspaceSummaryByUserId` | `permission` | `marketplace.customer.access` | `200` |

