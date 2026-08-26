import { consentService } from "../domains/consent/consent.service";
import { getCountryConfig } from "@shongre/contracts";

export type MarketplaceAnalyticsEvent =
  | "trending_section_view"
  | "trending_topic_impression"
  | "trending_topic_click"
  | "trending_topic_change"
  | "trending_listing_impression"
  | "trending_listing_click"
  | "trending_see_all_click";

export interface MarketplaceAnalyticsPayload {
  market?: string;
  topic?: string;
  topicType?: string;
  position?: number;
  listingId?: string;
  source?: "trending_now";
}

export interface AnalyticsEventRecord {
  name: MarketplaceAnalyticsEvent;
  payload: MarketplaceAnalyticsPayload;
  country: string;
  locale: string;
  domain: string;
  market: string;
  currency: string;
  occurredAt: string;
}

const memoryEvents: AnalyticsEventRecord[] = [];
const france = getCountryConfig("FR")!;
let activeMarketContext: Omit<
  AnalyticsEventRecord,
  "name" | "payload" | "occurredAt"
> = {
  country: france.code,
  locale: france.defaultLocale,
  domain: france.canonicalDomainMode,
  market: france.code,
  currency: france.currency,
};

/**
 * Small provider-neutral analytics boundary. The consent gate is intentional:
 * adding a real collector later must not create a period where the homepage
 * silently starts tracking before the visitor permits audience measurement.
 */
export const analyticsService = {
  setMarketContext(context: {
    country: string;
    locale: string;
    domain: string;
    market: string;
    currency: string;
  }): void {
    activeMarketContext = {
      country: context.country.toUpperCase(),
      locale: context.locale,
      domain: context.domain.toLowerCase(),
      market: context.market.toUpperCase(),
      currency: context.currency.toUpperCase(),
    };
  },
  track(
    name: MarketplaceAnalyticsEvent,
    payload: MarketplaceAnalyticsPayload = {},
  ): void {
    if (!consentService.hasConsent("analytics")) return;
    memoryEvents.push({
      name,
      payload,
      ...activeMarketContext,
      occurredAt: new Date().toISOString(),
    });
    if (memoryEvents.length > 100) memoryEvents.shift();
  },
  getRecentEvents(): AnalyticsEventRecord[] {
    return [...memoryEvents];
  },
  reset(): void {
    memoryEvents.length = 0;
  },
};
