import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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
  const [makefile, developmentScript, composeScript, config, database, ci] =
    await Promise.all([
      read("Makefile"),
      read("scripts/dev.sh"),
      read("scripts/compose.sh"),
      read("backend/supabase/config.toml.template"),
      read("scripts/database.sh"),
      read(".github/workflows/ci.yml"),
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
    "db-types-check",
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
  assert.match(config, /\[db\.migrations\]\s+enabled = false/);
  assert.match(config, /\[db\.seed\]\s+enabled = false/);
  assert.match(
    database,
    /supabase db reset[^\n]+--no-seed\n\s+resolved_database_url="\$\(DATABASE_URL= local_database_url\)"\n\s+DATABASE_URL="\$resolved_database_url" "\$SHONGRE_ROOT\/scripts\/database\.sh" migrate/,
  );
  assert.match(ci, /make supabase-up\s+make db-reset/);
  assert.match(ci, /run: make db-types-check/);
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
    /scripts\/database\.sh" migrate\s+make --no-print-directory db-types\s+"\$SHONGRE_ROOT\/scripts\/database\.sh" seed/,
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

async function temporaryWorkspace(t) {
  const directory = await mkdtemp(join(tmpdir(), "shongre-dev-contract-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function executable(path, body) {
  await writeFile(path, `#!/bin/bash\n${body}\n`, { mode: 0o755 });
}

test("local development starts Docker Desktop only when its daemon is stopped", async (t) => {
  const directory = await temporaryWorkspace(t);
  const bin = join(directory, "bin");
  await mkdir(bin);
  const state = join(directory, "docker-ready");
  const launches = join(directory, "docker-launches");
  await executable(join(bin, "docker"), '[[ -f "$TEST_DOCKER_STATE" ]]');
  await executable(
    join(bin, "open"),
    'printf "launch\\n" >> "$TEST_DOCKER_LAUNCHES"; : > "$TEST_DOCKER_STATE"',
  );
  await executable(join(bin, "uname"), "printf 'Darwin\\n'");
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    TEST_DOCKER_STATE: state,
    TEST_DOCKER_LAUNCHES: launches,
  };
  const run = () =>
    spawnSync(
      "/bin/bash",
      [
        "-c",
        `source '${fileURLToPath(new URL("scripts/utils.sh", root))}'; shongre_ensure_docker_for_dev`,
      ],
      { env, encoding: "utf8", timeout: 5000 },
    );

  await writeFile(state, "");
  assert.equal(run().status, 0);
  await assert.rejects(readFile(launches));
  await unlink(state);
  assert.equal(run().status, 0);
  assert.equal(await readFile(launches, "utf8"), "launch\n");
});

async function runLauncher(
  t,
  { mode = "web", reusable = false, typesExit = 0, environment = "local" } = {},
) {
  const directory = await temporaryWorkspace(t);
  for (const name of ["scripts", "bin", ".runtime"]) {
    await mkdir(join(directory, name));
  }
  await cp(new URL("scripts/dev.sh", root), join(directory, "scripts/dev.sh"));
  await writeFile(join(directory, ".runtime/supabase.env"), "");
  await writeFile(join(directory, "events"), "");
  await writeFile(
    join(directory, "scripts/env.sh"),
    "export BACKEND_DATA_MODE=database\n",
  );
  await writeFile(
    join(directory, "scripts/utils.sh"),
    `
shongre_info() { :; }
shongre_pass() { :; }
shongre_fail() { :; }
shongre_ensure_docker_for_dev() { printf '%s\n' docker-ready >> "$TEST_EVENTS"; }
shongre_pid_file() { printf '%s/.runtime/%s.pid' "$SHONGRE_ROOT" "$1"; }
shongre_service_port() { printf none; }
`,
  );
  for (const name of [
    "env-check",
    "compose",
    "redis",
    "supabase",
    "database",
    "service",
    "service-urls",
    "status",
  ]) {
    await executable(
      join(directory, `scripts/${name}.sh`),
      `printf '%s\\n' '${name}'" $*" >> "$TEST_EVENTS"`,
    );
  }
  await executable(join(directory, "scripts/health.sh"), "exit 0");
  await executable(join(directory, "bin/node"), "printf 'matching\\n'");
  await executable(join(directory, "bin/curl"), "exit 0");
  // End the otherwise persistent launcher after readiness; no real services run.
  await executable(join(directory, "bin/sleep"), "exit 77");
  await executable(
    join(directory, "bin/make"),
    `
target="\${@: -1}"
printf 'make %s\\n' "$target" >> "$TEST_EVENTS"
if [[ "$target" == db-types ]]; then exit "$TEST_TYPES_EXIT"; fi
`,
  );
  if (reusable) {
    for (const name of ["backend", "worker", "frontend", "metro"]) {
      await writeFile(
        join(directory, `.runtime/${name}.pid.fingerprint`),
        "matching\n",
      );
    }
  }
  const result = spawnSync(
    "/bin/bash",
    [join(directory, "scripts/dev.sh"), mode],
    {
      cwd: directory,
      env: {
        PATH: `${join(directory, "bin")}:${process.env.PATH}`,
        SHONGRE_ROOT: directory,
        APP_ENV: environment,
        DATABASE_INFRA_MODE: environment === "local" ? "local" : "hosted",
        TEST_EVENTS: join(directory, "events"),
        TEST_TYPES_EXIT: String(typesExit),
        BACKEND_HOST: "localhost",
        BACKEND_PORT: "3201",
        FRONTEND_HOST: "localhost",
        FRONTEND_PORT: "3202",
        EXPO_HOST: "localhost",
        EXPO_METRO_PORT: "3203",
      },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  return {
    ...result,
    events: await readFile(join(directory, "events"), "utf8"),
  };
}

for (const mode of ["web", "mobile", "all"]) {
  test(`${mode} launcher synchronizes types between migration and seed, before starting services`, async (t) => {
    const result = await runLauncher(t, { mode });
    assert.equal(result.status, 77, result.stderr);
    assert.match(
      result.events,
      /docker-ready\ncompose prune-stale[\s\S]*database migrate\nmake db-types\ndatabase seed\nservice start backend/,
    );
    assert.equal(result.events.match(/make db-types/g)?.length, 1);
  });
}

test("failed type generation prevents seeding and application startup", async (t) => {
  const result = await runLauncher(t, { typesExit: 42 });
  assert.equal(result.status, 42, result.stderr);
  assert.match(result.events, /database migrate\nmake db-types/);
  assert.doesNotMatch(result.events, /database seed|service start/);
});

test("healthy stack reuse still synchronizes types without restarting services", async (t) => {
  const result = await runLauncher(t, { mode: "all", reusable: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.events, /make db-types\nservice-urls/);
  assert.doesNotMatch(
    result.events,
    /stop-all|database migrate|database seed|service start/,
  );
});

test("failed type generation cannot report successful healthy-stack reuse", async (t) => {
  const result = await runLauncher(t, { reusable: true, typesExit: 42 });
  assert.equal(result.status, 42, result.stderr);
  assert.match(result.events, /make db-types/);
  assert.doesNotMatch(result.events, /stop-all|service-urls|service start/);
});

test("hosted development does not generate local schema artifacts", async (t) => {
  const result = await runLauncher(t, { environment: "development" });
  assert.equal(result.status, 77, result.stderr);
  assert.doesNotMatch(result.events, /db-types|database migrate|database seed/);
});

test("database type generation repairs drift, preserves matching files and fails without overwriting valid output", async (t) => {
  const directory = await temporaryWorkspace(t);
  for (const path of [
    "backend/scripts/generate-types",
    "backend/src/generated",
    "bin",
  ]) {
    await mkdir(join(directory, path), { recursive: true });
  }
  await writeFile(join(directory, "package.json"), '{"type":"module"}');
  await symlink(
    fileURLToPath(new URL("node_modules", root)),
    join(directory, "node_modules"),
  );
  const script = join(
    directory,
    "backend/scripts/generate-types/generate-types.ts",
  );
  await cp(
    new URL("backend/scripts/generate-types/generate-types.ts", root),
    script,
  );
  const output = join(directory, "backend/src/generated/database.types.ts");
  await executable(
    join(directory, "bin/supabase"),
    `
if [[ "$TEST_CLI_FAILURE" == true ]]; then printf 'database unavailable\\n' >&2; exit 1; fi
printf 'export type Database = { public: { Tables: {} } };\\n'
`,
  );
  const generate = (args = [], fail = false) =>
    spawnSync(process.execPath, ["--import", "tsx", script, ...args], {
      cwd: directory,
      env: {
        PATH: `${join(directory, "bin")}:${process.env.PATH}`,
        DATABASE_URL: "postgresql://localhost/test",
        TEST_CLI_FAILURE: String(fail),
      },
      encoding: "utf8",
      // Cold tsx and Prettier startup can exceed ten seconds while the brand
      // gate is generating and indexing its platform artwork in parallel.
      timeout: 30000,
    });
  await writeFile(output, "stale fixture\n");
  assert.equal(generate(["--check"]).status, 1);
  assert.equal(await readFile(output, "utf8"), "stale fixture\n");
  assert.equal(generate().status, 0);
  const generated = await readFile(output, "utf8");
  assert.match(generated, /export type Database/);
  const oldTime = new Date("2000-01-01T00:00:00Z");
  await utimes(output, oldTime, oldTime);
  assert.equal(generate().status, 0);
  assert.equal(generate(["--check"]).status, 0);
  assert.equal((await stat(output)).mtimeMs, oldTime.getTime());
  assert.equal(generate([], true).status, 1);
  assert.equal(await readFile(output, "utf8"), generated);
  assert.equal((await stat(output)).mtimeMs, oldTime.getTime());
  await unlink(output);
  assert.equal(generate().status, 0);
  assert.equal(await readFile(output, "utf8"), generated);
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

  assert.equal(packageJson.devDependencies.supabase, "^2.117.0");
  assert.match(gitignore, /^\.runtime\/$/m);
  assert.match(service, /source "\$SHONGRE_ROOT\/\.runtime\/supabase\.env"/);
  assert.match(service, /run make supabase-up/);
  assert.match(supabase, /local Supabase requires at least 5 GiB/);
  assert.match(supabase, /shongre_require_docker_daemon/);
  const utils = await read("scripts/utils.sh");
  // The daemon probe stays bounded: a slower warm-up attempt is allowed, but
  // the confirming probe is capped at ten seconds.
  assert.match(utils, /spawnSync\("docker",[\s\S]*?\n\s*timeout,/);
  assert.match(utils, /shongre_docker_daemon_ready 10000/);
  assert.match(utils, /open -a Docker/);
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
