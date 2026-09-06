import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

function envValue(source, name) {
  const match = source.match(new RegExp(`^${name}=(.*)$`, "m"));
  assert.ok(match, `${name} must exist in .env.example`);
  return match[1];
}

test("the local environment uses the documented Web, API, and data modes", async () => {
  const environment = await read(".env.example");
  const frontendPort = envValue(environment, "FRONTEND_PORT");
  const backendPort = envValue(environment, "BACKEND_PORT");
  const frontendUrl = new URL(envValue(environment, "PUBLIC_FR_URL"));
  const backendUrl = new URL(envValue(environment, "API_URL"));

  assert.match(frontendPort, /^\d+$/);
  assert.match(backendPort, /^\d+$/);
  assert.equal(frontendUrl.port, frontendPort);
  assert.equal(backendUrl.port, backendPort);
  assert.equal(envValue(environment, "NEXT_PUBLIC_DATA_MODE"), "demo");
  assert.equal(envValue(environment, "BACKEND_DATA_MODE"), "database");
  assert.equal(envValue(environment, "DATABASE_INFRA_MODE"), "local");
});

test("the Makefile exposes one canonical local Supabase lifecycle", async () => {
  const makefile = await read("Makefile");

  for (const target of [
    "frontend",
    "backend",
    "worker",
    "install",
    "supabase-up",
    "supabase-down",
    "supabase-status",
    "db-migrate",
    "db-seed",
    "test",
    "check",
  ]) {
    assert.match(
      makefile,
      new RegExp(`^${target}:`, "m"),
      `missing make ${target}`,
    );
  }

  assert.match(
    makefile,
    /^\s*@NEXT_PUBLIC_DATA_MODE=demo scripts\/service\.sh foreground frontend/m,
  );
  assert.doesNotMatch(
    makefile,
    /^(?:infra-start|infra-stop|infra-status|db-start|db-stop|supabase-start|supabase-stop):/m,
  );
});

test("local Supabase tooling is installed and runtime credentials stay ignored", async () => {
  const [packageSource, gitignore, service] = await Promise.all([
    read("package.json"),
    read(".gitignore"),
    read("scripts/service.sh"),
  ]);
  const packageJson = JSON.parse(packageSource);

  assert.equal(packageJson.devDependencies.supabase, "2.116.0");
  assert.match(gitignore, /^\.runtime\/$/m);
  assert.match(service, /source "\$SHONGRE_ROOT\/\.runtime\/supabase\.env"/);
  assert.match(service, /run make supabase-up/);
});

test("runtime and deployment tooling consume application ports from the environment", async () => {
  const runtimeSources = await Promise.all(
    [
      "Makefile",
      "compose.yaml",
      "compose.local.yaml",
      "frontend/Dockerfile",
      "backend/Dockerfile",
      "frontend/scripts/next-cli.mjs",
      "scripts/compose.sh",
      "scripts/host-deploy.sh",
      ".github/workflows/ci.yml",
    ].map(read),
  );

  for (const source of runtimeSources) {
    assert.doesNotMatch(source, /127\.0\.0\.1:(?:3000|4000)/);
    assert.doesNotMatch(source, /(?:frontend|backend):(?:3000|4000)/);
    assert.doesNotMatch(source, /(?:PORT|PORT:-)=(?:3000|4000)/);
    assert.doesNotMatch(source, /(?:3000|4000):(?:3000|4000)/);
  }
});
