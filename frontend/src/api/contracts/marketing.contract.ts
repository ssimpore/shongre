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

export interface MarketingPage<T> {
  items: T[];
  pageInfo: { hasNextPage: boolean; nextCursor?: string };
}

export interface MarketingAccountIdentity {
  userId: string;
  email: string;
  marketCode?: string;
}

export interface MarketingAccountSubscriptionInput extends MarketingAccountIdentity {
  locale?: string;
  topics: string[];
  consentGiven: true;
}

export interface MarketingServiceContract {
  subscribePublic(
    input: MarketingPublicSubscriptionInput,
  ): Promise<MarketingSubscriptionReceipt>;
  confirmPublic(token: string): Promise<MarketingSubscriptionView>;
  getPublicPreferences(token: string): Promise<MarketingSubscriptionView>;
  updatePublicPreferences(
    input: MarketingPublicPreferencesUpdate,
  ): Promise<MarketingSubscriptionView>;
  unsubscribePublic(token: string): Promise<MarketingSubscriptionReceipt>;
  getAccountSubscription(
    identity: MarketingAccountIdentity,
  ): Promise<MarketingSubscriptionView | null>;
  subscribeAccount(
    input: MarketingAccountSubscriptionInput,
  ): Promise<MarketingSubscriptionView>;
  updateAccountPreferences(
    input: MarketingAccountIdentity & { topics: string[] },
  ): Promise<MarketingSubscriptionView>;
  unsubscribeAccount(
    identity: MarketingAccountIdentity,
  ): Promise<MarketingSubscriptionView>;
  getDashboard(): Promise<MarketingDashboard>;
  listProfiles(options?: {
    limit?: number;
    cursor?: string;
    query?: string;
    status?: string;
  }): Promise<MarketingPage<MarketingProfile>>;
  createProfile(input: MarketingProfileInput): Promise<MarketingProfile>;
  confirmProfile(id: string): Promise<MarketingProfile>;
  unsubscribeProfile(id: string): Promise<MarketingProfile>;
  listLists(): Promise<MarketingList[]>;
  createList(input: MarketingListInput): Promise<MarketingList>;
  addListMember(listId: string, profileId: string): Promise<void>;
  listSegments(): Promise<MarketingSegment[]>;
  createSegment(input: MarketingSegmentInput): Promise<MarketingSegment>;
  listTemplates(): Promise<MarketingTemplate[]>;
  createTemplate(input: MarketingTemplateInput): Promise<MarketingTemplate>;
  listCampaigns(): Promise<MarketingCampaign[]>;
  getCampaign(id: string): Promise<MarketingCampaign | null>;
  createCampaign(input: MarketingCampaignInput): Promise<MarketingCampaign>;
  estimateAudience(
    audience: MarketingAudienceDefinition,
  ): Promise<MarketingAudienceEstimate>;
  preflight(id: string): Promise<MarketingPreflight>;
  testSend(
    id: string,
    recipient: string,
  ): Promise<{ externalMessageId: string; acceptedAt: string }>;
  send(id: string): Promise<{
    campaign: MarketingCampaign;
    queuedRecipients: number;
    excludedRecipients: number;
  }>;
  schedule(id: string, scheduledAt: string): Promise<MarketingCampaign>;
  pause(id: string): Promise<MarketingCampaign>;
  resume(id: string): Promise<MarketingCampaign>;
  submitForReview(id: string): Promise<MarketingCampaign>;
  approve(id: string): Promise<MarketingCampaign>;
  selectExperimentWinner(
    id: string,
    variantId?: string,
  ): Promise<MarketingCampaign>;
  cancel(id: string): Promise<MarketingCampaign>;
  listSuppressions(): Promise<MarketingSuppression[]>;
  generateCampaignDraft(
    instructions: string,
    locale?: string,
  ): Promise<AiGenerationResult>;
  aiAssist(
    input: MarketingAiAssistInput,
  ): Promise<AiGenerationResult & { draftOnly: true }>;
  getAnalytics(campaignId?: string): Promise<MarketingAnalytics>;
  recordConversion(
    input: MarketingConversionInput,
  ): Promise<{ accepted: true; duplicate: boolean }>;
  getUsage(): Promise<MarketingUsage>;
  listJourneys(): Promise<MarketingJourney[]>;
  createJourney(input: MarketingJourneyInput): Promise<MarketingJourney>;
  activateJourney(id: string): Promise<MarketingJourney>;
  pauseJourney(id: string): Promise<MarketingJourney>;
  listJourneyExecutions(
    journeyId?: string,
  ): Promise<MarketingJourneyExecution[]>;
  listWebhookSubscriptions(): Promise<MarketingWebhookSubscription[]>;
  createWebhookSubscription(input: MarketingWebhookSubscriptionInput): Promise<{
    subscription: MarketingWebhookSubscription;
    signingSecret: string;
  }>;
}
