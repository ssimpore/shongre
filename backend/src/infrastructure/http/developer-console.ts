import { brandDocumentReverseLogoDataUri } from "@shongre/brand/document";
import { brand } from "@shongre/brand";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import {
  SHONGRE_APPLICATION_IDS,
  type ShongreApplicationId,
} from "@shongre/contracts/applications";
import type { AppEnvironment } from "@shongre/contracts/environment";
import { config } from "../../app/config/index.js";
import { openApiDocument } from "./openapi-documentation.js";
import { icon, type IconName } from "./developer-console-icons.js";
import { developerConsoleScript } from "./developer-console-script.js";
import { developerConsoleStyles } from "./developer-console-styles.js";
import {
  ACCESS_LABELS,
  API_DOMAINS,
  buildConsoleContract,
  domainAccessLabel,
  type ApiSpecification,
  type ConsoleAccessLevel,
  type ConsoleContract,
  type ConsoleOperation,
} from "./developer-console-model.js";

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

/** Serializes server data for the inline island without allowing an early tag close. */
function jsonIsland(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const ENVIRONMENT_LABELS: Readonly<Record<AppEnvironment, string>> = {
  local: "Local",
  test: "Test",
  preview: "Preview",
  development: "Development",
  staging: "Staging",
  production: "Production",
};

const APPLICATION_PRESENTATION: Readonly<
  Record<
    ShongreApplicationId,
    { name: string; summary: string; icon: IconName }
  >
> = {
  marketplace: {
    name: "Marketplace",
    summary: "Browse, publish and transact",
    icon: "store",
  },
  solutions: {
    name: "Solutions",
    summary: "Business applications",
    icon: "layout-grid",
  },
  prospects: {
    name: "Prospects",
    summary: "CRM workspace",
    icon: "users-round",
  },
  facturation: {
    name: "Facturation",
    summary: "Invoicing",
    icon: "file-text",
  },
};

const DOMAIN_ICONS: Readonly<Record<string, IconName>> = {
  identity: "user-round",
  listings: "search",
  markets: "globe",
  orders: "shopping-cart",
  payments: "credit-card",
  messaging: "message-square",
  trust: "shield",
  media: "image",
  crm: "users-round",
  verticals: "building-2",
  business: "chart-column",
  administration: "lock",
};

const ACCESS_TONES: Readonly<Record<ConsoleAccessLevel, string>> = {
  public: "tone-ok",
  authenticated: "tone-info",
  staff: "tone-staff",
};

export interface DeveloperConsoleRuntime {
  environment: AppEnvironment;
  environmentLabel: string;
  apiOrigin: string;
  apiPrefix: string;
  apiBaseUrl: string;
  serviceVersion: string;
  applicationUrls: Readonly<Record<ShongreApplicationId, string | null>>;
  marketplaceUrl: string | null;
  requestDeadlineMs: number;
}

export function developerConsoleRuntime(): DeveloperConsoleRuntime {
  const apiOrigin = new URL(config.publicApiUrl).origin;
  return {
    environment: config.environment.environment,
    environmentLabel: ENVIRONMENT_LABELS[config.environment.environment],
    apiOrigin,
    apiPrefix: config.apiPrefix,
    apiBaseUrl: `${apiOrigin}${config.apiPrefix}`,
    serviceVersion: config.version,
    applicationUrls: config.applicationUrls,
    marketplaceUrl: config.applicationUrls.marketplace,
    requestDeadlineMs:
      SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.frontend.apiRequestTimeoutMs,
  };
}

/**
 * The reverse brand mark is embedded once as an SVG symbol; every other
 * appearance references it, so the document carries the artwork a single time.
 */
const BRAND_SYMBOL_ID = "brand-signature";

function brandSprite(): string {
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><symbol id="${BRAND_SYMBOL_ID}" viewBox="0 0 240 61"><image href="${brandDocumentReverseLogoDataUri}" width="240" height="61" /></symbol></svg>`;
}

function brandMark(label: string | null, className: string): string {
  const labelling = label
    ? `role="img" aria-label="${escapeHtml(label)}"`
    : `aria-hidden="true" focusable="false"`;
  return `<svg class="${className}" viewBox="0 0 240 61" ${labelling}><use href="#${BRAND_SYMBOL_ID}" /></svg>`;
}

function methodTag(method: string): string {
  return `<span class="method-tag method-${escapeHtml(method.toLowerCase())}">${escapeHtml(method)}</span>`;
}

function accessPill(access: ConsoleAccessLevel): string {
  const lock = access === "staff" ? `${icon("lock", "icon-sm")} ` : "";
  return `<span class="pill ${ACCESS_TONES[access]}">${lock}${escapeHtml(ACCESS_LABELS[access])}</span>`;
}

function endpointRow(operation: ConsoleOperation): string {
  return `<tr><td>${methodTag(operation.method)}</td><td class="path"><code>${escapeHtml(operation.requestPath)}</code></td><td class="purpose">${escapeHtml(operation.purpose)}</td><td>${accessPill(operation.access)}</td></tr>`;
}

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  current?: boolean;
  external?: boolean;
  restricted?: boolean;
}

function navLink(item: NavItem): string {
  const attributes = [
    `class="nav-link"`,
    `href="${escapeHtml(item.href)}"`,
    item.current ? `aria-current="page"` : "",
    item.external ? `target="_blank" rel="noreferrer"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const suffix = item.restricted
    ? `<span class="nav-lock">${icon("lock", "icon-sm")}<span class="sr-only">Restricted</span></span>`
    : item.external
      ? `<span class="nav-lock">${icon("external-link", "icon-sm")}<span class="sr-only">Opens in a new tab</span></span>`
      : "";
  return `<li><a ${attributes}>${icon(item.icon)}<span>${escapeHtml(item.label)}</span>${suffix}</a></li>`;
}

function sidebar(runtime: DeveloperConsoleRuntime): string {
  const administrationHref = runtime.marketplaceUrl
    ? new URL("/admin", `${runtime.marketplaceUrl}/`).toString()
    : "#operations";
  const groups: Array<{ title?: string; items: NavItem[] }> = [
    {
      items: [
        { label: "Overview", href: "#overview", icon: "house", current: true },
        {
          label: "API reference",
          href: "/api/docs",
          icon: "code-xml",
          external: true,
        },
        { label: "Playground", href: "#playground", icon: "circle-play" },
        { label: "Authentication", href: "#authentication", icon: "key-round" },
        { label: "Markets & currencies", href: "#markets", icon: "globe" },
        { label: "Webhooks", href: "#webhooks", icon: "webhook" },
      ],
    },
    {
      title: "Platform",
      items: [
        { label: "Service health", href: "#health", icon: "activity" },
        { label: "Applications", href: "#applications", icon: "layout-grid" },
        { label: "Contract versioning", href: "#changelog", icon: "history" },
      ],
    },
    {
      title: "Internal",
      items: [
        {
          label: "Operations",
          href: "#operations",
          icon: "lock",
          restricted: true,
        },
        {
          label: "Administration",
          href: administrationHref,
          icon: "lock",
          restricted: true,
          external: Boolean(runtime.marketplaceUrl),
        },
      ],
    },
  ];
  return `<nav id="sidebar" class="sidebar" aria-label="Developer console sections">
  <button id="drawer-close" class="drawer-close" type="button">
    ${icon("x", "icon-sm")}<span>Close navigation</span>
  </button>
  ${groups
    .map((group, index) => {
      const labelId = `nav-group-${index}`;
      return `<div class="nav-group">${group.title ? `<p class="nav-title" id="${labelId}">${escapeHtml(group.title)}</p>` : ""}<ul${group.title ? ` aria-labelledby="${labelId}"` : ""}>${group.items.map(navLink).join("")}</ul></div>`;
    })
    .join("")}
  <div class="nav-note">
    <p class="nav-note-title">Build with Shongre</p>
    <p>The OpenAPI 3.1 contract is the single source for every client.</p>
    <a href="/api/openapi.json">Download the contract ${icon("download", "icon-sm")}</a>
  </div>
</nav>`;
}

function topbar(runtime: DeveloperConsoleRuntime): string {
  const signInHref = runtime.marketplaceUrl
    ? new URL("/connexion", `${runtime.marketplaceUrl}/`).toString()
    : null;
  return `<header class="topbar">
  <button id="drawer-toggle" class="drawer-toggle" type="button" aria-expanded="false" aria-controls="sidebar">
    ${icon("menu")}<span class="sr-only">Show the console navigation</span>
  </button>
  <div class="topbar-brand">
    <a class="brand-mark" href="#overview" aria-label="${escapeHtml(brand.signature)} developer platform">
      ${brandMark(null, "brand-logo")}
    </a>
    <a class="topbar-kicker" href="#overview">Developers</a>
  </div>
  <div class="topbar-search">
    <div class="search-field">
      ${icon("search", "icon-sm")}
      <label class="sr-only" for="docs-search">Search documented operations</label>
      <input id="docs-search" type="search" placeholder="Search operations, paths, domains…" autocomplete="off" data-endpoint-search />
      <kbd>⌘K</kbd>
    </div>
  </div>
  <div class="topbar-meta">
    <span class="meta-chip" title="The versioned business prefix is fixed at ${escapeHtml(runtime.apiPrefix)}">${icon("layers", "icon-sm")}API v1</span>
    <span class="meta-chip"><span class="dot"></span>${escapeHtml(runtime.environmentLabel)}</span>
    ${
      signInHref
        ? `<a class="signin" href="${escapeHtml(signInHref)}">Sign in</a>`
        : `<span class="meta-chip">Sign-in origin not configured</span>`
    }
  </div>
</header>`;
}

function hero(
  runtime: DeveloperConsoleRuntime,
  contract: ConsoleContract,
): string {
  return `<section id="overview" class="section" style="margin-top:1.25rem" aria-labelledby="overview-title">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#overview">Developers</a>${icon("chevron-right", "icon-sm")}<span aria-current="page">Overview</span>
  </nav>
  <div class="hero">
    <div class="hero-main">
      <div class="eyebrow">
        <span class="eyebrow-label">${escapeHtml(brand.signature)} platform</span>
        <span class="pill tone-idle">Contract ${escapeHtml(contract.contractVersion)} · ${contract.operations.length} operations</span>
      </div>
      <h1 id="overview-title">Backend API</h1>
      <p class="hero-lead">One API for every Shongre experience.</p>
      <p class="hero-sub">Discover documented endpoints, run public discovery requests and explore the marketplace platform. Every operation on this page is derived from the canonical OpenAPI 3.1 contract.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/api/docs">Explore API reference ${icon("arrow-right", "icon-sm")}</a>
        <a class="btn" href="/api/openapi.json" download="shongre-openapi.json">${icon("download", "icon-sm")}Download OpenAPI</a>
      </div>
    </div>
    <div class="hero-side">
      <div class="hero-status">
        <span id="hero-status" class="pill pill-lg tone-idle"><span class="dot"></span><span data-status-text>Checking…</span></span>
        <span class="caption">${escapeHtml(runtime.environmentLabel)} environment</span>
      </div>
      <div>
        <span class="field-label" id="base-url-label">Base URL (${escapeHtml(runtime.environmentLabel.toLowerCase())} environment)</span>
        <div class="copy-row">
          <code id="base-url" aria-labelledby="base-url-label">${escapeHtml(runtime.apiBaseUrl)}</code>
          <button class="icon-btn" type="button" data-copy-target="#base-url" data-copy-label="Base URL">
            ${icon("copy", "icon-sm")}<span class="sr-only">Copy the base URL</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function statTile(input: {
  iconName: IconName;
  label: string;
  valueId?: string;
  value: string;
  noteId?: string;
  note: string;
}): string {
  return `<div class="panel stat">
  <span class="stat-icon">${icon(input.iconName)}</span>
  <span class="stat-body">
    <span class="stat-label">${escapeHtml(input.label)}</span>
    <span class="stat-value"${input.valueId ? ` id="${input.valueId}"` : ""}>${input.value}</span>
    <span class="stat-note"${input.noteId ? ` id="${input.noteId}"` : ""}>${escapeHtml(input.note)}</span>
  </span>
</div>`;
}

function runtimeOverview(
  runtime: DeveloperConsoleRuntime,
  contract: ConsoleContract,
): string {
  return `<section class="section" aria-labelledby="runtime-title">
  <div class="section-head">
    <div>
      <h2 id="runtime-title">Runtime overview</h2>
      <p>Live probes and request timings measured by this browser session. Shongre does not publish platform-wide traffic aggregates on a public endpoint.</p>
    </div>
  </div>
  <div class="grid grid-4">
    ${statTile({ iconName: "activity", label: "API status", valueId: "stat-status", value: `<span class="dot"></span>Checking…`, note: "From GET /livez" })}
    ${statTile({ iconName: "clock", label: "Response time", valueId: "stat-latency", value: "—", noteId: "stat-latency-note", note: "Awaiting the first request" })}
    ${statTile({ iconName: "gauge", label: "Success rate", valueId: "stat-success", value: "—", noteId: "stat-success-note", note: "Awaiting the first request" })}
    ${statTile({ iconName: "layers", label: "Contract version", value: escapeHtml(contract.contractVersion), note: `API v1 · service ${escapeHtml(runtime.serviceVersion)}` })}
  </div>
</section>`;
}

function activityAndHealth(): string {
  const healthRow = (key: string, label: string, note: string) =>
    `<li class="health-row" data-health="${key}">
      <span class="health-name"><span class="dot tone-idle" data-health-dot></span>${escapeHtml(label)}</span>
      <span class="health-state tone-idle" data-health-state>Checking…</span>
      <span class="sr-only">${escapeHtml(note)}</span>
    </li>`;
  return `<div class="grid grid-activity section" id="health">
  <section class="panel panel-activity" aria-labelledby="activity-title">
    <div class="panel-head">
      <div>
        <h3 id="activity-title">Session request activity</h3>
        <p class="stat-note">Requests this console issued from your browser</p>
      </div>
      <span class="pill tone-idle"><span id="activity-total">0</span>&nbsp;requests</span>
    </div>
    <p id="activity-empty" class="chart-empty">No request yet. Health probes and playground requests are plotted here as they complete.</p>
    <svg id="activity-chart" class="chart" role="img" viewBox="0 0 600 160" hidden aria-label="Response time chart"></svg>
    <p class="chart-legend">${icon("circle-alert", "icon-sm")}Response time in milliseconds, oldest to latest. Server-side traffic volume is not exposed publicly.</p>
  </section>
  <section class="panel" aria-labelledby="health-title">
    <div class="panel-head">
      <h3 id="health-title">Service health</h3>
      <button id="health-refresh" class="icon-btn" type="button">${icon("refresh-cw", "icon-sm")}Refresh<span class="sr-only"> service health</span></button>
    </div>
    <ul class="health-list">
      ${healthRow("runtime", "API runtime", "Reported by the liveness probe")}
      ${healthRow("database", "Database", "Reported by the readiness probe")}
      ${healthRow("queue", "Queue transport", "Reported by the readiness probe")}
    </ul>
    <p id="health-message" class="stat-note" role="status" aria-live="polite" style="margin-top:0.625rem">Checking the public probes…</p>
    <p class="stat-note" style="margin-top:0.375rem">Worker execution health is an authorized operational signal and is deliberately absent from the public readiness projection.</p>
    <div class="health-foot">
      <span>Health endpoints:</span>
      <button class="probe-btn" type="button" data-probe="/livez"><span class="method">GET</span> /livez</button>
      <button class="probe-btn" type="button" data-probe="/readyz"><span class="method">GET</span> /readyz</button>
    </div>
  </section>
</div>`;
}

function applications(runtime: DeveloperConsoleRuntime): string {
  const cards = SHONGRE_APPLICATION_IDS.map((applicationId) => {
    const presentation = APPLICATION_PRESENTATION[applicationId];
    const href = runtime.applicationUrls[applicationId];
    const inner = `<div class="card-top">
      <span class="card-icon">${icon(presentation.icon)}</span>
      <span>
        <span class="card-title">${escapeHtml(presentation.name)}</span>
        <span class="card-text" style="display:block">${escapeHtml(presentation.summary)}</span>
      </span>
    </div>`;
    if (!href) {
      return `<div class="card card-disabled">${inner}<span class="card-text">Origin not configured in this environment.</span></div>`;
    }
    return `<a class="card" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${inner}<span class="card-action">Open app ${icon("external-link", "icon-sm")}</span></a>`;
  }).join("");
  return `<section id="applications" class="section" aria-labelledby="applications-title">
  <div class="section-head">
    <div>
      <h2 id="applications-title">Connected applications</h2>
      <p>Each application resolves through its configured origin for this environment.</p>
    </div>
  </div>
  <div class="grid grid-4">${cards}</div>
</section>`;
}

function playground(
  runtime: DeveloperConsoleRuntime,
  contract: ConsoleContract,
): string {
  const options = contract.playgroundOperations
    .map(
      (operation) =>
        `<option value="${escapeHtml(operation.operationId)}">${escapeHtml(operation.label)}</option>`,
    )
    .join("");
  const steps = [
    {
      title: "Choose a documented operation",
      body: "Every option is a public discovery read declared in the contract.",
    },
    {
      title: "Review access requirements",
      body: "Parameters, required headers and access level come from the operation itself.",
    },
    {
      title: "Send and inspect the response",
      body: `Requests run same-origin without credentials and stop after ${Math.round(runtime.requestDeadlineMs / 1000)} seconds.`,
    },
  ];
  return `<section id="playground" class="section" aria-labelledby="playground-title">
  <div class="section-head">
    <div>
      <h2 id="playground-title">Make your first request</h2>
      <p>Run a real request against ${escapeHtml(runtime.apiBaseUrl)} and read the response.</p>
    </div>
  </div>
  <div class="grid grid-request">
    <div class="panel">
      <ol class="steps">
        ${steps
          .map(
            (step, index) =>
              `<li class="step"><span class="step-index">0${index + 1}</span><span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.body)}</p></span></li>`,
          )
          .join("")}
      </ol>
      <div class="playground-form" style="margin-top:1rem">
        <div class="control">
          <label class="field-label" for="playground-operation">Operation</label>
          <div class="select-wrap">
            <select id="playground-operation" class="select">${options}</select>
            ${icon("chevron-down", "icon-sm")}
          </div>
          <small id="playground-access">Public discovery operation.</small>
        </div>
        <div id="playground-parameters" class="param-grid"></div>
        <div class="playground-actions">
          <button id="playground-send" class="btn btn-primary btn-sm" type="button">${icon("circle-play", "icon-sm")}Send request</button>
          <button id="playground-cancel" class="btn btn-sm" type="button" hidden>${icon("x", "icon-sm")}Cancel</button>
          <span class="status-note">Authenticated and mutating operations stay behind the platform's own sign-in, CSRF and authorization checks.</span>
        </div>
      </div>
    </div>
    <div class="panel console">
      <div class="tabs" role="tablist" aria-label="Request and response" data-tab-group>
        <button class="tab" role="tab" id="tab-curl" aria-controls="panel-curl" aria-selected="true" tabindex="0">cURL</button>
        <button class="tab" role="tab" id="tab-js" aria-controls="panel-js" aria-selected="false" tabindex="-1">JavaScript</button>
        <button class="tab" role="tab" id="tab-response" aria-controls="panel-response" aria-selected="false" tabindex="-1">Response</button>
      </div>
      <div id="panel-curl" role="tabpanel" aria-labelledby="tab-curl" style="padding-top:0.75rem">
        <div class="response-head">
          <span class="stat-note">Copy this into a terminal</span>
          <button class="icon-btn" style="margin-left:auto" type="button" data-copy-target="#snippet-curl" data-copy-label="cURL command">${icon("copy", "icon-sm")}Copy<span class="sr-only"> the cURL command</span></button>
        </div>
        <pre class="code" tabindex="0" role="region" aria-label="cURL command"><code id="snippet-curl"></code></pre>
      </div>
      <div id="panel-js" role="tabpanel" aria-labelledby="tab-js" style="padding-top:0.75rem" hidden>
        <div class="response-head">
          <span class="stat-note">Browser and Node 18+ fetch</span>
          <button class="icon-btn" style="margin-left:auto" type="button" data-copy-target="#snippet-js" data-copy-label="JavaScript snippet">${icon("copy", "icon-sm")}Copy<span class="sr-only"> the JavaScript snippet</span></button>
        </div>
        <pre class="code" tabindex="0" role="region" aria-label="JavaScript snippet"><code id="snippet-js"></code></pre>
      </div>
      <div id="panel-response" role="tabpanel" aria-labelledby="tab-response" style="padding-top:0.75rem" hidden>
        <div class="response-head">
          <span id="response-status" class="pill tone-idle">Not sent</span>
          <span id="response-duration" class="stat-note"></span>
          <button id="response-copy" class="icon-btn" style="margin-left:auto" type="button" data-copy-target="#response-body" data-copy-label="Response body" hidden>${icon("copy", "icon-sm")}Copy<span class="sr-only"> the response body</span></button>
        </div>
        <pre class="code code-scroll" tabindex="0" role="region" aria-label="Response body"><code id="response-body">Send a request to see the response.</code></pre>
      </div>
    </div>
  </div>
</section>`;
}

function domains(contract: ConsoleContract): string {
  const cards = contract.domains
    .map((domain) => {
      const tone =
        domain.access.length === 1
          ? ACCESS_TONES[domain.access[0]]
          : "tone-idle";
      return `<a class="card" href="/api/docs#domain-${escapeHtml(domain.id)}">
      <div class="card-top">
        <span class="card-icon">${icon(DOMAIN_ICONS[domain.id])}</span>
        <span>
          <span class="card-title">${escapeHtml(domain.label)}</span>
          <span class="card-text" style="display:block">${escapeHtml(domain.description)}</span>
        </span>
      </div>
      <span class="card-meta">
        <span class="pill ${tone}">${escapeHtml(domainAccessLabel(domain.access))}</span>
        <span class="pill tone-idle">${domain.operationCount} operations</span>
      </span>
    </a>`;
    })
    .join("");
  return `<section id="domains" class="section" aria-labelledby="domains-title">
  <div class="section-head">
    <div>
      <h2 id="domains-title">Explore API domains</h2>
      <p>Reader-facing groups over the contract's own tags. Counts and access levels are derived from the specification.</p>
    </div>
    <a class="section-link" href="/api/docs">View full reference ${icon("arrow-right", "icon-sm")}</a>
  </div>
  <div class="grid grid-3">${cards}</div>
</section>`;
}

function endpoints(contract: ConsoleContract): string {
  const domainOptions = API_DOMAINS.map(
    (domain) =>
      `<option value="${escapeHtml(domain.id)}">${escapeHtml(domain.label)}</option>`,
  ).join("");
  const filters = (["all", "public", "authenticated", "staff"] as const)
    .map(
      (value) =>
        `<button type="button" data-access-filter="${value}" aria-pressed="${value === "all"}">${value === "all" ? "All" : escapeHtml(ACCESS_LABELS[value])}</button>`,
    )
    .join("");
  return `<section id="endpoints" class="section" aria-labelledby="endpoints-title">
  <div class="section-head">
    <div>
      <h2 id="endpoints-title">Essential endpoints</h2>
      <p>Search all ${contract.operations.length} documented operations, or start from the essentials.</p>
    </div>
    <div class="filters">
      <div class="search-field" style="width:16rem">
        ${icon("list-filter", "icon-sm")}
        <label class="sr-only" for="endpoint-filter">Filter endpoints</label>
        <input id="endpoint-filter" type="search" placeholder="Filter endpoints…" autocomplete="off" data-endpoint-search />
      </div>
      <div class="select-wrap">
        <label class="sr-only" for="endpoint-domain">Filter by domain</label>
        <select id="endpoint-domain" class="select" style="width:auto">
          <option value="all">All domains</option>
          ${domainOptions}
        </select>
        ${icon("chevron-down", "icon-sm")}
      </div>
      <div class="segmented" role="group" aria-label="Filter by access level">${filters}</div>
    </div>
  </div>
  <div class="table-wrap" tabindex="0" role="region" aria-labelledby="endpoints-title">
    <table>
      <caption class="sr-only">Documented operations with their method, path, purpose and access level</caption>
      <thead>
        <tr>
          <th scope="col">Method</th>
          <th scope="col">Endpoint</th>
          <th scope="col">Purpose</th>
          <th scope="col">Access</th>
        </tr>
      </thead>
      <tbody id="endpoint-rows">${contract.essentialOperations.map(endpointRow).join("")}</tbody>
    </table>
  </div>
  <div class="table-foot">
    <span id="endpoint-count" role="status" aria-live="polite">Showing ${contract.essentialOperations.length} essential operations of ${contract.operations.length} documented.</span>
    <a class="section-link" href="/api/docs">Full operation reference ${icon("arrow-right", "icon-sm")}</a>
  </div>
</section>`;
}

function integration(runtime: DeveloperConsoleRuntime): string {
  const fact = (label: string, value: string) =>
    `<li class="fact fact-pair"><span class="fact-key">${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></li>`;
  const check = (value: string) =>
    `<li class="fact">${icon("check", "icon-sm")}<span>${escapeHtml(value)}</span></li>`;
  const administrationHref = runtime.marketplaceUrl
    ? new URL("/admin", `${runtime.marketplaceUrl}/`).toString()
    : null;
  const signInHref = runtime.marketplaceUrl
    ? new URL("/connexion", `${runtime.marketplaceUrl}/`).toString()
    : null;
  return `<section class="section" aria-labelledby="integration-title">
  <div class="section-head">
    <div>
      <h2 id="integration-title">Integration essentials</h2>
      <p>Cross-cutting conventions every documented operation follows.</p>
    </div>
  </div>
  <div class="grid grid-3">
    <section id="authentication" class="panel" aria-labelledby="authentication-title">
      <div class="card-top">
        <span class="card-icon">${icon("shield-check")}</span>
        <h3 class="card-title" id="authentication-title">Authentication</h3>
      </div>
      <ul class="fact-list">
        ${fact("Web", "HttpOnly session cookie plus a double-submit CSRF header on unsafe methods")}
        ${fact("Native", "Bearer JWT for mobile and approved service clients")}
        ${fact("Scope", "Every operation declares the security schemes it accepts")}
      </ul>
    </section>
    <section id="requests" class="panel" aria-labelledby="requests-title">
      <div class="card-top">
        <span class="card-icon">${icon("layers")}</span>
        <h3 class="card-title" id="requests-title">Reliable requests</h3>
      </div>
      <ul class="fact-list">
        ${fact("X-Request-Id", "Correlation id; the server returns the accepted or generated value")}
        ${fact("Errors", "Shared error envelope with a stable code, status and request id")}
        ${fact("Idempotency-Key", "Declared per operation for retryable financial and catalog mutations")}
        ${fact("Paging", "Collections declare cursor or page semantics in the contract")}
      </ul>
    </section>
    <section id="markets" class="panel" aria-labelledby="markets-title">
      <div class="card-top">
        <span class="card-icon">${icon("globe")}</span>
        <h3 class="card-title" id="markets-title">Markets & localization</h3>
      </div>
      <ul class="fact-list">
        ${fact("X-Shongre-Market", "Explicit ISO alpha-2 market context, never an authorization credential")}
        ${fact("Locale", "Locale and currency preferences follow the configured market")}
        ${fact("Money", "Integer minor units with an ISO currency code")}
      </ul>
    </section>
  </div>
  <div class="grid grid-2" style="margin-top:0.75rem">
    <section id="webhooks" class="panel" aria-labelledby="webhooks-title">
      <div class="card-top">
        <span class="card-icon">${icon("webhook")}</span>
        <h3 class="card-title" id="webhooks-title">Webhooks & events</h3>
      </div>
      <ul class="fact-list">
        ${check("Provider signatures are verified before any processing")}
        ${check("Persisted event ids deduplicate replays, so processing is idempotent")}
        ${check("Secondary work is queued to durable backend workers")}
      </ul>
      <a class="card-action" href="/api/docs#domain-payments">Webhook operations in the reference ${icon("arrow-right", "icon-sm")}</a>
    </section>
    <section id="operations" class="panel" aria-labelledby="operations-title">
      <div class="card-top">
        <span class="card-icon">${icon("lock")}</span>
        <h3 class="card-title" id="operations-title">Operations & administration</h3>
        <span class="pill tone-staff" style="margin-left:auto">${icon("lock", "icon-sm")}Restricted</span>
      </div>
      <p class="card-text">Queue diagnostics, audit logs and provider controls require a Staff session. Authorization is enforced server-side; signing in here never widens what an account may read.</p>
      <div class="playground-actions" style="margin-top:0.75rem">
        ${
          signInHref
            ? `<a class="btn btn-sm" href="${escapeHtml(signInHref)}">Sign in to continue</a>`
            : `<span class="status-note">No Web origin is configured for sign-in in this environment.</span>`
        }
        ${
          administrationHref
            ? `<a class="btn btn-sm" href="${escapeHtml(administrationHref)}" target="_blank" rel="noreferrer">Open administration ${icon("external-link", "icon-sm")}</a>`
            : ""
        }
      </div>
    </section>
  </div>
</section>`;
}

function changelog(contract: ConsoleContract): string {
  const deprecations = contract.deprecations.length
    ? `<ul class="fact-list">${contract.deprecations
        .map(
          (entry) =>
            `<li class="fact"><span class="fact-key">${escapeHtml(entry.method)}</span><span><code class="mono">${escapeHtml(entry.requestPath)}</code>${entry.sunsetAt ? ` · sunset ${escapeHtml(entry.sunsetAt)}` : ""}</span></li>`,
        )
        .join("")}</ul>`
    : `<p class="card-text">No documented operation is currently marked deprecated.</p>`;
  return `<section id="changelog" class="section" aria-labelledby="changelog-title">
  <div class="section-head">
    <div>
      <h2 id="changelog-title">Contract versioning</h2>
      <p>The OpenAPI document is the authoritative record of what this deployment serves.</p>
    </div>
  </div>
  <div class="grid grid-2">
    <div class="panel">
      <h3 class="card-title">Current contract</h3>
      <ul class="fact-list">
        <li class="fact fact-pair"><span class="fact-key">Version</span><span>${escapeHtml(contract.contractVersion)}</span></li>
        <li class="fact fact-pair"><span class="fact-key">Prefix</span><span>/api/v1, fixed and not a deploy-time variation</span></li>
        <li class="fact fact-pair"><span class="fact-key">Operations</span><span>${contract.operations.length} documented</span></li>
      </ul>
      <a class="card-action" href="/api/openapi.json">Read the contract ${icon("arrow-right", "icon-sm")}</a>
    </div>
    <div class="panel">
      <h3 class="card-title">Compatibility policy</h3>
      <p class="card-text">Additive changes stay in v1. Removing or changing an established request or response needs a new major prefix, or a staged deprecation that publishes a migration path and a sunset date before removal.</p>
      <h4 class="field-label" style="margin-top:0.75rem">Deprecated operations</h4>
      ${deprecations}
    </div>
  </div>
</section>`;
}

function resources(): string {
  const cards = [
    {
      iconName: "book-open" as IconName,
      title: "API reference",
      body: "Every documented operation, grouped by domain",
      href: "/api/docs",
      external: false,
    },
    {
      iconName: "download" as IconName,
      title: "OpenAPI specification",
      body: "The canonical OpenAPI 3.1 JSON document",
      href: "/api/openapi.json",
      external: false,
    },
    {
      iconName: "activity" as IconName,
      title: "Liveness probe",
      body: "GET /livez — whether this process serves HTTP",
      href: "/livez",
      external: false,
    },
    {
      iconName: "network" as IconName,
      title: "Readiness probe",
      body: "GET /readyz — dependency-aware readiness",
      href: "/readyz",
      external: false,
    },
  ];
  return `<section id="resources" class="section" aria-labelledby="resources-title">
  <div class="section-head">
    <div>
      <h2 id="resources-title">Developer resources</h2>
      <p>Everything below is served by this API origin.</p>
    </div>
  </div>
  <div class="grid grid-4">
    ${cards
      .map(
        (card) => `<a class="card" href="${card.href}">
      <div class="card-top">
        <span class="card-icon">${icon(card.iconName)}</span>
        <span>
          <span class="card-title">${escapeHtml(card.title)}</span>
          <span class="card-text" style="display:block">${escapeHtml(card.body)}</span>
        </span>
      </div>
    </a>`,
      )
      .join("")}
  </div>
</section>`;
}

function footer(
  runtime: DeveloperConsoleRuntime,
  contract: ConsoleContract,
): string {
  return `<footer class="footer">
  <span class="footer-brand">
    ${brandMark(brand.signature, "brand-logo brand-logo-sm")}
    <span>Developer platform</span>
  </span>
  <span>API v1 · ${escapeHtml(runtime.environmentLabel)} environment · contract ${escapeHtml(contract.contractVersion)}</span>
</footer>`;
}

export function renderDeveloperConsole(
  runtime: DeveloperConsoleRuntime,
  contract: ConsoleContract,
): string {
  const island = {
    origin: runtime.apiOrigin,
    apiPrefix: runtime.apiPrefix,
    deadlineMs: runtime.requestDeadlineMs,
    marketHeader: "X-Shongre-Market",
    marketsPath: `${runtime.apiPrefix}/markets`,
    probes: { liveness: "/livez", readiness: "/readyz" },
    accessLabels: ACCESS_LABELS,
    essentialCount: contract.essentialOperations.length,
    playground: contract.playgroundOperations,
    operations: contract.operations.map((operation) => [
      operation.method,
      operation.requestPath,
      operation.purpose,
      operation.access,
      operation.domainId,
    ]),
  };
  return `<!doctype html>
<html lang="en" data-drawer="closed">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="color-scheme" content="dark" />
<title>${escapeHtml(brand.signature)} Backend API — developer console</title>
<style>${developerConsoleStyles()}</style>
</head>
<body data-drawer="closed">
<a class="skip-link" href="#main">Skip to the console</a>
${brandSprite()}
${topbar(runtime)}
<div class="shell">
  ${sidebar(runtime)}
  <button id="sidebar-scrim" class="sidebar-scrim" type="button" tabindex="-1" aria-hidden="true"></button>
  <main id="main" class="main">
    <div class="main-inner">
      ${hero(runtime, contract)}
      ${runtimeOverview(runtime, contract)}
      ${activityAndHealth()}
      ${applications(runtime)}
      ${playground(runtime, contract)}
      ${domains(contract)}
      ${endpoints(contract)}
      ${integration(runtime)}
      ${changelog(contract)}
      ${resources()}
      ${footer(runtime, contract)}
    </div>
  </main>
</div>
<p id="console-live" class="sr-only" role="status" aria-live="polite"></p>
<script id="console-contract" type="application/json">${jsonIsland(island)}</script>
<script>${developerConsoleScript()}</script>
</body>
</html>`;
}

let cachedPage: Promise<string> | null = null;

/**
 * The console depends only on immutable runtime configuration and the
 * committed contract, so the document is rendered once per process.
 */
export function developerConsolePage(): Promise<string> {
  cachedPage ||= openApiDocument().then((specification) =>
    renderDeveloperConsole(
      developerConsoleRuntime(),
      buildConsoleContract(specification as unknown as ApiSpecification),
    ),
  );
  return cachedPage;
}
