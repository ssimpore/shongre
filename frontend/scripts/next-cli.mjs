#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const frontendRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(frontendRoot, "..");
const inheritedKeys = new Set(Object.keys(process.env));
for (const envPath of [
  resolve(repositoryRoot, ".env"),
  resolve(repositoryRoot, ".env.local"),
]) {
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match || inheritedKeys.has(match[1])) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

process.env.NEXT_PUBLIC_DATA_MODE ??= "demo";
process.env.NEXT_PUBLIC_APP_ENV ??= process.env.APP_ENV;
process.env.NEXT_PUBLIC_ENVIRONMENT_ID ??= process.env.ENVIRONMENT_ID;
process.env.NEXT_PUBLIC_FR_URL ??= process.env.PUBLIC_FR_URL;
process.env.NEXT_PUBLIC_INTL_URL ??= process.env.PUBLIC_INTL_URL;
process.env.NEXT_PUBLIC_API_URL ??= `${process.env.API_URL || ""}${process.env.API_PREFIX || "/api/v1"}`;

const command = process.argv[2] ?? "dev";
let childCwd = frontendRoot;
let args = [
  resolve(repositoryRoot, "node_modules/next/dist/bin/next"),
  command,
  ...process.argv.slice(3),
];
if (command === "dev" || command === "start") {
  const host = process.env.FRONTEND_HOST;
  const port = process.env.FRONTEND_PORT;
  if (!host || !port)
    throw new Error("FRONTEND_HOST and FRONTEND_PORT are required.");

  if (command === "start") {
    const standaloneRoot = resolve(frontendRoot, ".next/standalone/frontend");
    const standaloneServer = resolve(standaloneRoot, "server.js");
    if (!existsSync(standaloneServer)) {
      throw new Error(
        "The standalone Web artifact is missing. Run `make frontend-build` first.",
      );
    }

    const standaloneStatic = resolve(standaloneRoot, ".next/static");
    mkdirSync(standaloneStatic, { recursive: true });
    cpSync(resolve(frontendRoot, ".next/static"), standaloneStatic, {
      recursive: true,
      force: true,
    });
    cpSync(resolve(frontendRoot, "public"), resolve(standaloneRoot, "public"), {
      recursive: true,
      force: true,
    });

    process.env.HOSTNAME = host;
    process.env.PORT = port;
    process.env.NODE_ENV = "production";
    childCwd = standaloneRoot;
    args = [standaloneServer, ...process.argv.slice(3)];
  } else {
    args.push("--hostname", host, "--port", port);
  }
}

const child = spawn(process.execPath, args, {
  cwd: childCwd,
  env: process.env,
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
