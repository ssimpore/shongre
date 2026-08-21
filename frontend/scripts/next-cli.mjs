#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const frontendRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(frontendRoot, "..");
const envPath = existsSync(resolve(repositoryRoot, ".env"))
  ? resolve(repositoryRoot, ".env")
  : resolve(repositoryRoot, ".env.example");

for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!match || process.env[match[1]] !== undefined) continue;
  process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

process.env.NEXT_PUBLIC_DATA_MODE ??= process.env.VITE_DATA_MODE ?? "demo";
process.env.NEXT_PUBLIC_API_URL ??= process.env.VITE_API_URL ?? "";

const command = process.argv[2] ?? "dev";
const args = [
  resolve(repositoryRoot, "node_modules/next/dist/bin/next"),
  command,
  ...process.argv.slice(3),
];
if (command === "dev" || command === "start") {
  const host = process.env.FRONTEND_HOST;
  const port = process.env.FRONTEND_PORT;
  if (!host || !port)
    throw new Error("FRONTEND_HOST and FRONTEND_PORT are required.");
  args.push("--hostname", host, "--port", port);
}

const child = spawn(process.execPath, args, {
  cwd: frontendRoot,
  env: process.env,
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
