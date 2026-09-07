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

export async function renderApiDocumentation(): Promise<string> {
  const specification = await openApiDocument();
  const rows: string[] = [];
  for (const [path, item] of Object.entries(specification.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (
        !operation ||
        typeof operation !== "object" ||
        !("operationId" in operation)
      )
        continue;
      rows.push(
        `<tr><td>${escapeHtml(method.toUpperCase())}</td><td><code>${escapeHtml(path)}</code></td><td>${escapeHtml(String(operation.operationId))}</td><td>${escapeHtml(String(operation.summary))}</td></tr>`,
      );
    }
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shongre API reference</title></head><body><main><h1>Shongre API reference</h1><p>Business operations use <code>/api/v1</code>. Operational endpoints use the root origin. Authentication, permissions, request and response schemas are defined in the <a href="/api/openapi.json">OpenAPI 3.1 document</a>.</p><table><caption>Documented operations</caption><thead><tr><th scope="col">Method</th><th scope="col">Path</th><th scope="col">Operation ID</th><th scope="col">Description</th></tr></thead><tbody>${rows.join("")}</tbody></table></main></body></html>`;
}
