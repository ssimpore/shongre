import { readFile } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import ts from "typescript";

/** Inspect the composition root in registration order, including domain owners. */
export async function implementedRoutes(repositoryRoot) {
  const routerPath = resolve(repositoryRoot, "backend/src/api/v1/router.ts");
  const parse = async (path) =>
    ts.createSourceFile(
      path,
      await readFile(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
  const router = await parse(routerPath);
  const imports = new Map();
  for (const node of router.statements) {
    if (!ts.isImportDeclaration(node)) continue;
    for (const item of node.importClause?.namedBindings?.elements || []) {
      imports.set(
        item.name.text,
        resolve(
          dirname(routerPath),
          node.moduleSpecifier.text.replace(/\.js$/, ".ts"),
        ),
      );
    }
  }
  const constructor = router.statements
    .find(ts.isClassDeclaration)
    ?.members.find(ts.isConstructorDeclaration);
  if (!constructor) throw new Error("API composition root has no constructor");
  const routes = new Map();
  for (const statement of constructor.body.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isCallExpression(statement.expression)
    )
      continue;
    const call = statement.expression;
    if (
      !ts.isIdentifier(call.expression) ||
      !/^register\w+Routes$/.test(call.expression.text)
    )
      continue;
    const path = imports.get(call.expression.text);
    if (!path)
      throw new Error(`Unresolved route registrar: ${call.expression.text}`);
    const source = await parse(path);
    const registrar = source.statements.find(
      (node) =>
        ts.isFunctionDeclaration(node) &&
        node.name?.text === call.expression.text,
    );
    if (!registrar) throw new Error(`Missing registrar in ${path}`);
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "addRoute"
      ) {
        const [method, route, access] = node.arguments;
        if (!ts.isStringLiteral(method) || !ts.isStringLiteral(route))
          throw new Error(`Nonliteral HTTP operation in ${path}`);
        const key = `${method.text.toUpperCase()} ${route.text}`;
        if (routes.has(key)) throw new Error(`Duplicate route: ${key}`);
        routes.set(key, {
          access: access?.getText(source) || "",
          source: relative(repositoryRoot, path),
        });
      }
      ts.forEachChild(node, visit);
    }
    visit(registrar);
  }
  if (!routes.size) throw new Error("No domain HTTP operations found");
  return routes;
}
