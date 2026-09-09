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

test("the local environment uses the documented API-only clients", async () => {
  const environment = await read(".env.example");
  const frontendPort = envValue(environment, "FRONTEND_PORT");
  const backendPort = envValue(environment, "BACKEND_PORT");
  const frontendUrl = new URL(envValue(environment, "PUBLIC_FR_URL"));
  const backendUrl = new URL(envValue(environment, "API_URL"));

  assert.match(frontendPort, /^\d+$/);
  assert.match(backendPort, /^\d+$/);
  assert.equal(frontendUrl.port, frontendPort);
  assert.equal(backendUrl.port, backendPort);
  assert.equal(
    envValue(environment, "NEXT_PUBLIC_API_URL"),
    `${backendUrl.origin}/api/v1`,
  );
  assert.equal(envValue(environment, "BACKEND_DATA_MODE"), "database");
  assert.equal(envValue(environment, "DATABASE_INFRA_MODE"), "local");
  assert.equal(
    envValue(environment, "EXPO_PUBLIC_API_URL"),
    `${backendUrl.origin}/api/v1`,
  );
});

test("the Makefile exposes one canonical local Supabase lifecycle", async () => {
  const [makefile, developmentScript, composeScript] = await Promise.all([
    read("Makefile"),
    read("scripts/dev.sh"),
    read("scripts/compose.sh"),
  ]);

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

  assert.doesNotMatch(makefile, /^demo:/m);
  // Both launchers force database mode; `dev` adds Metro to the Web stack.
  assert.match(
    makefile,
    /^dev:.*\n\s*@BACKEND_DATA_MODE=database scripts\/dev\.sh all/m,
  );
  assert.match(
    makefile,
    /^dev-web:.*\n\s*@BACKEND_DATA_MODE=database scripts\/dev\.sh web/m,
  );
  assert.match(
    developmentScript,
    /scripts\/env-check\.sh"[\s\S]*make --no-print-directory stop-all/,
  );
  assert.match(
    developmentScript,
    /scripts\/database\.sh" migrate[\s\S]*scripts\/database\.sh" seed/,
  );
  assert.match(
    composeScript,
    /docker image prune --all --force/,
    "local development must prune unused Docker images before startup",
  );
  assert.doesNotMatch(
    makefile,
    /^(?:infra-start|infra-stop|infra-status|db-start|db-stop|supabase-start|supabase-stop):/m,
  );
});

test("local Supabase tooling is installed and runtime credentials stay ignored", async () => {
  const [packageSource, gitignore, service, supabase, serviceUrls] =
    await Promise.all([
      read("package.json"),
      read(".gitignore"),
      read("scripts/service.sh"),
      read("scripts/supabase.sh"),
      read("scripts/service-urls.sh"),
    ]);
  const packageJson = JSON.parse(packageSource);

  assert.equal(packageJson.devDependencies.supabase, "2.116.0");
  assert.match(gitignore, /^\.runtime\/$/m);
  assert.match(service, /source "\$SHONGRE_ROOT\/\.runtime\/supabase\.env"/);
  assert.match(service, /run make supabase-up/);
  assert.match(supabase, /local Supabase requires at least 5 GiB/);
  assert.match(supabase, /shongre_require_docker_daemon/);
  const utils = await read("scripts/utils.sh");
  // The daemon probe stays bounded: a slower warm-up attempt is allowed, but
  // the confirming probe is capped at ten seconds.
  assert.match(utils, /spawnSync\("docker",[\s\S]*?\n\s*timeout,/);
  assert.match(utils, /probe\(10_000\)/);
  assert.match(utils, /\["version", "--format", "\{\{\.Server\.Version\}\}"\]/);
  const redis = await read("scripts/redis.sh");
  assert.match(redis, /shongre_require_docker_daemon/);
  assert.doesNotMatch(redis, /docker info/);
  assert.match(
    supabase,
    /supabase start --workdir "\$SHONGRE_ROOT\/backend" >\/dev\/null/,
  );
  assert.doesNotMatch(
    supabase,
    /^\s*supabase status --workdir "\$SHONGRE_ROOT\/backend"\s*$/m,
  );
  assert.match(serviceUrls, /Supabase Studio/);
  assert.match(serviceUrls, /Supabase REST/);
  assert.match(serviceUrls, /Supabase Storage/);
  assert.match(serviceUrls, /signed requests only/);
  assert.doesNotMatch(
    serviceUrls,
    /ANON_KEY|SERVICE_ROLE_KEY|ACCESS_KEY_SECRET/,
  );
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
