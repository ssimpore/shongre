import type { Metric } from "web-vitals";
import { analyticsClient } from "./analytics.client";

let initialized = false;

function report(metric: Metric): void {
  if (
    metric.name !== "LCP" &&
    metric.name !== "CLS" &&
    metric.name !== "INP" &&
    metric.name !== "TTFB"
  ) {
    return;
  }
  analyticsClient.track("web_vital_measured", {
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    route: window.location.pathname,
  });
}

/**
 * Installs one browser-performance observer set for the lifetime of the app.
 * It is called only after audience-measurement consent. The analytics client
 * repeats the consent check at emission time, so withdrawing consent also
 * disables callbacks already registered by the web-vitals library.
 */
export function startWebVitals(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  void import("web-vitals").then(({ onCLS, onINP, onLCP, onTTFB }) => {
    onCLS(report);
    onINP(report);
    onLCP(report);
    onTTFB(report);
  });
}
