import { consentService } from "../domains/consent/consent.service";

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
  occurredAt: string;
}

const memoryEvents: AnalyticsEventRecord[] = [];

/**
 * Small provider-neutral analytics boundary. The consent gate is intentional:
 * adding a real collector later must not create a period where the homepage
 * silently starts tracking before the visitor permits audience measurement.
 */
export const analyticsService = {
  track(
    name: MarketplaceAnalyticsEvent,
    payload: MarketplaceAnalyticsPayload = {},
  ): void {
    if (!consentService.hasConsent("analytics")) return;
    memoryEvents.push({ name, payload, occurredAt: new Date().toISOString() });
    if (memoryEvents.length > 100) memoryEvents.shift();
  },
  getRecentEvents(): AnalyticsEventRecord[] {
    return [...memoryEvents];
  },
  reset(): void {
    memoryEvents.length = 0;
  },
};
