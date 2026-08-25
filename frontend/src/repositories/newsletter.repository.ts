/** Compatibility facade for legacy account components; canonical state lives in MarketingServiceContract. */
import type { MarketingSubscriptionView } from "@shongre/contracts";
import { services } from "../api/client/service-registry";
import type {
  NewsletterSubscription,
  NewsletterTopic,
  SubscribeNewsletterInput,
} from "../domains/newsletter/newsletter.types";
import { CURRENT_NEWSLETTER_CONSENT_VERSION } from "../domains/newsletter/newsletter.service";
import { DEFAULT_MARKET_CODE } from "../configuration/market-baseline";

interface AccountIdentity {
  userId: string;
  email: string;
  marketCode: string;
}

function toSubscription(
  view: MarketingSubscriptionView,
  subscriberId?: string,
): NewsletterSubscription {
  const status =
    view.status === "SUBSCRIBED"
      ? "subscribed"
      : view.status === "PENDING"
        ? "pending_confirmation"
        : view.status === "UNSUBSCRIBED"
          ? "unsubscribed"
          : "suppressed";
  const now = new Date().toISOString();
  return {
    id: view.id,
    subscriberId,
    email: view.email,
    marketCode: view.marketCode,
    locale: view.locale,
    status,
    topics: view.topics as NewsletterTopic[],
    consent: {
      consented: status === "subscribed" || status === "pending_confirmation",
      consentedAt: view.subscribedAt ?? now,
      version: CURRENT_NEWSLETTER_CONSENT_VERSION,
      source: "account",
    },
    createdAt: view.subscribedAt ?? now,
    updatedAt: now,
    confirmedAt: view.confirmedAt,
    unsubscribedAt: view.unsubscribedAt,
  };
}

export interface INewsletterRepository {
  getSubscription(
    email: string,
    marketCode?: string,
  ): Promise<NewsletterSubscription | null>;
  getSubscriptionByUserId(
    userId: string,
  ): Promise<NewsletterSubscription | null>;
  subscribe(input: SubscribeNewsletterInput): Promise<NewsletterSubscription>;
  confirmSubscription(token: string): Promise<NewsletterSubscription>;
  updatePreferences(
    subscriptionId: string,
    topics: NewsletterTopic[],
  ): Promise<NewsletterSubscription>;
  unsubscribe(subscriptionId: string): Promise<NewsletterSubscription>;
  resubscribe(
    subscriptionId: string,
    topics?: NewsletterTopic[],
  ): Promise<NewsletterSubscription>;
}

class MarketingNewsletterRepository implements INewsletterRepository {
  private identities = new Map<string, AccountIdentity>();

  private remember(view: MarketingSubscriptionView, identity: AccountIdentity) {
    this.identities.set(view.id, identity);
    return toSubscription(view, identity.userId || undefined);
  }

  async getSubscription(email: string, marketCode = DEFAULT_MARKET_CODE) {
    const identity = { userId: "", email, marketCode };
    const view = await services.marketing.getAccountSubscription(identity);
    return view ? this.remember(view, identity) : null;
  }

  async getSubscriptionByUserId(userId: string) {
    const identity = { userId, email: "", marketCode: DEFAULT_MARKET_CODE };
    const view = await services.marketing.getAccountSubscription(identity);
    return view ? this.remember(view, identity) : null;
  }

  async subscribe(input: SubscribeNewsletterInput) {
    if (!input.subscriberId)
      throw new Error(
        "Connectez-vous pour gérer cet abonnement depuis votre compte.",
      );
    const identity = {
      userId: input.subscriberId,
      email: input.email,
      marketCode: input.marketCode ?? DEFAULT_MARKET_CODE,
    };
    const view = await services.marketing.subscribeAccount({
      ...identity,
      locale: input.locale ?? "fr-FR",
      topics: input.topics ?? [],
      consentGiven: true,
    });
    return this.remember(view, identity);
  }

  async confirmSubscription(token: string) {
    return toSubscription(await services.marketing.confirmPublic(token));
  }

  async updatePreferences(subscriptionId: string, topics: NewsletterTopic[]) {
    const identity = this.identities.get(subscriptionId);
    if (!identity)
      throw new Error("Rechargez la page avant de modifier vos préférences.");
    return this.remember(
      await services.marketing.updateAccountPreferences({
        ...identity,
        topics,
      }),
      identity,
    );
  }

  async unsubscribe(subscriptionId: string) {
    const identity = this.identities.get(subscriptionId);
    if (!identity)
      throw new Error("Rechargez la page avant de vous désabonner.");
    return this.remember(
      await services.marketing.unsubscribeAccount(identity),
      identity,
    );
  }

  async resubscribe(subscriptionId: string, topics: NewsletterTopic[] = []) {
    const identity = this.identities.get(subscriptionId);
    if (!identity)
      throw new Error("Rechargez la page avant de vous réabonner.");
    return this.remember(
      await services.marketing.subscribeAccount({
        ...identity,
        topics,
        consentGiven: true,
      }),
      identity,
    );
  }
}

export const newsletterRepository: INewsletterRepository =
  new MarketingNewsletterRepository();
