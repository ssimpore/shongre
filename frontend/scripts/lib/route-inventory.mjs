import ts from "typescript";

/** Follow shared, statically declared route arrays without executing app code. */
export function collectStaticRoutes(sourceFile) {
  const arrays = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(declaration.initializer)
      ) {
        arrays.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  const routes = new Set();
  function property(object, name) {
    return object.properties.find(
      (candidate) =>
        ts.isPropertyAssignment(candidate) &&
        (candidate.name.getText(sourceFile) === name ||
          candidate.name.getText(sourceFile) === `"${name}"`),
    );
  }
  function visit(expression, parent = "", ancestors = new Set()) {
    const array = ts.isIdentifier(expression)
      ? arrays.get(expression.text)
      : expression;
    if (!array || !ts.isArrayLiteralExpression(array) || ancestors.has(array)) {
      throw new Error(
        "Route inventory requires an acyclic, statically declared route array.",
      );
    }
    const next = new Set([...ancestors, array]);
    for (const element of array.elements) {
      if (ts.isSpreadElement(element)) {
        visit(element.expression, parent, next);
        continue;
      }
      if (!ts.isObjectLiteralExpression(element))
        throw new Error("Route inventory cannot resolve a route object.");
      const pathProperty = property(element, "path");
      const path =
        pathProperty && ts.isStringLiteralLike(pathProperty.initializer)
          ? pathProperty.initializer.text
          : "";
      const complete = !path
        ? parent || "/"
        : path.startsWith("/")
          ? path
          : `${parent === "/" ? "" : parent}/${path}`.replace(/\/{2,}/g, "/");
      if (!path.includes("*")) routes.add(complete);
      const children = property(element, "children");
      if (children) visit(children.initializer, complete, next);
    }
  }
  const root = arrays.get("APP_ROUTES");
  if (!root)
    throw new Error("APP_ROUTES is missing from the canonical router.");
  visit(root);
  return routes;
}
