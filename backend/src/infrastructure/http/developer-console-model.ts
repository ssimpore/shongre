import {
  CAPABILITIES,
  isStaffCapability,
  type Capability,
} from "@shongre/contracts/access-control";
import { SHONGRE_API_PREFIX } from "@shongre/contracts/openapi";

/**
 * Presentation model for the developer console and the API reference page.
 *
 * Everything here is derived from `backend/openapi/openapi.json`, the only
 * authoritative HTTP specification. This module owns grouping and labelling
 * for human readers; it never declares an operation the contract does not.
 */

export type ConsoleAccessLevel = "public" | "authenticated" | "staff";

export interface ConsoleOperation {
  operationId: string;
  method: string;
  /** Path as documented, relative to the operation's own server. */
  specPath: string;
  /** Path a caller requests on the API origin. */
  requestPath: string;
  purpose: string;
  access: ConsoleAccessLevel;
  domainId: ApiDomainId;
}

export interface ConsoleDeprecation {
  operationId: string;
  method: string;
  requestPath: string;
  sunsetAt: string;
}

export interface ConsoleDomain {
  id: ApiDomainId;
  label: string;
  description: string;
  operationCount: number;
  access: readonly ConsoleAccessLevel[];
}

export interface PlaygroundParameter {
  name: string;
  location: "query" | "header";
  required: boolean;
  description: string;
  defaultValue: string;
}

export interface PlaygroundOperation {
  operationId: string;
  method: string;
  label: string;
  requestPath: string;
  access: ConsoleAccessLevel;
  domainId: ApiDomainId;
  parameters: readonly PlaygroundParameter[];
}

export interface ConsoleContract {
  contractVersion: string;
  /** Operations the contract marks `deprecated`, with their sunset dates. */
  deprecations: readonly ConsoleDeprecation[];
  operations: readonly ConsoleOperation[];
  domains: readonly ConsoleDomain[];
  essentialOperations: readonly ConsoleOperation[];
  playgroundOperations: readonly PlaygroundOperation[];
}

interface SpecificationParameter {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: { default?: unknown; enum?: unknown[] };
  $ref?: string;
}

interface SpecificationOperation {
  operationId?: string;
  deprecated?: boolean;
  "x-sunset-at"?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: unknown[];
  parameters?: SpecificationParameter[];
  "x-shongre-access"?: string;
  "x-shongre-permission"?: string;
  "x-shongre-runtime"?: string;
}

interface SpecificationPathItem {
  parameters?: SpecificationParameter[];
  [method: string]: unknown;
}

export interface ApiSpecification {
  info?: { version?: string };
  paths: Record<string, SpecificationPathItem>;
  components?: { parameters?: Record<string, SpecificationParameter> };
}

const ADMIN_TAG_PREFIX = "admin-";

/**
 * Reader-facing groups over the contract's own tags. Every documented tag must
 * resolve to exactly one group; `developer-console-model.test.ts` fails when a
 * new tag is introduced without one, so the directory can never silently drop
 * a domain.
 */
export const API_DOMAINS = [
  {
    id: "identity",
    label: "Identity & accounts",
    description: "Sessions, profiles and verification",
    tags: ["auth", "account", "users", "verification"],
  },
  {
    id: "listings",
    label: "Listings & discovery",
    description: "Search, taxonomy and publication",
    tags: [
      "listings",
      "listing-drafts",
      "publication",
      "taxonomy",
      "discovery",
      "home",
      "favorites",
      "watch-subscriptions",
      "reviews",
    ],
  },
  {
    id: "markets",
    label: "Markets & currencies",
    description: "Market configuration and pricing context",
    tags: ["markets", "business-rules"],
  },
  {
    id: "orders",
    label: "Orders & delivery",
    description: "Purchases, reservations and fulfilment",
    tags: ["orders", "delivery"],
  },
  {
    id: "payments",
    label: "Payments & billing",
    description: "Payments, subscriptions, invoices and provider callbacks",
    tags: ["payments", "finance", "invoicing", "monetization", "webhooks"],
  },
  {
    id: "messaging",
    label: "Messaging & notifications",
    description: "Conversations, alerts and preferences",
    tags: ["messaging", "notifications"],
  },
  {
    id: "trust",
    label: "Trust & support",
    description: "Reports, appeals, moderation and compliance",
    tags: ["support", "reports", "moderation", "compliance"],
  },
  {
    id: "media",
    label: "Media & digital goods",
    description: "Uploads, assets and entitlements",
    tags: ["media", "digital-products", "digital-products-admin"],
  },
  {
    id: "crm",
    label: "CRM & marketing",
    description: "Contacts, pipelines, campaigns and analytics",
    tags: ["crm", "marketing", "prospecting", "providers", "analytics"],
  },
  {
    id: "verticals",
    label: "Specialized marketplaces",
    description: "Auto, real estate, jobs and education",
    tags: ["auto", "real-estate", "employment", "education"],
  },
  {
    id: "business",
    label: "Business & workspaces",
    description: "Solutions, workspaces and assistance",
    tags: ["solutions", "workspace", "ai"],
  },
  {
    id: "administration",
    label: "Administration",
    description: "Governance, audit and platform controls",
    tags: ["operations", "feature-flags"],
  },
] as const;

export type ApiDomainId = (typeof API_DOMAINS)[number]["id"];

const DOMAIN_BY_TAG = new Map<string, ApiDomainId>(
  API_DOMAINS.flatMap((domain) =>
    domain.tags.map((tag) => [tag, domain.id] as [string, ApiDomainId]),
  ),
);

/** Operations promoted to the console's essential table, in reading order. */
const ESSENTIAL_OPERATION_IDS = [
  "getLiveness",
  "getReadiness",
  "getTaxonomyRoot",
  "getListings",
  "getMarkets",
  "getBusinessRulesCatalog",
  "getAdminStats",
] as const;

/** Public, parameter-free discovery reads the playground may execute. */
const PLAYGROUND_OPERATION_IDS = [
  "getListings",
  "getMarkets",
  "getTaxonomyRoot",
  "getBusinessRulesCatalog",
  "getCurrencies",
  "getDiscoveryCollections",
  "getSolutions",
  "getLiveness",
  "getReadiness",
] as const;

export function domainForTag(tag: string): ApiDomainId {
  if (tag.startsWith(ADMIN_TAG_PREFIX)) return "administration";
  return DOMAIN_BY_TAG.get(tag) || "administration";
}

const CAPABILITY_SET = new Set<string>(CAPABILITIES);

export function accessLevelFor(
  operation: Pick<
    SpecificationOperation,
    "x-shongre-access" | "x-shongre-permission"
  >,
): ConsoleAccessLevel {
  const declared = operation["x-shongre-access"];
  if (declared === "public") return "public";
  const permission = operation["x-shongre-permission"];
  if (
    declared === "permission" &&
    permission &&
    CAPABILITY_SET.has(permission) &&
    isStaffCapability(permission as Capability)
  ) {
    return "staff";
  }
  return "authenticated";
}

export const ACCESS_LABELS: Readonly<Record<ConsoleAccessLevel, string>> = {
  public: "Public",
  authenticated: "Authenticated",
  staff: "Staff only",
};

function resolveParameter(
  parameter: SpecificationParameter,
  specification: ApiSpecification,
): SpecificationParameter {
  if (!parameter.$ref) return parameter;
  const name = parameter.$ref.split("/").pop() || "";
  return specification.components?.parameters?.[name] || {};
}

/**
 * Uses the contract's own wording when it says something the method and path
 * do not already say, and otherwise names the owning domain rather than
 * inventing a description.
 */
function purposeFor(
  operation: SpecificationOperation,
  method: string,
  specPath: string,
  domainLabel: string,
): string {
  const summary = (operation.summary || "").trim();
  const echo = `${method} ${specPath}`.toLowerCase();
  const normalizedSummary = summary.toLowerCase().replace(/\/v1(?=\/)/g, "");
  if (summary && normalizedSummary !== echo.replace(/\/v1(?=\/)/g, "")) {
    return summary;
  }
  const description = (operation.description || "").trim();
  if (description) return description.split(/(?<=\.)\s/)[0];
  return domainLabel;
}

function isDocumentedOperation(
  value: unknown,
): value is SpecificationOperation {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SpecificationOperation).operationId === "string"
  );
}

export function buildConsoleContract(
  specification: ApiSpecification,
): ConsoleContract {
  const domainLabels = new Map<ApiDomainId, string>(
    API_DOMAINS.map((domain) => [domain.id, domain.label]),
  );
  const operations: ConsoleOperation[] = [];
  const deprecations: ConsoleDeprecation[] = [];
  const playgroundCandidates = new Map<string, PlaygroundOperation>();
  const accessByDomain = new Map<ApiDomainId, Set<ConsoleAccessLevel>>();
  const countByDomain = new Map<ApiDomainId, number>();

  for (const [specPath, pathItem] of Object.entries(specification.paths)) {
    for (const [method, candidate] of Object.entries(pathItem)) {
      if (method === "parameters" || !isDocumentedOperation(candidate))
        continue;
      const operation = candidate;
      const upperMethod = method.toUpperCase();
      const domainId = domainForTag(operation.tags?.[0] || "");
      const access = accessLevelFor(operation);
      // Operational probes and the contract itself answer on the API origin
      // root; every business operation answers under the versioned prefix.
      const rootOrigin = operation["x-shongre-runtime"] === "server";
      const requestPath = rootOrigin
        ? specPath
        : `${SHONGRE_API_PREFIX}${specPath}`;
      operations.push({
        operationId: operation.operationId as string,
        method: upperMethod,
        specPath,
        requestPath,
        purpose: purposeFor(
          operation,
          upperMethod,
          specPath,
          domainLabels.get(domainId) as string,
        ),
        access,
        domainId,
      });
      if (operation.deprecated) {
        deprecations.push({
          operationId: operation.operationId as string,
          method: upperMethod,
          requestPath,
          sunsetAt: operation["x-sunset-at"] || "",
        });
      }
      countByDomain.set(domainId, (countByDomain.get(domainId) || 0) + 1);
      const levels = accessByDomain.get(domainId) || new Set();
      levels.add(access);
      accessByDomain.set(domainId, levels);

      if (
        upperMethod === "GET" &&
        access === "public" &&
        !specPath.includes("{") &&
        (PLAYGROUND_OPERATION_IDS as readonly string[]).includes(
          operation.operationId as string,
        )
      ) {
        const parameters = [
          ...(pathItem.parameters || []),
          ...(operation.parameters || []),
        ]
          .map((parameter) => resolveParameter(parameter, specification))
          .filter(
            (parameter) =>
              parameter.name &&
              (parameter.in === "query" || parameter.in === "header"),
          )
          .map<PlaygroundParameter>((parameter) => ({
            name: parameter.name as string,
            location: parameter.in as "query" | "header",
            required: parameter.required === true,
            description: (parameter.description || "").trim(),
            defaultValue:
              parameter.schema?.default === undefined
                ? ""
                : String(parameter.schema.default),
          }));
        playgroundCandidates.set(operation.operationId as string, {
          operationId: operation.operationId as string,
          method: upperMethod,
          label: `${upperMethod} ${requestPath}`,
          requestPath,
          access,
          domainId,
          parameters,
        });
      }
    }
  }

  operations.sort(
    (first, second) =>
      first.requestPath.localeCompare(second.requestPath) ||
      first.method.localeCompare(second.method),
  );

  const byOperationId = new Map(
    operations.map((operation) => [operation.operationId, operation]),
  );

  return {
    contractVersion: specification.info?.version || "",
    deprecations: deprecations.sort((first, second) =>
      first.requestPath.localeCompare(second.requestPath),
    ),
    operations,
    domains: API_DOMAINS.map((domain) => ({
      id: domain.id,
      label: domain.label,
      description: domain.description,
      operationCount: countByDomain.get(domain.id) || 0,
      access: (["public", "authenticated", "staff"] as const).filter((level) =>
        accessByDomain.get(domain.id)?.has(level),
      ),
    })),
    essentialOperations: ESSENTIAL_OPERATION_IDS.map((operationId) =>
      byOperationId.get(operationId),
    ).filter((operation): operation is ConsoleOperation => Boolean(operation)),
    playgroundOperations: PLAYGROUND_OPERATION_IDS.map((operationId) =>
      playgroundCandidates.get(operationId),
    ).filter((operation): operation is PlaygroundOperation =>
      Boolean(operation),
    ),
  };
}

/** Summarizes a domain's access mix for the directory cards. */
export function domainAccessLabel(
  access: readonly ConsoleAccessLevel[],
): string {
  if (access.length === 0) return "No documented operation";
  if (access.length === 1) return ACCESS_LABELS[access[0]];
  if (access.length === 3) return "Mixed access";
  if (access.includes("staff")) return "Staff and authenticated";
  return "Public + authenticated";
}
