import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const routerFile = path.join(sourceRoot, "app/router/index.tsx");
const sourceFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".test.tsx")
    ) {
      sourceFiles.push(absolute);
    }
  }
}

walk(sourceRoot);

const routerSource = fs.readFileSync(routerFile, "utf8");
const routerAst = ts.createSourceFile(
  routerFile,
  routerSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

const routes = new Set();

function property(object, name) {
  return object.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      (candidate.name.getText(routerAst) === name ||
        candidate.name.getText(routerAst) === `"${name}"`),
  );
}

function joinRoute(parent, child) {
  if (!child) return parent || "/";
  if (child.startsWith("/")) return child;
  return `${parent === "/" ? "" : parent}/${child}`.replace(/\/{2,}/g, "/");
}

function collectRouteObjects(array, parent = "") {
  for (const element of array.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const pathProperty = property(element, "path");
    const pathValue =
      pathProperty && ts.isStringLiteralLike(pathProperty.initializer)
        ? pathProperty.initializer.text
        : "";
    const complete = joinRoute(parent, pathValue);
    if (pathValue !== "*" && !pathValue.includes("*")) routes.add(complete);
    const children = property(element, "children");
    if (children && ts.isArrayLiteralExpression(children.initializer)) {
      collectRouteObjects(children.initializer, complete);
    }
  }
}

function findRouter(node) {
  // The route table is exported once and passed to both the browser router and
  // the SSR memory router. Read that shared declaration rather than requiring
  // createBrowserRouter to contain an inline array literal.
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(routerAst) === "APP_ROUTES" &&
    node.initializer &&
    ts.isArrayLiteralExpression(node.initializer)
  ) {
    collectRouteObjects(node.initializer);
  }
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(routerAst) === "createBrowserRouter" &&
    ts.isArrayLiteralExpression(node.arguments[0])
  ) {
    collectRouteObjects(node.arguments[0]);
  }
  ts.forEachChild(node, findRouter);
}

findRouter(routerAst);

const matchers = [...routes].map((route) => ({
  route,
  expression: new RegExp(
    `^${route
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/:([A-Za-z0-9_]+)/g, "[^/]+")}/?$`,
  ),
}));

const errors = [];
const checked = [];

function location(sourceFile, node) {
  const position = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return `${path.relative(root, sourceFile.fileName)}:${position.line + 1}`;
}

function valuesFromExpression(expression, sourceFile) {
  if (!expression) return [];
  if (ts.isStringLiteralLike(expression)) return [expression.text];
  if (ts.isTemplateExpression(expression)) {
    return [
      expression.head.text +
        expression.templateSpans
          .map((span) => `sample${span.literal.text}`)
          .join(""),
    ];
  }
  if (ts.isConditionalExpression(expression)) {
    return [
      ...valuesFromExpression(expression.whenTrue, sourceFile),
      ...valuesFromExpression(expression.whenFalse, sourceFile),
    ];
  }
  return [];
}

function validateDestination(destination, sourceFile, node) {
  const value = destination.trim();
  const where = location(sourceFile, node);
  if (!value || value === "#" || /^javascript:/i.test(value)) {
    errors.push(
      `${where} contains an empty or placeholder destination (${JSON.stringify(value)}).`,
    );
    return;
  }
  if (value.startsWith("#")) {
    if (value.includes("sample")) return;
    const target = value.slice(1);
    const pattern = new RegExp(
      `(?:id|name)=["']${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
    );
    if (!pattern.test(sourceFile.text)) {
      errors.push(`${where} targets missing in-page anchor ${value}.`);
    }
    return;
  }
  if (!value.startsWith("/") || value.startsWith("//")) return;
  const parsed = new URL(value, "https://shongre.invalid");
  if (value.includes("\\") || /\/{2,}/.test(parsed.pathname)) {
    errors.push(`${where} contains a malformed internal path ${value}.`);
    return;
  }
  const valid = matchers.some(({ expression }) =>
    expression.test(parsed.pathname),
  );
  if (!valid) {
    errors.push(`${where} points to an unregistered route ${value}.`);
    return;
  }
  if (parsed.pathname === "/recherche") {
    const allowed = new Set([
      "query",
      "category",
      "subCategory",
      "city",
      "radius",
      "view",
      "sortBy",
      "minPrice",
      "maxPrice",
      "sellerType",
      "delivery",
      "onlinePayment",
      "onlyDeals",
      "condition",
      "market",
    ]);
    for (const key of parsed.searchParams.keys()) {
      if (!allowed.has(key) && !key.startsWith("attr_")) {
        errors.push(
          `${where} uses unsupported search parameter ${key} in ${value}.`,
        );
      }
    }
  }
  checked.push(`${where} ${value}`);
}

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(sourceFile);
      const targetAttribute = opening.attributes.properties.find(
        (candidate) =>
          ts.isJsxAttribute(candidate) &&
          candidate.name.getText(sourceFile) === "target",
      );
      const relAttribute = opening.attributes.properties.find(
        (candidate) =>
          ts.isJsxAttribute(candidate) &&
          candidate.name.getText(sourceFile) === "rel",
      );
      const targetValue =
        targetAttribute &&
        ts.isJsxAttribute(targetAttribute) &&
        ts.isStringLiteral(targetAttribute.initializer)
          ? targetAttribute.initializer.text
          : "";
      const relValue =
        relAttribute &&
        ts.isJsxAttribute(relAttribute) &&
        ts.isStringLiteral(relAttribute.initializer)
          ? relAttribute.initializer.text
          : "";
      if (
        tag === "a" &&
        targetValue === "_blank" &&
        (!relValue.includes("noopener") || !relValue.includes("noreferrer"))
      ) {
        errors.push(
          `${location(sourceFile, opening)} opens a new tab without rel="noopener noreferrer".`,
        );
      }
      for (const attribute of opening.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue;
        const name = attribute.name.getText(sourceFile);
        if (name !== "href" && name !== "to") continue;
        const expression = ts.isStringLiteral(attribute.initializer)
          ? attribute.initializer
          : ts.isJsxExpression(attribute.initializer)
            ? attribute.initializer.expression
            : undefined;
        const values = valuesFromExpression(expression, sourceFile);
        for (const value of values)
          validateDestination(value, sourceFile, attribute);
        if (tag === "a" && values.some((value) => value.startsWith("/"))) {
          if (!targetAttribute) {
            errors.push(
              `${location(sourceFile, opening)} uses a native anchor for internal navigation.`,
            );
          }
        }
      }
    }

    if (
      ts.isCallExpression(node) &&
      ["navigate", "router.navigate"].includes(
        node.expression.getText(sourceFile),
      )
    ) {
      for (const value of valuesFromExpression(node.arguments[0], sourceFile)) {
        validateDestination(value, sourceFile, node.arguments[0]);
      }
    }

    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(sourceFile) === "destination"
    ) {
      for (const value of valuesFromExpression(node.initializer, sourceFile)) {
        validateDestination(value, sourceFile, node.initializer);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (errors.length) {
  console.error(
    `Navigation integrity check failed with ${errors.length} issue(s):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (process.argv.includes("--print-routes")) {
  console.log("Registered route inventory:");
  for (const route of [...routes].sort((left, right) =>
    left.localeCompare(right),
  )) {
    console.log(`- ${route}`);
  }
}

console.log(
  `Navigation integrity check passed: ${routes.size} registered routes and ${checked.length} static destinations verified.`,
);
