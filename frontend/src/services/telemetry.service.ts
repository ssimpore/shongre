import { sentryClient } from "../analytics/sentry.client";

/** Central, consent-gated production-safe error reporting boundary. */
class TelemetryService {
  captureException(
    error: unknown,
    context: string,
    technical?: { requestId?: string; route?: string; statusCode?: number },
  ): void {
    sentryClient.captureException(error, context, technical);
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${context}]`, error);
    }
  }
}

export const telemetryService = new TelemetryService();
