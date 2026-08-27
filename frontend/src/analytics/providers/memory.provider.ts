import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import type { AnalyticsProvider } from "../analytics-provider";

const MAX_EVENTS = 200;

export class MemoryAnalyticsProvider implements AnalyticsProvider {
  readonly id = "memory" as const;
  readonly consentCategory = "analytics" as const;
  private events: AnalyticsEventEnvelope[] = [];

  isConfigured(): boolean {
    return true;
  }
  async initialize(): Promise<void> {}
  capture(event: AnalyticsEventEnvelope): void {
    this.events.push(structuredClone(event));
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }
  async identify(): Promise<void> {}
  async reset(): Promise<void> {}
  async shutdown(): Promise<void> {}
  recent(): AnalyticsEventEnvelope[] {
    return structuredClone(this.events);
  }
  clear(): void {
    this.events = [];
  }
}
