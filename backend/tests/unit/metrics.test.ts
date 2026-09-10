import { beforeEach, describe, expect, it } from "vitest";
import { metrics } from "../../src/infrastructure/observability/metrics.js";

const BUILD = {
  version: "1.0.0",
  release: "abc123",
  environment: "test",
};

function seriesValue(output: string, prefix: string): number | undefined {
  const line = output
    .split("\n")
    .find((entry) => entry.startsWith(prefix) && !entry.startsWith("#"));
  return line ? Number(line.slice(line.lastIndexOf(" ") + 1)) : undefined;
}

beforeEach(() => {
  metrics.reset();
});

describe("metrics exposition", () => {
  it("always reports the deployed build", () => {
    const output = metrics.render(BUILD);
    expect(output).toContain(
      'shongre_build_info{version="1.0.0",release="abc123",environment="test"} 1',
    );
    expect(output.endsWith("\n")).toBe(true);
  });

  it("counts requests by route template and status class", () => {
    metrics.recordHttpRequest({
      method: "get",
      route: "/listings/:id",
      statusCode: 200,
      durationMs: 120,
      responseBytes: 4_096,
    });
    metrics.recordHttpRequest({
      method: "GET",
      route: "/listings/:id",
      statusCode: 204,
      durationMs: 80,
    });
    metrics.recordHttpRequest({
      method: "GET",
      route: "/listings/:id",
      statusCode: 404,
      durationMs: 15,
    });

    const output = metrics.render(BUILD);
    expect(
      seriesValue(
        output,
        'shongre_http_requests_total{method="GET",route="/listings/:id",status="2xx"}',
      ),
    ).toBe(2);
    expect(
      seriesValue(
        output,
        'shongre_http_requests_total{method="GET",route="/listings/:id",status="4xx"}',
      ),
    ).toBe(1);
    expect(
      seriesValue(
        output,
        'shongre_http_response_bytes_total{method="GET",route="/listings/:id"}',
      ),
    ).toBe(4_096);
  });

  it("places durations in cumulative buckets around the stated objectives", () => {
    for (const durationMs of [40, 300, 900, 3_000]) {
      metrics.recordHttpRequest({
        method: "GET",
        route: "/recherche",
        statusCode: 200,
        durationMs,
      });
    }

    const output = metrics.render(BUILD);
    const bucket = (le: string) =>
      seriesValue(
        output,
        `shongre_http_request_duration_seconds_bucket{method="GET",route="/recherche",le="${le}"}`,
      );
    // Cumulative: each bound counts everything at or below it.
    expect(bucket("0.05")).toBe(1);
    expect(bucket("0.5")).toBe(2);
    expect(bucket("1")).toBe(3);
    expect(bucket("+Inf")).toBe(4);
    expect(
      seriesValue(
        output,
        'shongre_http_request_duration_seconds_count{method="GET",route="/recherche"}',
      ),
    ).toBe(4);
  });

  it("keeps a hostile route label from breaking the exposition format", () => {
    metrics.recordHttpRequest({
      method: "GET",
      route: 'weird"\nroute',
      statusCode: 200,
      durationMs: 10,
    });

    const output = metrics.render(BUILD);
    expect(output).toContain('route="weird\\"\\nroute"');
    // One line per series: an unescaped newline would split it in two.
    expect(
      output
        .split("\n")
        .filter((line) => line.startsWith("shongre_http_requests_total{")),
    ).toHaveLength(1);
  });

  it("records scheduled jobs and notification deliveries by outcome", () => {
    metrics.recordScheduledJob({
      job: "listing_view_rollup",
      outcome: "succeeded",
      durationMs: 250,
    });
    metrics.recordScheduledJob({
      job: "listing_view_rollup",
      outcome: "skipped",
      durationMs: 2,
    });
    metrics.recordNotificationDelivery({
      channel: "email",
      outcome: "delivered",
    });
    metrics.recordNotificationDelivery({
      channel: "push",
      outcome: "dead_lettered",
    });

    const output = metrics.render(BUILD);
    expect(
      seriesValue(
        output,
        'shongre_scheduled_job_runs_total{job="listing_view_rollup",outcome="succeeded"}',
      ),
    ).toBe(1);
    expect(
      seriesValue(
        output,
        'shongre_scheduled_job_runs_total{job="listing_view_rollup",outcome="skipped"}',
      ),
    ).toBe(1);
    expect(
      seriesValue(
        output,
        'shongre_notification_deliveries_total{channel="push",outcome="dead_lettered"}',
      ),
    ).toBe(1);
  });

  it("omits collectors that have recorded nothing", () => {
    metrics.recordHttpRequest({
      method: "GET",
      route: "/",
      statusCode: 200,
      durationMs: 5,
    });
    const output = metrics.render(BUILD);
    expect(output).not.toContain("shongre_scheduled_job_runs_total");
    expect(output).toContain("shongre_http_requests_total");
  });

  it("ignores a negative or non-finite observation", () => {
    metrics.recordHttpRequest({
      method: "GET",
      route: "/",
      statusCode: 200,
      durationMs: Number.NaN,
    });
    const output = metrics.render(BUILD);
    expect(
      seriesValue(output, "shongre_http_request_duration_seconds_count{"),
    ).toBeUndefined();
  });
});
