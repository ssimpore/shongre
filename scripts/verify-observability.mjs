#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function confirmed(value) {
  return value === true || value === "true";
}

function httpsReference(value, name, allowInsecure) {
  const url = new URL(value);
  if (!allowInsecure && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS`);
  }
  if (url.username || url.password) {
    throw new Error(`${name} must not embed credentials`);
  }
  return url.toString();
}

export async function verifyObservability(overrides = {}) {
  const allowInsecure = Boolean(overrides.allowInsecure);
  const api = new URL(
    httpsReference(
      overrides.apiUrl || process.env.OBSERVABILITY_API_URL || "",
      "OBSERVABILITY_API_URL",
      allowInsecure,
    ),
  );
  const expectedEnvironment =
    overrides.expectedEnvironment ||
    process.env.OBSERVABILITY_EXPECTED_ENVIRONMENT;
  const expectedRelease =
    overrides.expectedRelease || process.env.OBSERVABILITY_EXPECTED_RELEASE;
  if (!expectedEnvironment || !/^[0-9a-f]{40}$/.test(expectedRelease || "")) {
    throw new Error(
      "OBSERVABILITY_EXPECTED_ENVIRONMENT and a full OBSERVABILITY_EXPECTED_RELEASE are required",
    );
  }
  const references = {
    dashboard: httpsReference(
      overrides.dashboardUrl || process.env.OBSERVABILITY_DASHBOARD_URL || "",
      "OBSERVABILITY_DASHBOARD_URL",
      allowInsecure,
    ),
    alertPolicy: httpsReference(
      overrides.alertPolicyUrl ||
        process.env.OBSERVABILITY_ALERT_POLICY_URL ||
        "",
      "OBSERVABILITY_ALERT_POLICY_URL",
      allowInsecure,
    ),
    onCallRunbook: httpsReference(
      overrides.onCallRunbookUrl ||
        process.env.OBSERVABILITY_ON_CALL_RUNBOOK_URL ||
        "",
      "OBSERVABILITY_ON_CALL_RUNBOOK_URL",
      allowInsecure,
    ),
  };
  const confirmations = {
    logDrain: confirmed(
      overrides.logDrainConfirmed ??
        process.env.OBSERVABILITY_LOG_DRAIN_CONFIRMED,
    ),
    traceLookup: confirmed(
      overrides.traceLookupConfirmed ??
        process.env.OBSERVABILITY_TRACE_LOOKUP_CONFIRMED,
    ),
    alertDelivery: confirmed(
      overrides.alertDeliveryConfirmed ??
        process.env.OBSERVABILITY_ALERT_DELIVERY_CONFIRMED,
    ),
    onCall: confirmed(
      overrides.onCallConfirmed ?? process.env.OBSERVABILITY_ON_CALL_CONFIRMED,
    ),
  };
  if (Object.values(confirmations).some((value) => !value)) {
    throw new Error(
      "Log drain, trace lookup, alert delivery, and on-call confirmations are all required",
    );
  }

  const traceId = `release-probe-${randomUUID()}`;
  const probes = [];
  for (const path of ["/livez", "/readyz"]) {
    const startedAt = performance.now();
    const response = await fetch(new URL(path, api), {
      headers: { "X-Request-Id": traceId, "X-Shongre-Market": "FR" },
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json();
    if (
      !response.ok ||
      response.headers.get("x-request-id") !== traceId ||
      payload.environment !== expectedEnvironment ||
      payload.release !== expectedRelease
    ) {
      throw new Error(
        `${path} did not preserve the release observability probe`,
      );
    }
    probes.push({
      path,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  const evidence = {
    schemaVersion: 1,
    result: "PASS",
    scope: "PLATFORM_GLOBAL",
    environment: expectedEnvironment,
    release: expectedRelease,
    verifiedAt: new Date().toISOString(),
    traceId,
    probes,
    checks: {
      request_id_propagation: "PASS",
      log_drain: "PASS",
      trace_lookup: "PASS",
      alert_delivery: "PASS",
      on_call: "PASS",
    },
    references,
  };
  const evidencePath =
    overrides.evidencePath || process.env.OBSERVABILITY_EVIDENCE_FILE;
  if (!evidencePath) throw new Error("OBSERVABILITY_EVIDENCE_FILE is required");
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  return evidence;
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  verifyObservability()
    .then((evidence) => {
      console.log(
        `Observability evidence passed for ${evidence.environment} release ${evidence.release}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
