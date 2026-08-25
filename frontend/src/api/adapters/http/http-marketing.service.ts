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
import type {
  MarketingAccountIdentity,
  MarketingAccountSubscriptionInput,
  MarketingPage,
  MarketingServiceContract,
} from "../../contracts/marketing.contract";
import { httpClient } from "./http-client";

export class HttpMarketingService implements MarketingServiceContract {
  subscribePublic(input: MarketingPublicSubscriptionInput) {
    return httpClient.post<MarketingSubscriptionReceipt>(
      "/marketing/public/subscriptions",
      input,
    );
  }
  confirmPublic(token: string) {
    return httpClient.post<MarketingSubscriptionView>(
      "/marketing/public/confirm",
      { token },
    );
  }
  getPublicPreferences(token: string) {
    return httpClient.get<MarketingSubscriptionView>(
      "/marketing/public/preferences",
      { params: { token } },
    );
  }
  updatePublicPreferences(input: MarketingPublicPreferencesUpdate) {
    return httpClient.put<MarketingSubscriptionView>(
      "/marketing/public/preferences",
      input,
    );
  }
  unsubscribePublic(token: string) {
    return httpClient.post<MarketingSubscriptionReceipt>(
      "/marketing/public/unsubscribe",
      { token },
    );
  }
  getAccountSubscription(identity: MarketingAccountIdentity) {
    return httpClient.get<MarketingSubscriptionView | null>(
      "/marketing/account/subscription",
      { params: { marketCode: identity.marketCode } },
    );
  }
  subscribeAccount(input: MarketingAccountSubscriptionInput) {
    return httpClient.post<MarketingSubscriptionView>(
      "/marketing/account/subscription",
      {
        marketCode: input.marketCode,
        locale: input.locale,
        topics: input.topics,
        consentGiven: input.consentGiven,
      },
    );
  }
  updateAccountPreferences(
    input: MarketingAccountIdentity & { topics: string[] },
  ) {
    return httpClient.put<MarketingSubscriptionView>(
      "/marketing/account/preferences",
      { marketCode: input.marketCode, topics: input.topics },
    );
  }
  unsubscribeAccount(identity: MarketingAccountIdentity) {
    return httpClient.post<MarketingSubscriptionView>(
      "/marketing/account/unsubscribe",
      { marketCode: identity.marketCode },
    );
  }
  getDashboard() {
    return httpClient.get<MarketingDashboard>("/marketing/dashboard");
  }
  listProfiles(
    options: {
      limit?: number;
      cursor?: string;
      query?: string;
      status?: string;
    } = {},
  ) {
    return httpClient.get<MarketingPage<MarketingProfile>>(
      "/marketing/profiles",
      { params: options },
    );
  }
  createProfile(input: MarketingProfileInput) {
    return httpClient.post<MarketingProfile>("/marketing/profiles", input);
  }
  confirmProfile(id: string) {
    return httpClient.post<MarketingProfile>(
      `/marketing/profiles/${encodeURIComponent(id)}/confirm`,
      {},
    );
  }
  unsubscribeProfile(id: string) {
    return httpClient.post<MarketingProfile>(
      `/marketing/profiles/${encodeURIComponent(id)}/unsubscribe`,
      {},
    );
  }
  async listLists() {
    return (
      await httpClient.get<{ items: MarketingList[] }>("/marketing/lists")
    ).items;
  }
  createList(input: MarketingListInput) {
    return httpClient.post<MarketingList>("/marketing/lists", input);
  }
  async addListMember(listId: string, profileId: string) {
    await httpClient.post(
      `/marketing/lists/${encodeURIComponent(listId)}/members/${encodeURIComponent(profileId)}`,
      {},
    );
  }
  async listSegments() {
    return (
      await httpClient.get<{ items: MarketingSegment[] }>("/marketing/segments")
    ).items;
  }
  createSegment(input: MarketingSegmentInput) {
    return httpClient.post<MarketingSegment>("/marketing/segments", input);
  }
  async listTemplates() {
    return (
      await httpClient.get<{ items: MarketingTemplate[] }>(
        "/marketing/templates",
      )
    ).items;
  }
  createTemplate(input: MarketingTemplateInput) {
    return httpClient.post<MarketingTemplate>("/marketing/templates", input);
  }
  async listCampaigns() {
    return (
      await httpClient.get<{ items: MarketingCampaign[] }>(
        "/marketing/campaigns",
      )
    ).items;
  }
  getCampaign(id: string) {
    return httpClient.get<MarketingCampaign>(
      `/marketing/campaigns/${encodeURIComponent(id)}`,
    );
  }
  createCampaign(input: MarketingCampaignInput) {
    return httpClient.post<MarketingCampaign>("/marketing/campaigns", input);
  }
  estimateAudience(audience: MarketingAudienceDefinition) {
    return httpClient.post<MarketingAudienceEstimate>(
      "/marketing/campaigns/audience-estimate",
      audience,
    );
  }
  preflight(id: string) {
    return httpClient.post<MarketingPreflight>(
      `/marketing/campaigns/${encodeURIComponent(id)}/preflight`,
      {},
    );
  }
  testSend(id: string, recipient: string) {
    return httpClient.post<{ externalMessageId: string; acceptedAt: string }>(
      `/marketing/campaigns/${encodeURIComponent(id)}/test-send`,
      { recipient },
    );
  }
  send(id: string) {
    return httpClient.post<{
      campaign: MarketingCampaign;
      queuedRecipients: number;
      excludedRecipients: number;
    }>(`/marketing/campaigns/${encodeURIComponent(id)}/send`, {});
  }
  schedule(id: string, scheduledAt: string) {
    return httpClient.post<MarketingCampaign>(
      `/marketing/campaigns/${encodeURIComponent(id)}/schedule`,
      { scheduledAt },
    );
  }
  pause(id: string) {
    return httpClient.post<MarketingCampaign>(
      `/marketing/campaigns/${encodeURIComponent(id)}/pause`,
      {},
    );
  }
  resume(id: string) {
    return httpClient.post<MarketingCampaign>(
      `/marketing/campaigns/${encodeURIComponent(id)}/resume`,
      {},
    );
  }
  submitForReview(id: string) {
    return httpClient.post<MarketingCampaign>(
      `/marketing/campaigns/${encodeURIComponent(id)}/review`,
      {},
    );
  }
  approve(id: string) {
    return httpClient.post<MarketingCampaign>(
      `/marketing/campaigns/${encodeURIComponent(id)}/approve`,
      {},
    );
  }
  selectExperimentWinner(id: string, variantId?: string) {
    return httpClient.post<MarketingCampaign>(
      `/marketing/campaigns/${encodeURIComponent(id)}/select-winner`,
      variantId ? { variantId } : {},
    );
  }
  cancel(id: string) {
    return httpClient.post<MarketingCampaign>(
      `/marketing/campaigns/${encodeURIComponent(id)}/cancel`,
      {},
    );
  }
  async listSuppressions() {
    return (
      await httpClient.get<{ items: MarketingSuppression[] }>(
        "/marketing/suppressions",
      )
    ).items;
  }
  generateCampaignDraft(instructions: string, locale?: string) {
    return httpClient.post<AiGenerationResult>("/marketing/ai/campaign-draft", {
      instructions,
      locale,
    });
  }
  aiAssist(input: MarketingAiAssistInput) {
    return httpClient.post<AiGenerationResult & { draftOnly: true }>(
      "/marketing/ai/assist",
      input,
    );
  }
  getAnalytics(campaignId?: string) {
    return httpClient.get<MarketingAnalytics>("/marketing/analytics", {
      params: { campaignId },
    });
  }
  recordConversion(input: MarketingConversionInput) {
    return httpClient.post<{ accepted: true; duplicate: boolean }>(
      "/marketing/conversions",
      input,
    );
  }
  getUsage() {
    return httpClient.get<MarketingUsage>("/marketing/usage");
  }
  async listJourneys() {
    return (
      await httpClient.get<{ items: MarketingJourney[] }>("/marketing/journeys")
    ).items;
  }
  createJourney(input: MarketingJourneyInput) {
    return httpClient.post<MarketingJourney>("/marketing/journeys", input);
  }
  activateJourney(id: string) {
    return httpClient.post<MarketingJourney>(
      `/marketing/journeys/${encodeURIComponent(id)}/activate`,
      {},
    );
  }
  pauseJourney(id: string) {
    return httpClient.post<MarketingJourney>(
      `/marketing/journeys/${encodeURIComponent(id)}/pause`,
      {},
    );
  }
  async listJourneyExecutions(journeyId?: string) {
    return (
      await httpClient.get<{ items: MarketingJourneyExecution[] }>(
        "/marketing/journey-executions",
        { params: { journeyId } },
      )
    ).items;
  }
  async listWebhookSubscriptions() {
    return (
      await httpClient.get<{ items: MarketingWebhookSubscription[] }>(
        "/marketing/webhooks",
      )
    ).items;
  }
  createWebhookSubscription(input: MarketingWebhookSubscriptionInput) {
    return httpClient.post<{
      subscription: MarketingWebhookSubscription;
      signingSecret: string;
    }>("/marketing/webhooks", input);
  }
}

export const httpMarketingService = new HttpMarketingService();
