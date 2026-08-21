export type AnalyticsConsent = "not_asked" | "refused" | "granted";

let consent: AnalyticsConsent = "not_asked";

export const analyticsService = {
  setConsent(next: AnalyticsConsent) {
    consent = next;
  },
  async track(
    _event: string,
    _properties?: Record<string, string | number | boolean>,
  ): Promise<void> {
    if (consent !== "granted") return;
    // No analytics provider is installed. Keeping this gate first prevents a
    // future SDK from collecting during an unconsented window.
  },
};
