import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from "@shongre/contracts/analytics";
import { analyticsClient } from "../analytics/analytics.client";

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
    analyticsClient.setMarketContext(context);
  },
  track<Name extends AnalyticsEventName>(
    name: Name,
    payload: AnalyticsEventProperties<Name> = {} as AnalyticsEventProperties<Name>,
  ): void {
    analyticsClient.track(name, payload);
  },
  getRecentEvents() {
    return analyticsClient.recentEvents().map((event) => ({
      ...event,
      payload: event.properties,
      country: event.context.countryCode,
      market: event.context.marketCode,
      locale: event.context.locale,
      currency: event.context.currency,
      domain: event.context.canonicalDomain,
      occurredAt: event.context.timestamp,
    }));
  },
  reset(): void {
    analyticsClient.clearMemory();
  },
};
