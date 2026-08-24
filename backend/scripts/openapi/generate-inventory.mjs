import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../../..");
const specificationPath = resolve(
  repositoryRoot,
  "backend/openapi/openapi.json",
);
const outputPath = resolve(
  repositoryRoot,
  "backend/docs/generated/endpoint-inventory.md",
);
const specificationSource = await readFile(specificationPath, "utf8");
const specification = JSON.parse(specificationSource);
const operations = [];

for (const [path, pathItem] of Object.entries(specification.paths)) {
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = pathItem[method];
    if (!operation) continue;
    operations.push({
      tag: operation.tags?.[0] || "Other",
      method: method.toUpperCase(),
      path,
      operationId: operation.operationId,
      access: operation["x-shongre-access"] || "unknown",
      permission: operation["x-shongre-permission"] || "—",
      success: Object.keys(operation.responses).find((status) =>
        /^[23]\d\d$/.test(status),
      ),
    });
  }
}

operations.sort((left, right) =>
  [left.tag, left.path, left.method]
    .join("\0")
    .localeCompare([right.tag, right.path, right.method].join("\0")),
);

const hash = createHash("sha256")
  .update(specificationSource)
  .digest("hex")
  .slice(0, 16);
const lines = [
  "# Canonical endpoint inventory",
  "",
  "> Generated from `backend/openapi/openapi.json`. Do not edit by hand.",
  "",
  `- Contract version: \`${specification.info.version}\``,
  `- API base path: \`${specification.servers[0].url}\``,
  `- Operations: **${operations.length}**`,
  `- Specification SHA-256: \`${hash}\``,
  "",
];

for (const tag of [...new Set(operations.map((operation) => operation.tag))]) {
  lines.push(`## ${tag}`, "");
  lines.push(
    "| Method | Path | Operation ID | Access | Permission | Success |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const operation of operations.filter((item) => item.tag === tag)) {
    lines.push(
      `| \`${operation.method}\` | \`${operation.path}\` | \`${operation.operationId}\` | \`${operation.access}\` | ${operation.permission === "—" ? "—" : `\`${operation.permission}\``} | \`${operation.success}\` |`,
    );
  }
  lines.push("");
}

const output = `${lines.join("\n")}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error("Generated endpoint inventory is stale.");
    process.exit(1);
  }
  console.log(
    `Endpoint inventory is current (${operations.length} operations).`,
  );
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output);
  console.log(
    `Generated endpoint inventory (${operations.length} operations).`,
  );
}
