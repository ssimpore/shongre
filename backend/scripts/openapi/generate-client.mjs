import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const spec = JSON.parse(
  await readFile(resolve(root, "backend/openapi/openapi.json"), "utf8"),
);
const dereference = (value) =>
  value?.$ref
    ? value.$ref
        .slice(2)
        .split("/")
        .reduce((item, key) => item[key], spec)
    : value;
const functions = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = item[method];
    if (!operation || operation["x-shongre-runtime"] === "server") continue;
    const responses = Object.entries(operation.responses)
      .filter(([code]) => /^2\d\d$/.test(code))
      .map(([, response]) => dereference(response));
    // Browser redirects, tracking pixels, and operational probes are handled
    // by their dedicated platform transports, not by JSON business adapters.
    if (
      !responses.length ||
      responses.some(
        (response) => response.content && !response.content["application/json"],
      )
    )
      continue;
    const body = dereference(operation.requestBody);
    const contentType = body?.content?.["application/json"]
      ? "application/json"
      : body
        ? "application/x-www-form-urlencoded"
        : "application/json";
    if (body && !body.content?.[contentType])
      throw new Error(`Unsupported body encoding for ${operation.operationId}`);
    for (const parameter of [
      ...(item.parameters || []),
      ...(operation.parameters || []),
    ].map(dereference)) {
      if (
        parameter.in === "query" &&
        ((parameter.style && parameter.style !== "form") ||
          parameter.explode === false ||
          parameter.content ||
          parameter.schema?.type === "object")
      )
        throw new Error(
          `Unsupported query encoding for ${operation.operationId}: ${parameter.name}`,
        );
    }
    const id = operation.operationId;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id))
      throw new Error(`Invalid operationId: ${id}`);
    functions.push(
      `export function ${id}(transport: ApiTransport, input: ApiInput<${JSON.stringify(id)}>): Promise<ApiResponse<${JSON.stringify(id)}>> { return executeApiOperation<${JSON.stringify(id)}>(transport, ${JSON.stringify(method.toUpperCase())}, ${JSON.stringify(path)}, input, ${JSON.stringify(contentType)}); }`,
    );
  }
}
const output = resolve(root, "packages/contracts/src/generated/api-client.ts");
const source = await format(
  `/** AUTO-GENERATED from backend/openapi/openapi.json. DO NOT EDIT. */\nimport { executeApiOperation, type ApiTransport, type ApiInput, type ApiResponse } from "../client/operation";\nexport type { ApiTransport, ApiInput, ApiResponse } from "../client/operation";\n${functions.join("\n")}`,
  { parser: "typescript" },
);
if (process.argv.includes("--check")) {
  if ((await readFile(output, "utf8").catch(() => "")) !== source)
    throw new Error("Generated API client is stale; run make api-generate");
} else await writeFile(output, source);
console.log(
  `${functions.length} generated JSON business operations ${process.argv.includes("--check") ? "verified" : "written"}.`,
);
