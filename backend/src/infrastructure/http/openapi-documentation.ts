import {
  ACCESS_LABELS,
  API_DOMAINS,
  buildConsoleContract,
  type ApiSpecification,
  type ConsoleOperation,
} from "./developer-console-model.js";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

interface OpenApiDocument {
  openapi: string;
  paths: Record<
    string,
    Record<string, { operationId?: string; summary?: string }>
  >;
  [key: string]: unknown;
}

export async function openApiDocument(): Promise<OpenApiDocument> {
  return (
    await import("../../../openapi/openapi.json", { with: { type: "json" } })
  ).default as unknown as OpenApiDocument;
}

function documentationRow(operation: ConsoleOperation): string {
  return `<tr><td>${escapeHtml(operation.method)}</td><td><code>${escapeHtml(operation.requestPath)}</code></td><td><code>${escapeHtml(operation.operationId)}</code></td><td>${escapeHtml(operation.purpose)}</td><td>${escapeHtml(ACCESS_LABELS[operation.access])}</td></tr>`;
}

let cachedReference: Promise<string> | null = null;

/**
 * A dependency-free, script-free reference grouped by the same domains the
 * developer console links to, so every `#domain-*` anchor resolves here. The
 * committed contract cannot change at runtime, so it is built once.
 */
export function renderApiDocumentation(): Promise<string> {
  cachedReference ||= buildApiDocumentation();
  return cachedReference;
}

async function buildApiDocumentation(): Promise<string> {
  const specification = await openApiDocument();
  const contract = buildConsoleContract(
    specification as unknown as ApiSpecification,
  );
  const byDomain = new Map<string, ConsoleOperation[]>();
  for (const operation of contract.operations) {
    byDomain.set(operation.domainId, [
      ...(byDomain.get(operation.domainId) || []),
      operation,
    ]);
  }
  const sections = API_DOMAINS.map((domain) => {
    const operations = byDomain.get(domain.id) || [];
    if (operations.length === 0) return "";
    return `<section id="domain-${escapeHtml(domain.id)}"><h2>${escapeHtml(domain.label)}</h2><p>${escapeHtml(domain.description)}. ${operations.length} documented operations.</p><table><caption>${escapeHtml(domain.label)} operations</caption><thead><tr><th scope="col">Method</th><th scope="col">Path</th><th scope="col">Operation ID</th><th scope="col">Description</th><th scope="col">Access</th></tr></thead><tbody>${operations.map(documentationRow).join("")}</tbody></table></section>`;
  }).join("");
  const contents = API_DOMAINS.filter(
    (domain) => (byDomain.get(domain.id) || []).length > 0,
  )
    .map(
      (domain) =>
        `<li><a href="#domain-${escapeHtml(domain.id)}">${escapeHtml(domain.label)}</a></li>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shongre API reference</title></head><body><main><h1>Shongre API reference</h1><p>Contract version ${escapeHtml(contract.contractVersion)} with ${contract.operations.length} documented operations. Business operations use <code>/api/v1</code>. Operational endpoints use the root origin. Authentication, permissions, request and response schemas are defined in the <a href="/api/openapi.json">OpenAPI 3.1 document</a>. The <a href="/">developer console</a> can run public discovery requests.</p><nav aria-label="Domains"><h2>Domains</h2><ul>${contents}</ul></nav>${sections}</main></body></html>`;
}
