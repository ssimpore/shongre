export const SCHEDULED_RUNTIME_QUEUE_NAME = "scheduled-runtime";

export interface ScheduledJobPayload {
  schemaVersion: 1;
  environmentId: string;
  jobName: string;
  trigger: "scheduled" | "domain";
  correlationId?: string;
}
