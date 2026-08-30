import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileNodeModules = resolve(mobileRoot, "node_modules");
const nodePath = [mobileNodeModules, process.env.NODE_PATH]
  .filter(Boolean)
  .join(delimiter);
const childEnvironment = { ...process.env, NODE_PATH: nodePath };

if (process.argv[2] === "--check-workspace-resolution") {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "require('@expo/router-server/build/typed-routes'); require.resolve('expo-router/_ctx-shared')",
    ],
    {
      cwd: mobileRoot,
      env: childEnvironment,
      stdio: "inherit",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(
    "Expo workspace runtime dependencies resolve from the mobile app.",
  );
  process.exit(0);
}

const expoCli = require.resolve("expo/bin/cli");
const child = spawn(process.execPath, [expoCli, ...process.argv.slice(2)], {
  cwd: mobileRoot,
  env: childEnvironment,
  stdio: "inherit",
});

child.on("error", (error) => {
  throw error;
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
