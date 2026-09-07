#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const packageNames = [
  "contracts",
  "design-tokens",
  "brand",
  "shared",
  "ui",
  "features",
];
const dependencies = {
  contracts: [],
  "design-tokens": [],
  brand: ["contracts", "design-tokens"],
  shared: ["contracts", "design-tokens"],
  ui: ["contracts", "design-tokens", "brand", "shared"],
  features: ["contracts", "design-tokens", "brand", "shared", "ui"],
  frontend: packageNames,
  mobile: packageNames,
  backend: ["contracts", "shared", "brand", "design-tokens"],
};

function owner(file) {
  const parts = file.replaceAll("\\", "/").split("/");
  return parts[0] === "packages" ? parts[1] : parts[0];
}

export function importBoundaryViolation(file, specifier) {
  const source = owner(file);
  let target;
  if (specifier.startsWith("@shongre/")) target = specifier.split("/")[1];
  else if (specifier.startsWith(".") || specifier.startsWith("/")) {
    target = owner(relative(root, resolve(root, dirname(file), specifier)));
  } else if (/^(backend|frontend|mobile)\//.test(specifier))
    target = specifier.split("/")[0];
  if (!target || target === source || !(target in dependencies)) return null;
  if (dependencies[source]?.includes(target)) return null;
  return `${source} must not import ${target}: ${specifier}`;
}

function imports(source, file) {
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const values = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      values.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      values.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return values;
}

function files(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return files(file);
      return /\.(?:[cm]?[jt]sx?)$/.test(file) ? [file] : [];
    },
  );
}

export function checkBoundaries() {
  const roots = [
    "backend/src",
    "frontend/src",
    "frontend/app",
    "mobile/src",
    "mobile/app",
    ...packageNames.map((name) => `packages/${name}/src`),
  ];
  const failures = [];
  let inspected = 0;
  for (const file of roots.flatMap(files)) {
    inspected += 1;
    const source = readFileSync(resolve(root, file), "utf8");
    for (const specifier of imports(source, file)) {
      const violation = importBoundaryViolation(file, specifier);
      if (violation) failures.push(`${file}: ${violation}`);
    }
    if (
      (file.startsWith("frontend/") || file.startsWith("mobile/")) &&
      !/\.test\./.test(file)
    ) {
      if (
        /SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|DATABASE_URL|service_role|createAdminClient/.test(
          source,
        )
      )
        failures.push(
          `${file}: privileged server configuration in client source`,
        );
      if (/@supabase\//.test(source))
        failures.push(
          `${file}: direct Supabase client bypasses the business API`,
        );
    }
  }
  // Manifest edges matter even before the first source import is written.
  for (const name of Object.keys(dependencies)) {
    const directory = packageNames.includes(name) ? `packages/${name}` : name;
    const manifest = JSON.parse(
      readFileSync(resolve(root, directory, "package.json"), "utf8"),
    );
    for (const dependency of Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
    })) {
      const violation = importBoundaryViolation(
        `${directory}/package.json`,
        dependency,
      );
      if (violation) failures.push(`${directory}/package.json: ${violation}`);
    }
  }
  return { inspected, failures };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { inspected, failures } = checkBoundaries();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      `Boundary check passed for ${inspected} backend, Web, native, and shared source files plus workspace manifests.`,
    );
}
