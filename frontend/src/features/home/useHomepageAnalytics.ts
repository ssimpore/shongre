import { useEffect, useRef } from "react";
import type { AnalyticsEventName } from "@shongre/contracts/analytics";
import { analyticsService } from "../../services/analytics.service";

type HomepageAnalyticsPayload = {
  market: string;
  sectionKey: string;
  topicType?: string;
  categorySlug?: string;
  offerType?: string;
  position?: number;
  deviceClass?: "mobile" | "tablet" | "desktop";
};

const deviceClass = (): HomepageAnalyticsPayload["deviceClass"] => {
  if (typeof window === "undefined") return undefined;
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
};

export function trackHomepageEvent(
  name: AnalyticsEventName,
  payload: Omit<HomepageAnalyticsPayload, "deviceClass">,
): void {
  analyticsService.track(name, { ...payload, deviceClass: deviceClass() });
}

export function useHomepageViewEvent(
  name: AnalyticsEventName,
  payload: Omit<HomepageAnalyticsPayload, "deviceClass">,
) {
  const ref = useRef<HTMLElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasTracked.current) return;
    if (typeof IntersectionObserver === "undefined") {
      hasTracked.current = true;
      trackHomepageEvent(name, payload);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasTracked.current) return;
        hasTracked.current = true;
        trackHomepageEvent(name, payload);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [name, payload.market, payload.sectionKey]);

  return ref;
}
