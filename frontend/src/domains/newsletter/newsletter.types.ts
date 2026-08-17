/**
 * SHONGRE CANONICAL NEWSLETTER TYPES
 * Authoritative domain definitions for newsletter subscriptions, topics,
 * consent records, campaigns, audience targeting, and delivery simulation.
 */

export type NewsletterTopic =
  | 'deals'
  | 'editorial'
  | 'new_features'
  | 'seller_tips'
  | 'pro_insights'
  | 'local_trends'
  | 'community';

export type NewsletterSubscriptionStatus =
  | 'unsubscribed'
  | 'pending_confirmation'
  | 'subscribed'
  | 'suppressed';

export type NewsletterSubscriptionSource =
  | 'homepage'
  | 'footer'
  | 'registration'
  | 'account'
  | 'pro_workspace'
  | 'newsletter_page'
  | 'direct_link';

export interface NewsletterConsent {
  consented: boolean;
  consentedAt: string;
  version: string;
  source: NewsletterSubscriptionSource;
  ipOrFingerprintSim?: string;
}

export interface NewsletterSubscription {
  id: string;
  subscriberId?: string;
  email: string;
  marketCode: string;
  locale: string;
  status: NewsletterSubscriptionStatus;
  topics: NewsletterTopic[];
  accountType?: 'individual' | 'pro';
  consent: NewsletterConsent;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
}

export interface SubscribeNewsletterInput {
  email: string;
  subscriberId?: string;
  marketCode?: string;
  locale?: string;
  topics?: NewsletterTopic[];
  accountType?: 'individual' | 'pro';
  source?: NewsletterSubscriptionSource;
  consentGiven?: boolean;
}

export interface UpdateNewsletterPreferencesInput {
  subscriptionId?: string;
  email?: string;
  subscriberId?: string;
  topics: NewsletterTopic[];
  marketCode?: string;
  locale?: string;
}

export type NewsletterCampaignStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'cancelled'
  | 'failed';

export interface NewsletterAudienceDefinition {
  accountTypes?: ('individual' | 'pro')[];
  topicIds?: NewsletterTopic[];
  taxonomyNodeIds?: string[];
  marketCode: string;
  locale?: string;
}

export interface NewsletterCampaignContent {
  heroTitle?: string;
  heroSubtitle?: string;
  introText?: string;
  featuredListingIds?: string[];
  featuredCategorySlugs?: string[];
  ctaText?: string;
  ctaUrl?: string;
  footerNotes?: string;
}

export interface NewsletterCampaignStats {
  recipientsCount: number;
  openedCount?: number;
  clickedCount?: number;
  unsubscribedCount?: number;
}

export interface NewsletterCampaign {
  id: string;
  name: string;
  marketCode: string;
  locale: string;
  audience: NewsletterAudienceDefinition;
  topic?: NewsletterTopic;
  status: NewsletterCampaignStatus;
  subject: string;
  previewText?: string;
  content: NewsletterCampaignContent;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  stats?: NewsletterCampaignStats;
}
