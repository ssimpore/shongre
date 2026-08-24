import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../../..");
const routerPath = resolve(repositoryRoot, "backend/src/api/v1/router.ts");
const specPath = resolve(repositoryRoot, "backend/openapi/openapi.json");
const routerSource = await readFile(routerPath, "utf8");
const sourceFile = ts.createSourceFile(
  routerPath,
  routerSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const implemented = new Map();
function visit(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
    ["addRoute", "addEducationRoute"].includes(node.expression.name.text)
  ) {
    const [method, path, access] = node.arguments;
    if (ts.isStringLiteral(method) && ts.isStringLiteral(path)) {
      const resolvedPath = `${
        node.expression.name.text === "addEducationRoute" ? "/education" : ""
      }${path.text}`;
      const key = `${method.text.toUpperCase()} ${resolvedPath}`;
      if (implemented.has(key)) throw new Error(`Duplicate route: ${key}`);
      implemented.set(key, access?.getText(sourceFile) || "");
    }
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);

const implementedEntries = [...implemented.keys()].map((key) => {
  const separator = key.indexOf(" ");
  return { method: key.slice(0, separator), path: key.slice(separator + 1) };
});
for (
  let earlierIndex = 0;
  earlierIndex < implementedEntries.length;
  earlierIndex += 1
) {
  const earlier = implementedEntries[earlierIndex];
  const earlierPattern = new RegExp(
    `^${earlier.path.replace(/:([A-Za-z0-9_]+)/g, "[^/]+")}$`,
  );
  for (
    let laterIndex = earlierIndex + 1;
    laterIndex < implementedEntries.length;
    laterIndex += 1
  ) {
    const later = implementedEntries[laterIndex];
    if (
      earlier.method === later.method &&
      earlier.path !== later.path &&
      earlierPattern.test(later.path)
    ) {
      throw new Error(
        `Route ${earlier.method} ${earlier.path} shadows ${later.method} ${later.path}.`,
      );
    }
  }
}

const spec = JSON.parse(await readFile(specPath, "utf8"));
const documented = new Map();
const documentedServerOperations = new Map();
const operationIds = new Set();
for (const [openApiPath, pathItem] of Object.entries(spec.paths)) {
  const routePath = openApiPath.replace(
    /\{([A-Za-z0-9_]+)\}/g,
    (_match, name) => `:${name}`,
  );
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = pathItem[method];
    if (!operation) continue;
    const key = `${method.toUpperCase()} ${routePath}`;
    if (documented.has(key)) throw new Error(`Duplicate OpenAPI route: ${key}`);
    if (operationIds.has(operation.operationId)) {
      throw new Error(`Duplicate operationId: ${operation.operationId}`);
    }
    operationIds.add(operation.operationId);
    const runtime = operation["x-shongre-runtime"] || "router";
    (runtime === "server" ? documentedServerOperations : documented).set(
      key,
      operation,
    );
    if (!("security" in operation)) throw new Error(`Missing security: ${key}`);
    if (
      !Object.keys(operation.responses || {}).some((code) =>
        /^[23]\d\d$/.test(code),
      )
    ) {
      throw new Error(`Missing success response: ${key}`);
    }
    if (
      runtime !== "server" &&
      !Object.keys(operation.responses || {}).some((code) =>
        /^4\d\d$/.test(code),
      )
    ) {
      throw new Error(`Missing client error response: ${key}`);
    }
  }
}

const missingFromSpec = [...implemented.keys()].filter(
  (key) => !documented.has(key),
);
const missingFromRouter = [...documented.keys()].filter(
  (key) => !implemented.has(key),
);
if (missingFromSpec.length || missingFromRouter.length) {
  console.error({ missingFromSpec, missingFromRouter });
  process.exit(1);
}

const securityMismatches = [];
for (const [key, accessExpression] of implemented) {
  const operation = documented.get(key);
  const permissionMatch = accessExpression.match(
    /^permission\(["']([^"']+)["']\)$/,
  );
  const expectedAccess = permissionMatch
    ? "permission"
    : accessExpression === "PUBLIC"
      ? "public"
      : accessExpression === "AUTHENTICATED"
        ? "authenticated"
        : null;
  if (!expectedAccess) {
    throw new Error(
      `Unrecognized route access declaration for ${key}: ${accessExpression}`,
    );
  }
  if (
    operation["x-shongre-access"] !== expectedAccess ||
    (permissionMatch &&
      operation["x-shongre-permission"] !== permissionMatch[1])
  ) {
    securityMismatches.push({
      key,
      expectedAccess,
      expectedPermission: permissionMatch?.[1] || null,
      documentedAccess: operation["x-shongre-access"],
      documentedPermission: operation["x-shongre-permission"] || null,
    });
  }
}
if (securityMismatches.length) {
  console.error("OpenAPI security metadata divergence:", securityMismatches);
  process.exit(1);
}

const serverSource = await readFile(
  resolve(repositoryRoot, "backend/src/app/server/index.ts"),
  "utf8",
);
for (const key of documentedServerOperations.keys()) {
  const [, path] = key.split(" ");
  if (!serverSource.includes(`req.url === "${path}"`)) {
    throw new Error(`Documented server operation is not implemented: ${key}`);
  }
}

const forbiddenLegacyFragments = [
  '"/courses',
  '"/promotions',
  '"/messaging/send"',
  '"/messaging/conversations/detail',
];
for (const fragment of forbiddenLegacyFragments) {
  if (routerSource.includes(fragment)) {
    throw new Error(`Legacy API fragment remains in router: ${fragment}`);
  }
}
if (!routerSource.includes("pathname.startsWith(`${prefix}/`)")) {
  throw new Error("The router no longer rejects unversioned shadow routes.");
}

console.log(
  `OpenAPI contract matches ${implemented.size} router and ${documentedServerOperations.size} operational endpoints with no legacy aliases.`,
);
