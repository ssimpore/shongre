import { strict as assert } from "node:assert";
import { test } from "node:test";
import ts from "typescript";
import { collectStaticRoutes } from "./route-inventory.mjs";

const inventory = (source) =>
  collectStaticRoutes(
    ts.createSourceFile(
      "router.tsx",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
  );
test("shared route arrays retain parent scope and ignore unreachable declarations", () => {
  assert.deepEqual(
    [
      ...inventory(`
    const UNUSED = [{path: "not-registered"}];
    const AUTH = [{path: "connexion"}];
    const APP_ROUTES = [{path: "/", children: [...AUTH]}, {path: "/product", children: AUTH}];
  `),
    ],
    ["/", "/connexion", "/product", "/product/connexion"],
  );
});
test("unresolved and cyclic route arrays fail closed", () => {
  assert.throws(() => inventory("const APP_ROUTES = [...MISSING];"));
  assert.throws(() => inventory("const APP_ROUTES = [...APP_ROUTES];"));
  assert.throws(() => inventory("const AUTH = [];"));
});
