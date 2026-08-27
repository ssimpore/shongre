import type { PublicRuntimeConfig } from "../platform/runtime-config/public-runtime-config";
import { safePath } from "./privacy";

class SentryClient {
  private sdk: typeof import("@sentry/browser") | null = null;
  private starting: Promise<void> | null = null;

  configure(config: PublicRuntimeConfig, permitted: boolean): Promise<void> {
    if (
      !permitted ||
      config.analytics.mode === "off" ||
      !config.analytics.sentry.enabled ||
      !config.analytics.sentry.dsn
    ) {
      this.sdk?.close(1_000);
      this.sdk = null;
      this.starting = null;
      return Promise.resolve();
    }
    if (this.sdk) return Promise.resolve();
    if (this.starting) return this.starting;
    this.starting = import("@sentry/browser").then((sdk) => {
      sdk.init({
        dsn: config.analytics.sentry.dsn,
        environment: config.appEnvironment,
        release: config.release,
        tracesSampleRate: config.analytics.sentry.tracesSampleRate,
        integrations: [sdk.browserTracingIntegration()],
        sendDefaultPii: false,
        beforeSend(event) {
          delete event.user;
          if (event.request?.url)
            event.request.url = safePath(event.request.url);
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
            delete event.request.data;
          }
          return event;
        },
        beforeBreadcrumb(breadcrumb) {
          if (breadcrumb.category === "ui.input") return null;
          if (breadcrumb.data?.url) {
            breadcrumb.data.url = safePath(String(breadcrumb.data.url));
          }
          return breadcrumb;
        },
      });
      this.sdk = sdk;
    });
    return this.starting;
  }

  captureException(
    error: unknown,
    context: string,
    technical?: { requestId?: string; route?: string; statusCode?: number },
  ): void {
    this.sdk?.withScope((scope) => {
      scope.setTag("shongre.context", context);
      scope.setTag("service", "frontend");
      if (technical?.requestId) scope.setTag("request_id", technical.requestId);
      if (technical?.route) scope.setTag("route", safePath(technical.route));
      if (technical?.statusCode)
        scope.setTag("status_code", technical.statusCode);
      this.sdk?.captureException(error);
    });
  }
}

export const sentryClient = new SentryClient();
