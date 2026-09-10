/**
 * Prometheus-format metrics for the API and worker.
 *
 * Written here rather than pulled from a client library because the surface
 * needed is small and fixed — a handful of counters and two histograms — and
 * the exposition format is stable. Adding a dependency to emit six series is
 * not a trade this repository makes.
 *
 * Every series is deliberately low-cardinality: labels are route templates,
 * job names and status classes, never identifiers, paths with parameters, or
 * anything a caller controls. An unbounded label set is how a metrics endpoint
 * takes down the process it was meant to observe.
 */

type Labels = Record<string, string>;

const LABEL_VALUE_MAX = 120;

function escapeLabelValue(value: string): string {
  return value
    .slice(0, LABEL_VALUE_MAX)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');
}

function seriesKey(labels: Labels): string {
  const names = Object.keys(labels).sort();
  return names.map((name) => `${name}="${labels[name]}"`).join(",");
}

function renderLabels(key: string): string {
  return key ? `{${key}}` : "";
}

class Counter {
  private readonly values = new Map<string, number>();

  constructor(
    readonly name: string,
    readonly help: string,
  ) {}

  increment(labels: Labels = {}, amount = 1): void {
    if (!Number.isFinite(amount) || amount < 0) return;
    const key = seriesKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + amount);
  }

  render(): string {
    const lines = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} counter`,
    ];
    for (const [key, value] of this.values) {
      lines.push(`${this.name}${renderLabels(key)} ${value}`);
    }
    return lines.join("\n");
  }

  reset(): void {
    this.values.clear();
  }
}

class Histogram {
  private readonly buckets = new Map<string, number[]>();
  private readonly sums = new Map<string, number>();
  private readonly counts = new Map<string, number>();

  constructor(
    readonly name: string,
    readonly help: string,
    readonly bounds: readonly number[],
  ) {}

  observe(value: number, labels: Labels = {}): void {
    if (!Number.isFinite(value) || value < 0) return;
    const key = seriesKey(labels);
    let counts = this.buckets.get(key);
    if (!counts) {
      counts = new Array(this.bounds.length).fill(0);
      this.buckets.set(key, counts);
    }
    for (let index = 0; index < this.bounds.length; index += 1) {
      if (value <= this.bounds[index]) counts[index] += 1;
    }
    this.sums.set(key, (this.sums.get(key) ?? 0) + value);
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  render(): string {
    const lines = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} histogram`,
    ];
    for (const [key, counts] of this.buckets) {
      const withLe = (le: string) =>
        renderLabels(key ? `${key},le="${le}"` : `le="${le}"`);
      this.bounds.forEach((bound, index) => {
        lines.push(
          `${this.name}_bucket${withLe(String(bound))} ${counts[index]}`,
        );
      });
      lines.push(
        `${this.name}_bucket${withLe("+Inf")} ${this.counts.get(key) ?? 0}`,
      );
      lines.push(
        `${this.name}_sum${renderLabels(key)} ${this.sums.get(key) ?? 0}`,
      );
      lines.push(
        `${this.name}_count${renderLabels(key)} ${this.counts.get(key) ?? 0}`,
      );
    }
    return lines.join("\n");
  }

  reset(): void {
    this.buckets.clear();
    this.sums.clear();
    this.counts.clear();
  }
}

/**
 * Bucket bounds are chosen around the objectives the monitoring contract
 * states — p95 under 750 ms and p99 under 2 s — so the quantiles that matter
 * fall between bucket edges rather than on top of one.
 */
const HTTP_DURATION_BUCKETS = [
  0.025, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 2, 5, 10,
] as const;

const JOB_DURATION_BUCKETS = [0.1, 0.5, 1, 5, 15, 60, 300] as const;

const httpRequests = new Counter(
  "shongre_http_requests_total",
  "HTTP requests completed, by route template and status class.",
);
const httpDuration = new Histogram(
  "shongre_http_request_duration_seconds",
  "HTTP request duration in seconds, by route template.",
  HTTP_DURATION_BUCKETS,
);
const httpResponseBytes = new Counter(
  "shongre_http_response_bytes_total",
  "Bytes written in HTTP response bodies, by route template.",
);
const jobRuns = new Counter(
  "shongre_scheduled_job_runs_total",
  "Scheduled worker job executions, by job name and outcome.",
);
const jobDuration = new Histogram(
  "shongre_scheduled_job_duration_seconds",
  "Scheduled worker job duration in seconds, by job name.",
  JOB_DURATION_BUCKETS,
);
const notificationDeliveries = new Counter(
  "shongre_notification_deliveries_total",
  "Notification delivery attempts, by channel and outcome.",
);
const providerWebhooks = new Counter(
  "shongre_provider_webhook_events_total",
  "Provider webhook events received, by provider and outcome.",
);

const collectors = [
  httpRequests,
  httpDuration,
  httpResponseBytes,
  jobRuns,
  jobDuration,
  notificationDeliveries,
  providerWebhooks,
];

/** `2xx`, `4xx`… rather than the exact code, to keep the series bounded. */
function statusClass(statusCode: number): string {
  const bucket = Math.trunc(statusCode / 100);
  return bucket >= 1 && bucket <= 5 ? `${bucket}xx` : "unknown";
}

export const metrics = {
  recordHttpRequest(input: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
    responseBytes?: number;
  }): void {
    const labels = {
      method: escapeLabelValue(input.method.toUpperCase()),
      route: escapeLabelValue(input.route),
    };
    httpRequests.increment({
      ...labels,
      status: statusClass(input.statusCode),
    });
    httpDuration.observe(input.durationMs / 1_000, labels);
    if (input.responseBytes && input.responseBytes > 0) {
      httpResponseBytes.increment(labels, input.responseBytes);
    }
  },

  recordScheduledJob(input: {
    job: string;
    outcome: "succeeded" | "failed" | "skipped";
    durationMs: number;
  }): void {
    const job = escapeLabelValue(input.job);
    jobRuns.increment({ job, outcome: input.outcome });
    jobDuration.observe(input.durationMs / 1_000, { job });
  },

  recordNotificationDelivery(input: {
    channel: string;
    outcome: "delivered" | "retried" | "dead_lettered";
  }): void {
    notificationDeliveries.increment({
      channel: escapeLabelValue(input.channel),
      outcome: input.outcome,
    });
  },

  recordProviderWebhook(input: {
    provider: string;
    outcome: "processed" | "duplicate" | "ignored" | "failed";
  }): void {
    providerWebhooks.increment({
      provider: escapeLabelValue(input.provider),
      outcome: input.outcome,
    });
  },

  /** Prometheus text exposition for everything recorded so far. */
  render(buildInfo: {
    version: string;
    release: string;
    environment: string;
  }): string {
    const info = [
      "# HELP shongre_build_info Deployed build, as a constant series.",
      "# TYPE shongre_build_info gauge",
      `shongre_build_info{version="${escapeLabelValue(buildInfo.version)}",release="${escapeLabelValue(buildInfo.release)}",environment="${escapeLabelValue(buildInfo.environment)}"} 1`,
    ].join("\n");
    return [info, ...collectors.map((collector) => collector.render())]
      .filter((block) => block.split("\n").length > 2)
      .join("\n\n")
      .concat("\n");
  },

  /** Test seam. Never called by the running server. */
  reset(): void {
    for (const collector of collectors) collector.reset();
  },
};
