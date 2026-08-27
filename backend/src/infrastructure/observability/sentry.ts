import * as Sentry from "@sentry/node";
import { config } from "../../app/config/index.js";

let initialized = false;

export function initializeSentry(): void {
  if (
    initialized ||
    config.analyticsMode === "off" ||
    !config.analyticsProviders.sentry.enabled ||
    !config.analyticsProviders.sentry.dsn
  )
    return;
  Sentry.init({
    dsn: config.analyticsProviders.sentry.dsn,
    environment: config.environment.environment,
    release: config.release,
    tracesSampleRate: config.analyticsProviders.sentry.tracesSampleRate,
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.data;
        if (event.request.url) {
          try {
            event.request.url = new URL(event.request.url).pathname;
          } catch {
            event.request.url = String(event.request.url).split(/[?#]/, 1)[0];
          }
        }
      }
      return event;
    },
  });
  initialized = true;
}

export function captureServerException(
  error: unknown,
  context: { requestId?: string; operation?: string },
): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    scope.setTag("service", "backend");
    if (context.requestId) scope.setTag("request_id", context.requestId);
    if (context.operation) scope.setTag("operation", context.operation);
    Sentry.captureException(error);
  });
}
