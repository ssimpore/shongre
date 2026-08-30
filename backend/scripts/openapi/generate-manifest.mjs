import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDirectory, "../..");
const specPath = resolve(backendRoot, "openapi/openapi.json");
const outputPath = resolve(backendRoot, "src/generated/openapi-manifest.ts");
const spec = JSON.parse(await readFile(specPath, "utf8"));

const operations = {};
for (const [openApiPath, pathItem] of Object.entries(spec.paths)) {
  const routerPath = openApiPath.replace(
    /\{([A-Za-z0-9_]+)\}/g,
    (_match, name) => `:${name}`,
  );
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = pathItem[method];
    if (!operation) continue;
    if (
      operation["x-shongre-access"] === "public" &&
      typeof operation["x-shongre-deny-staff-marketplace"] !== "boolean"
    ) {
      throw new Error(
        `${method.toUpperCase()} ${openApiPath} must explicitly declare x-shongre-deny-staff-marketplace`,
      );
    }
    if (operation["x-shongre-runtime"] === "server") continue;
    operations[`${method.toUpperCase()} ${routerPath}`] = {
      operationId: operation.operationId,
      access: operation["x-shongre-access"],
      permission: operation["x-shongre-permission"] || null,
      denyStaffMarketplace: Boolean(
        operation["x-shongre-deny-staff-marketplace"],
      ),
      requestBodyRequired: Boolean(operation.requestBody?.required),
      successStatus: Number(
        Object.keys(operation.responses).find((status) =>
          /^2\d\d$/.test(status),
        ) ||
          Object.keys(operation.responses).find((status) =>
            /^3\d\d$/.test(status),
          ),
      ),
      queryParameters: Object.fromEntries(
        (operation.parameters || [])
          .filter(
            (parameter) =>
              !parameter.$ref && parameter.in === "query" && parameter.name,
          )
          .map((parameter) => [
            parameter.name,
            parameter.schema?.type || "string",
          ]),
      ),
    };
  }
}

const rawSource = `/**
 * Generated from backend/openapi/openapi.json. Do not edit by hand.
 */
export const OPENAPI_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;

export type OpenApiOperationKey = keyof typeof OPENAPI_OPERATIONS;
`;
const source = await format(rawSource, { parser: "typescript" });

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== source) {
    console.error(
      "Generated OpenAPI runtime manifest is stale. Run npm run openapi:generate.",
    );
    process.exit(1);
  }
} else {
  await writeFile(outputPath, source);
  console.log(
    `Generated ${Object.keys(operations).length} runtime operations.`,
  );
}
