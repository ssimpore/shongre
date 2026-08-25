# Canonical endpoint inventory

> Generated from `backend/openapi/openapi.json`. Do not edit by hand.

- Contract version: `1.0.0`
- API base path: `http://127.0.0.1:4000/api/v1`
- Operations: **312**
- Specification SHA-256: `6f83b87fc987eafd`

## account

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/account/delete` | `postAccountDelete` | `authenticated` | — | `200` |

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

## admin-trending

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/admin/trending/config` | `getAdminTrendingConfig` | `permission` | `admin.configuration.manage` | `200` |
| `PUT` | `/admin/trending/config` | `putAdminTrendingConfig` | `permission` | `admin.configuration.manage` | `200` |
| `PUT` | `/admin/trending/overrides/{topicKey}` | `putAdminTrendingOverridesByTopicKey` | `permission` | `admin.configuration.manage` | `200` |

## admin-users

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `PUT` | `/admin/users/{userId}/status` | `putAdminUsersByUserIdStatus` | `permission` | `user.read` | `200` |
| `PUT` | `/admin/users/{userId}/verification` | `putAdminUsersByUserIdVerification` | `permission` | `user.verify` | `200` |
| `GET` | `/admin/users` | `getAdminUsers` | `permission` | `user.read` | `200` |

## ai

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/ai/listing-assistance` | `postAiListingAssistance` | `permission` | `listing.create` | `200` |
| `POST` | `/ai/listing-safety` | `postAiListingSafety` | `permission` | `listing.create` | `200` |

## auth

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
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
| `POST` | `/auth/switch-role` | `postAuthSwitchRole` | `authenticated` | — | `200` |
| `POST` | `/auth/verify-email/resend` | `postAuthVerifyEmailResend` | `public` | — | `200` |
| `POST` | `/auth/verify-email` | `postAuthVerifyEmail` | `public` | — | `200` |
| `POST` | `/auth/verify-phone` | `postAuthVerifyPhone` | `authenticated` | — | `200` |

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
| `GET` | `/auto/favorites` | `getAutoFavorites` | `authenticated` | — | `200` |
| `POST` | `/auto/leads` | `postAutoLeads` | `public` | — | `200` |
| `POST` | `/auto/search` | `postAutoSearch` | `public` | — | `200` |
| `POST` | `/auto/vehicles/{id}/favorite` | `postAutoVehiclesByIdFavorite` | `authenticated` | — | `200` |
| `GET` | `/auto/vehicles/{id}` | `getAutoVehiclesById` | `public` | — | `200` |
| `POST` | `/auto/vehicles` | `postAutoVehicles` | `permission` | `auto.vehicle.manage.own` | `200` |

## business-rules

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/business-rules/catalog` | `getBusinessRulesCatalog` | `public` | — | `200` |
| `POST` | `/business-rules/eligibility` | `postBusinessRulesEligibility` | `authenticated` | — | `200` |

## compliance

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/compliance/identity/session` | `postComplianceIdentitySession` | `authenticated` | — | `200` |
| `POST` | `/compliance/manual-review` | `postComplianceManualReview` | `authenticated` | — | `200` |
| `POST` | `/compliance/payment/onboarding` | `postCompliancePaymentOnboarding` | `authenticated` | — | `200` |
| `POST` | `/compliance/requirements` | `postComplianceRequirements` | `authenticated` | — | `200` |
| `GET` | `/compliance/status` | `getComplianceStatus` | `authenticated` | — | `200` |

## education

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/education/admin/catalog` | `getEducationAdminCatalog` | `permission` | `course.admin.manage` | `200` |
| `PATCH` | `/education/admin/markets/{marketCode}/plans/{planId}` | `patchEducationAdminMarketsByMarketCodePlansByPlanId` | `permission` | `course.admin.manage` | `200` |
| `PATCH` | `/education/admin/markets/{marketCode}/subjects/{subjectId}` | `patchEducationAdminMarketsByMarketCodeSubjectsBySubjectId` | `permission` | `course.admin.manage` | `200` |
| `PUT` | `/education/admin/markets/{marketCode}` | `putEducationAdminMarketsByMarketCode` | `permission` | `course.admin.manage` | `200` |
| `POST` | `/education/bookings` | `postEducationBookings` | `permission` | `course.booking.create` | `200` |
| `GET` | `/education/catalog` | `getEducationCatalog` | `public` | — | `200` |
| `GET` | `/education/favorites` | `getEducationFavorites` | `authenticated` | — | `200` |
| `PATCH` | `/education/leads/{leadId}` | `patchEducationLeadsByLeadId` | `permission` | `course.lead.respond.own` | `200` |
| `POST` | `/education/learner-requests` | `postEducationLearnerRequests` | `permission` | `course.request.create` | `200` |
| `POST` | `/education/offers` | `postEducationOffers` | `permission` | `course.offer.manage.own` | `200` |
| `POST` | `/education/onboarding/submit` | `postEducationOnboardingSubmit` | `permission` | `course.profile.manage.own` | `200` |
| `POST` | `/education/organizations/{organizationId}/locations` | `postEducationOrganizationsByOrganizationIdLocations` | `permission` | `course.organization.manage.own` | `200` |
| `POST` | `/education/organizations/{organizationId}/members` | `postEducationOrganizationsByOrganizationIdMembers` | `permission` | `course.organization.manage.own` | `200` |
| `GET` | `/education/organizations/{organizationId}/workspace` | `getEducationOrganizationsByOrganizationIdWorkspace` | `permission` | `course.organization.manage.own` | `200` |
| `POST` | `/education/search` | `postEducationSearch` | `public` | — | `200` |
| `POST` | `/education/tutors/{id}/favorite` | `postEducationTutorsByIdFavorite` | `authenticated` | — | `200` |
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

## markets

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/markets/{code}` | `getMarketsByCode` | `public` | — | `200` |
| `GET` | `/markets/active` | `getMarketsActive` | `public` | — | `200` |
| `POST` | `/markets/active` | `postMarketsActive` | `permission` | `market.manage` | `200` |
| `GET` | `/markets/effective/{code}` | `getMarketsEffectiveByCode` | `public` | — | `200` |
| `GET` | `/markets` | `getMarkets` | `public` | — | `200` |

## media

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/media/listings/uploads/{id}/complete` | `postMediaListingsUploadsByIdComplete` | `permission` | `listing.create` | `200` |
| `POST` | `/media/listings/uploads` | `postMediaListingsUploads` | `permission` | `listing.create` | `200` |
| `POST` | `/media/private-documents/uploads/{id}/complete` | `postMediaPrivateDocumentsUploadsByIdComplete` | `authenticated` | — | `200` |
| `POST` | `/media/private-documents/uploads` | `postMediaPrivateDocumentsUploads` | `authenticated` | — | `200` |

## messaging

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/messaging/blocked` | `getMessagingBlocked` | `authenticated` | — | `200` |
| `POST` | `/messaging/block` | `postMessagingBlock` | `authenticated` | — | `200` |
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
| `POST` | `/messaging/unblock` | `postMessagingUnblock` | `authenticated` | — | `200` |

## moderation

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/admin/moderation/appeals/{appealId}/decision` | `postAdminModerationAppealDecision` | `permission` | `moderation.action` | `200` |
| `GET` | `/admin/moderation/appeals` | `getAdminModerationAppeals` | `permission` | `moderation.review` | `200` |
| `GET` | `/admin/moderation/cases` | `getAdminModerationCases` | `permission` | `moderation.review` | `200` |
| `GET` | `/moderation/appeals/mine` | `getOwnModerationAppeals` | `authenticated` | — | `200` |
| `POST` | `/moderation/cases/{caseId}/appeals` | `postModerationCaseAppeal` | `authenticated` | — | `200` |
| `GET` | `/moderation/cases/mine` | `getOwnModerationCases` | `authenticated` | — | `200` |

## monetization

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/monetization/billing` | `getMonetizationBilling` | `authenticated` | — | `200` |
| `POST` | `/monetization/checkouts` | `postMonetizationCheckouts` | `authenticated` | — | `200` |
| `GET` | `/monetization/entitlements` | `getMonetizationEntitlements` | `authenticated` | — | `200` |
| `GET` | `/monetization/invoices/{id}/document` | `getMonetizationInvoicesByIdDocument` | `authenticated` | — | `200` |
| `GET` | `/monetization/professional-plans` | `getMonetizationProfessionalPlans` | `public` | — | `200` |
| `POST` | `/monetization/promotions/validate` | `postMonetizationPromotionsValidate` | `authenticated` | — | `200` |
| `POST` | `/monetization/quotes` | `postMonetizationQuotes` | `authenticated` | — | `200` |
| `POST` | `/monetization/subscriptions/{id}/change-preview` | `postMonetizationSubscriptionsByIdChangePreview` | `permission` | `subscription.manage.own` | `200` |
| `POST` | `/monetization/subscriptions/{id}/change` | `postMonetizationSubscriptionsByIdChange` | `permission` | `subscription.manage.own` | `200` |
| `PATCH` | `/monetization/subscriptions/{id}` | `patchMonetizationSubscriptionsById` | `permission` | `subscription.manage.own` | `200` |
| `GET` | `/monetization/subscriptions` | `getMonetizationSubscriptions` | `authenticated` | — | `200` |
| `POST` | `/monetization/trials` | `postMonetizationTrials` | `permission` | `subscription.manage.own` | `200` |

## notifications

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/notifications/{id}/read` | `postNotificationsByIdRead` | `authenticated` | — | `200` |
| `DELETE` | `/notifications/{id}` | `deleteNotificationsById` | `authenticated` | — | `200` |
| `POST` | `/notifications/devices/unregister` | `postNotificationsDevicesUnregister` | `authenticated` | — | `200` |
| `POST` | `/notifications/devices` | `postNotificationsDevices` | `authenticated` | — | `200` |
| `GET` | `/notifications/preferences` | `getNotificationPreferences` | `authenticated` | — | `200` |
| `PUT` | `/notifications/preferences` | `putNotificationPreferences` | `authenticated` | — | `200` |
| `POST` | `/notifications/read-all` | `postNotificationsReadAll` | `authenticated` | — | `200` |
| `GET` | `/notifications/unread-count` | `getNotificationsUnreadCount` | `authenticated` | — | `200` |
| `GET` | `/notifications` | `getNotifications` | `authenticated` | — | `200` |

## operations

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/health` | `getHealth` | `public` | — | `200` |
| `GET` | `/livez` | `getLiveness` | `public` | — | `200` |
| `GET` | `/readyz` | `getReadiness` | `public` | — | `200` |

## orders

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/orders/{id}/cancel` | `postOrdersByIdCancel` | `authenticated` | — | `200` |
| `POST` | `/orders/{id}/confirm-delivery` | `postOrdersByIdConfirmDelivery` | `authenticated` | — | `200` |
| `POST` | `/orders/{id}/confirm-pin` | `postOrdersByIdConfirmPin` | `authenticated` | — | `200` |
| `POST` | `/orders/{id}/dispute` | `postOrdersByIdDispute` | `authenticated` | — | `200` |
| `POST` | `/orders/{id}/handover-code` | `postOrdersByIdHandoverCode` | `authenticated` | — | `200` |
| `POST` | `/orders/{id}/refund` | `postOrdersByIdRefund` | `permission` | `order.refund` | `200` |
| `POST` | `/orders/{id}/ship` | `postOrdersByIdShip` | `authenticated` | — | `200` |
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
| `POST` | `/real-estate/leads/{leadId}/appointments` | `postRealEstateLeadsByLeadIdAppointments` | `authenticated` | — | `200` |
| `POST` | `/real-estate/leads` | `postRealEstateLeads` | `public` | — | `200` |
| `GET` | `/real-estate/properties/{id}/comparables` | `getRealEstatePropertiesByIdComparables` | `public` | — | `200` |
| `GET` | `/real-estate/properties/{id}/documents/{documentId}/access` | `getRealEstatePropertiesByIdDocumentsByDocumentIdAccess` | `permission` | `immo.property.manage.own` | `200` |
| `GET` | `/real-estate/properties/{id}` | `getRealEstatePropertiesById` | `public` | — | `200` |
| `GET` | `/real-estate/recently-viewed` | `getRealEstateRecentlyViewed` | `authenticated` | — | `200` |
| `POST` | `/real-estate/recently-viewed` | `postRealEstateRecentlyViewed` | `authenticated` | — | `200` |
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
| `GET` | `/support/cases/mine` | `getSupportCasesMine` | `authenticated` | — | `200` |
| `GET` | `/support/cases` | `getSupportCases` | `permission` | `support.case.read` | `200` |
| `POST` | `/support/cases` | `postSupportCases` | `authenticated` | — | `200` |
| `GET` | `/support/metrics` | `getSupportMetrics` | `permission` | `support.case.read` | `200` |

## taxonomy

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/taxonomy/nodes/{id}/attributes` | `getTaxonomyNodesByIdAttributes` | `public` | — | `200` |
| `GET` | `/taxonomy/nodes/{id}/children` | `getTaxonomyNodesByIdChildren` | `public` | — | `200` |
| `GET` | `/taxonomy/nodes/{id}` | `getTaxonomyNodesById` | `public` | — | `200` |
| `GET` | `/taxonomy/root` | `getTaxonomyRoot` | `public` | — | `200` |
| `GET` | `/taxonomy/search-filters` | `getTaxonomySearchFilters` | `public` | — | `200` |
| `GET` | `/taxonomy/slug/{slug}` | `getTaxonomySlugBySlug` | `public` | — | `200` |

## users

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/users/{id}` | `getUsersById` | `public` | — | `200` |
| `PUT` | `/users/{id}` | `putUsersById` | `permission` | `profile.update.own` | `200` |

## verification

| Method | Path | Operation ID | Access | Permission | Success |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/verification/business-registration` | `postVerificationBusinessRegistration` | `authenticated` | — | `200` |
| `GET` | `/verification/siret-lookup/{siret}` | `getVerificationSiretLookupBySiret` | `authenticated` | — | `200` |
| `GET` | `/verification/status/{userId}` | `getVerificationStatusByUserId` | `authenticated` | — | `200` |

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
| `GET` | `/workspace/summary/{userId}` | `getWorkspaceSummaryByUserId` | `authenticated` | — | `200` |

