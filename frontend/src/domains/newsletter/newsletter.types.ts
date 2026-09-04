/**
 * SHONGRE CANONICAL NEWSLETTER TYPES
 * Authoritative domain definitions for newsletter subscriptions, topics,
 * consent records, campaigns, audience targeting, and delivery simulation.
 */

export type NewsletterTopic =
  | "deals"
  | "editorial"
  | "new_features"
  | "seller_tips"
  | "pro_insights"
  | "local_trends"
  | "community";

export type NewsletterSubscriptionStatus =
  "unsubscribed" | "pending_confirmation" | "subscribed" | "suppressed";

export type NewsletterSubscriptionSource =
  | "homepage"
  | "footer"
  | "registration"
  | "account"
  | "pro_workspace"
  | "newsletter_page"
  | "direct_link";

interface NewsletterConsent {
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
  accountType?: "individual" | "pro";
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
  accountType?: "individual" | "pro";
  source?: NewsletterSubscriptionSource;
  consentGiven?: boolean;
}
