/**
 * Central production-safe error reporting boundary.
 *
 * Shongre has no remote telemetry integration yet. Development diagnostics
 * stay local, while production avoids leaking raw exceptions to the console.
 * A future reporter must be wired here and pass the consent gate first.
 */
class TelemetryService {
  captureException(error: unknown, context: string): void {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${context}]`, error);
    }
  }
}

export const telemetryService = new TelemetryService();
