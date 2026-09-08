import type {
  AiGenerationResult,
  MarketingAudienceDefinition,
  MarketingAudienceEstimate,
  MarketingCampaign,
  MarketingCampaignInput,
  MarketingConversionInput,
  MarketingDashboard,
  MarketingAnalytics,
  MarketingJourney,
  MarketingJourneyExecution,
  MarketingJourneyInput,
  MarketingUsage,
  MarketingWebhookSubscription,
  MarketingWebhookSubscriptionInput,
  MarketingAiAssistInput,
  MarketingList,
  MarketingListInput,
  MarketingPreflight,
  MarketingProfile,
  MarketingProfileInput,
  MarketingPublicPreferencesUpdate,
  MarketingPublicSubscriptionInput,
  MarketingSegment,
  MarketingSegmentInput,
  MarketingSuppression,
  MarketingSubscriptionReceipt,
  MarketingSubscriptionView,
  MarketingTemplate,
  MarketingTemplateInput,
} from "@shongre/contracts";
import { apiOperation } from "./generated-api-operation";
import type {
  MarketingAccountIdentity,
  MarketingAccountSubscriptionInput,
  MarketingPage,
  MarketingServiceContract,
} from "../../contracts/marketing.contract";

export class HttpMarketingService implements MarketingServiceContract {
  subscribePublic(input: MarketingPublicSubscriptionInput) {
    return apiOperation<
      MarketingSubscriptionReceipt,
      "createPublicMarketingSubscription"
    >("createPublicMarketingSubscription", { body: input });
  }
  confirmPublic(token: string) {
    return apiOperation<
      MarketingSubscriptionView,
      "confirmPublicMarketingSubscription"
    >("confirmPublicMarketingSubscription", { body: { token } });
  }
  getPublicPreferences(token: string) {
    return apiOperation<
      MarketingSubscriptionView,
      "getPublicMarketingPreferences"
    >("getPublicMarketingPreferences", { query: { token } });
  }
  updatePublicPreferences(input: MarketingPublicPreferencesUpdate) {
    return apiOperation<
      MarketingSubscriptionView,
      "updatePublicMarketingPreferences"
    >("updatePublicMarketingPreferences", { body: input });
  }
  unsubscribePublic(token: string) {
    return apiOperation<
      MarketingSubscriptionReceipt,
      "unsubscribePublicMarketingProfile"
    >("unsubscribePublicMarketingProfile", { body: { token } });
  }
  getAccountSubscription(identity: MarketingAccountIdentity) {
    return apiOperation<
      MarketingSubscriptionView | null,
      "getAccountMarketingSubscription"
    >("getAccountMarketingSubscription", {
      query: { marketCode: identity.marketCode },
    });
  }
  subscribeAccount(input: MarketingAccountSubscriptionInput) {
    return apiOperation<
      MarketingSubscriptionView,
      "subscribeAccountToMarketing"
    >("subscribeAccountToMarketing", {
      body: {
        marketCode: input.marketCode,
        locale: input.locale,
        topics: input.topics,
        consentGiven: input.consentGiven,
      },
    });
  }
  updateAccountPreferences(
    input: MarketingAccountIdentity & { topics: string[] },
  ) {
    return apiOperation<
      MarketingSubscriptionView,
      "updateAccountMarketingPreferences"
    >("updateAccountMarketingPreferences", {
      body: { marketCode: input.marketCode, topics: input.topics },
    });
  }
  unsubscribeAccount(identity: MarketingAccountIdentity) {
    return apiOperation<
      MarketingSubscriptionView,
      "unsubscribeAccountFromMarketing"
    >("unsubscribeAccountFromMarketing", {
      body: { marketCode: identity.marketCode },
    });
  }
  getDashboard() {
    return apiOperation<MarketingDashboard, "getMarketingDashboard">(
      "getMarketingDashboard",
      {},
    );
  }
  listProfiles(
    options: {
      limit?: number;
      cursor?: string;
      query?: string;
      status?: string;
    } = {},
  ) {
    return apiOperation<
      MarketingPage<MarketingProfile>,
      "listMarketingProfiles"
    >("listMarketingProfiles", { query: options });
  }
  createProfile(input: MarketingProfileInput) {
    return apiOperation<MarketingProfile, "createMarketingProfile">(
      "createMarketingProfile",
      { body: input },
    );
  }
  confirmProfile(id: string) {
    return apiOperation<MarketingProfile, "confirmMarketingProfile">(
      "confirmMarketingProfile",
      { path: { profileId: id }, body: {} },
    );
  }
  unsubscribeProfile(id: string) {
    return apiOperation<MarketingProfile, "unsubscribeMarketingProfile">(
      "unsubscribeMarketingProfile",
      { path: { profileId: id }, body: {} },
    );
  }
  async listLists() {
    return (
      await apiOperation<{ items: MarketingList[] }, "listMarketingLists">(
        "listMarketingLists",
        {},
      )
    ).items;
  }
  createList(input: MarketingListInput) {
    return apiOperation<MarketingList, "createMarketingList">(
      "createMarketingList",
      { body: input },
    );
  }
  async addListMember(listId: string, profileId: string) {
    await apiOperation("addMarketingListMember", {
      path: { listId: listId, profileId: profileId },
      body: {},
    });
  }
  async listSegments() {
    return (
      await apiOperation<
        { items: MarketingSegment[] },
        "listMarketingSegments"
      >("listMarketingSegments", {})
    ).items;
  }
  createSegment(input: MarketingSegmentInput) {
    return apiOperation<MarketingSegment, "createMarketingSegment">(
      "createMarketingSegment",
      { body: input },
    );
  }
  async listTemplates() {
    return (
      await apiOperation<
        { items: MarketingTemplate[] },
        "listMarketingTemplates"
      >("listMarketingTemplates", {})
    ).items;
  }
  createTemplate(input: MarketingTemplateInput) {
    return apiOperation<MarketingTemplate, "createMarketingTemplate">(
      "createMarketingTemplate",
      { body: input },
    );
  }
  async listCampaigns() {
    return (
      await apiOperation<
        { items: MarketingCampaign[] },
        "listMarketingCampaigns"
      >("listMarketingCampaigns", {})
    ).items;
  }
  getCampaign(id: string) {
    return apiOperation<MarketingCampaign, "getMarketingCampaign">(
      "getMarketingCampaign",
      { path: { campaignId: id } },
    );
  }
  createCampaign(input: MarketingCampaignInput) {
    return apiOperation<MarketingCampaign, "createMarketingCampaign">(
      "createMarketingCampaign",
      { body: input },
    );
  }
  estimateAudience(audience: MarketingAudienceDefinition) {
    return apiOperation<MarketingAudienceEstimate, "estimateMarketingAudience">(
      "estimateMarketingAudience",
      { body: audience },
    );
  }
  preflight(id: string) {
    return apiOperation<MarketingPreflight, "preflightMarketingCampaign">(
      "preflightMarketingCampaign",
      { path: { campaignId: id }, body: {} },
    );
  }
  testSend(id: string, recipient: string) {
    return apiOperation<
      { externalMessageId: string; acceptedAt: string },
      "testSendMarketingCampaign"
    >("testSendMarketingCampaign", {
      path: { campaignId: id },
      body: { recipient },
    });
  }
  send(id: string) {
    return apiOperation<
      {
        campaign: MarketingCampaign;
        queuedRecipients: number;
        excludedRecipients: number;
      },
      "sendMarketingCampaign"
    >("sendMarketingCampaign", { path: { campaignId: id }, body: {} });
  }
  schedule(id: string, scheduledAt: string) {
    return apiOperation<MarketingCampaign, "scheduleMarketingCampaign">(
      "scheduleMarketingCampaign",
      { path: { campaignId: id }, body: { scheduledAt } },
    );
  }
  pause(id: string) {
    return apiOperation<MarketingCampaign, "pauseMarketingCampaign">(
      "pauseMarketingCampaign",
      { path: { campaignId: id }, body: {} },
    );
  }
  resume(id: string) {
    return apiOperation<MarketingCampaign, "resumeMarketingCampaign">(
      "resumeMarketingCampaign",
      { path: { campaignId: id }, body: {} },
    );
  }
  submitForReview(id: string) {
    return apiOperation<MarketingCampaign, "reviewMarketingCampaign">(
      "reviewMarketingCampaign",
      { path: { campaignId: id }, body: {} },
    );
  }
  approve(id: string) {
    return apiOperation<MarketingCampaign, "approveMarketingCampaign">(
      "approveMarketingCampaign",
      { path: { campaignId: id }, body: {} },
    );
  }
  selectExperimentWinner(id: string, variantId?: string) {
    return apiOperation<MarketingCampaign, "selectMarketingCampaignWinner">(
      "selectMarketingCampaignWinner",
      { path: { campaignId: id }, body: variantId ? { variantId } : {} },
    );
  }
  cancel(id: string) {
    return apiOperation<MarketingCampaign, "cancelMarketingCampaign">(
      "cancelMarketingCampaign",
      { path: { campaignId: id }, body: {} },
    );
  }
  async listSuppressions() {
    return (
      await apiOperation<
        { items: MarketingSuppression[] },
        "listMarketingSuppressions"
      >("listMarketingSuppressions", {})
    ).items;
  }
  generateCampaignDraft(instructions: string, locale?: string) {
    return apiOperation<AiGenerationResult, "generateMarketingCampaignDraft">(
      "generateMarketingCampaignDraft",
      {
        body: {
          instructions,
          locale,
        },
      },
    );
  }
  aiAssist(input: MarketingAiAssistInput) {
    return apiOperation<
      AiGenerationResult & { draftOnly: true },
      "assistMarketingWithAi"
    >("assistMarketingWithAi", { body: input });
  }
  getAnalytics(campaignId?: string) {
    return apiOperation<MarketingAnalytics, "getMarketingAnalytics">(
      "getMarketingAnalytics",
      { query: { campaignId } },
    );
  }
  recordConversion(input: MarketingConversionInput) {
    return apiOperation<
      { accepted: true; duplicate: boolean },
      "recordMarketingConversion"
    >("recordMarketingConversion", { body: input });
  }
  getUsage() {
    return apiOperation<MarketingUsage, "getMarketingUsage">(
      "getMarketingUsage",
      {},
    );
  }
  async listJourneys() {
    return (
      await apiOperation<
        { items: MarketingJourney[] },
        "listMarketingJourneys"
      >("listMarketingJourneys", {})
    ).items;
  }
  createJourney(input: MarketingJourneyInput) {
    return apiOperation<MarketingJourney, "createMarketingJourney">(
      "createMarketingJourney",
      { body: input },
    );
  }
  activateJourney(id: string) {
    return apiOperation<MarketingJourney, "activateMarketingJourney">(
      "activateMarketingJourney",
      { path: { journeyId: id }, body: {} },
    );
  }
  pauseJourney(id: string) {
    return apiOperation<MarketingJourney, "pauseMarketingJourney">(
      "pauseMarketingJourney",
      { path: { journeyId: id }, body: {} },
    );
  }
  async listJourneyExecutions(journeyId?: string) {
    return (
      await apiOperation<
        { items: MarketingJourneyExecution[] },
        "listMarketingJourneyExecutions"
      >("listMarketingJourneyExecutions", { query: { journeyId } })
    ).items;
  }
  async listWebhookSubscriptions() {
    return (
      await apiOperation<
        { items: MarketingWebhookSubscription[] },
        "listMarketingWebhooks"
      >("listMarketingWebhooks", {})
    ).items;
  }
  createWebhookSubscription(input: MarketingWebhookSubscriptionInput) {
    return apiOperation<
      {
        subscription: MarketingWebhookSubscription;
        signingSecret: string;
      },
      "createMarketingWebhook"
    >("createMarketingWebhook", { body: input });
  }
}

export const httpMarketingService = new HttpMarketingService();
