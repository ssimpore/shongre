import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const profiles = [
  "local",
  "test",
  "preview",
  "development",
  "staging",
  "production",
];
const secretSentinel = "local-only-secret-must-not-be-loaded";

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "shongre-environment-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const path of [
    "Makefile",
    "scripts/env.sh",
    "scripts/env-check.sh",
    "scripts/utils.sh",
    "scripts/lib/environment-profile.sh",
    "scripts/dev.sh",
    "scripts/service.sh",
    "scripts/service-urls.sh",
    "scripts/compose.sh",
    "scripts/deploy.sh",
    "scripts/remote-health.sh",
    "frontend/scripts/next-cli.mjs",
    ...profiles.filter((p) => p !== "local").map((p) => `.env.${p}`),
  ]) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    cpSync(join(root, path), join(dir, path));
  }
  cpSync(join(root, ".env.example"), join(dir, ".env.local"));
  writeFileSync(join(dir, ".env"), `LOCAL_ONLY_SENTINEL=${secretSentinel}\n`);
  mkdirSync(join(dir, "node_modules/@shongre"), { recursive: true });
  symlinkSync(
    join(root, "packages/contracts"),
    join(dir, "node_modules/@shongre/contracts"),
  );
  symlinkSync(join(root, "node_modules/tsx"), join(dir, "node_modules/tsx"));
  return dir;
}

function run(dir, script, env = {}) {
  // Never inherit the operator's profile, credentials, local override files,
  // shell startup hooks, or running services into the synthetic matrix.
  return spawnSync("/bin/bash", ["-eu", "-o", "pipefail", "-c", script], {
    cwd: dir,
    env: { PATH: process.env.PATH, HOME: dir, ...env },
    encoding: "utf8",
    timeout: 30_000,
  });
}

function succeeds(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

function rejects(result, pattern) {
  assert.notEqual(result.status, 0, "invalid configuration was accepted");
  assert.match(result.stdout + result.stderr, pattern);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    new RegExp(secretSentinel),
  );
}

function bindings(profile) {
  const env = { SHONGRE_ENV: profile };
  if (profile === "preview") {
    Object.assign(env, {
      ENVIRONMENT_ID: "shongre-preview-validation",
      PUBLIC_FR_URL: "https://preview.shongre.invalid",
      PUBLIC_INTL_URL: "https://preview-intl.shongre.invalid",
      API_URL: "https://api-preview.shongre.invalid",
    });
    for (const key of ["API", "DATABASE", "SUPABASE", "STORAGE"])
      env[`${key}_ENVIRONMENT_ID`] = env.ENVIRONMENT_ID;
  }
  if (!["local", "test"].includes(profile))
    Object.assign(env, {
      REDIS_URL: `rediss://matrix:secret@redis-${profile}.shongre.invalid:6380`,
      DATABASE_URL: `postgresql://matrix:matrix@db-${profile}.shongre.invalid:5432/shongre`,
      SUPABASE_PROJECT_REF: `matrix-${profile}`,
      EXPECTED_SUPABASE_PROJECT_REF: `matrix-${profile}`,
      SUPABASE_URL: `https://matrix-${profile}.supabase.co`,
      SUPABASE_ANON_KEY: "matrix-validation-public-anon-value",
      SUPABASE_SERVICE_ROLE_KEY: "matrix-validation-server-value",
    });
  if (["development", "staging", "production"].includes(profile))
    Object.assign(env, {
      JWT_SECRET: "matrix-validation-jwt-secret-123456789",
      MFA_ENCRYPTION_KEY: "matrix-validation-mfa-secret-123456789",
      HANDOVER_PIN_PEPPER: "matrix-handover-pin-pepper-value-123456",
      PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, "a").toString(
        "base64",
      ),
      DIGITAL_FULFILLMENT_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, "b").toString(
        "base64",
      ),
    });
  if (["staging", "production"].includes(profile)) {
    Object.assign(env, {
      AUTH_EMAIL_DELIVERY_URL: "https://email.shongre.invalid/send",
      AUTH_EMAIL_DELIVERY_TOKEN: "matrix-email-token",
      STRIPE_SECRET_KEY:
        profile === "production" ? "sk_live_matrix" : "sk_test_matrix",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        profile === "production" ? "pk_live_matrix" : "pk_test_matrix",
      STRIPE_WEBHOOK_SECRET: "whsec_matrix",
      STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_connect_matrix",
      COMPLIANCE_WEBHOOK_SECRET: "matrix-compliance",
      EMAIL_RECIPIENT_ALLOWLIST: "matrix-recipient@shongre.invalid",
      KYC_PROVIDER_BASE_URL: "https://identity.shongre.invalid",
      KYC_PROVIDER_API_TOKEN: "matrix-identity",
      BUSINESS_REGISTRY_API_URL: "https://registry.shongre.invalid",
      BUSINESS_REGISTRY_API_TOKEN: "matrix-registry",
      GEMINI_API_KEY: "matrix-gemini",
      GEMINI_MODEL: "gemini-matrix",
      MALWARE_SCAN_URL: "https://scanner.shongre.invalid/scan",
      MALWARE_SCAN_TOKEN: "matrix-malware-scanner-token",
      NEXT_PUBLIC_MAP_TILE_URL:
        "https://tiles.shongre.invalid/{z}/{x}/{y}.png?key=matrix",
      NEXT_PUBLIC_MAP_TILE_ATTRIBUTION: "&copy; Matrix Maps",
    });
    for (const app of ["MARKETPLACE", "SOLUTIONS", "PROSPECTS", "FACTURATION"])
      env[`SHONGRE_${app}_ORIGIN`] =
        `https://${app.toLowerCase()}-${profile}.shongre.invalid`;
  }
  return env;
}

for (const profile of profiles) {
  test(`${profile}: committed configuration passes with isolated resource bindings`, (t) => {
    const dir = fixture(t);
    succeeds(run(dir, "scripts/env-check.sh", bindings(profile)));
    const result = run(
      dir,
      'source scripts/env.sh; test "$APP_ENV" = "$SHONGRE_ENV_LOADED"; test "$NEXT_PUBLIC_APP_ENV" = "$APP_ENV"; test "$EXPO_PUBLIC_APP_ENV" = "$APP_ENV"; test "$EXPO_PUBLIC_API_URL" = "${API_URL}/api/v1"',
      bindings(profile),
    );
    succeeds(result);
  });
}

for (const profile of ["staging", "production"]) {
  test(`${profile}: refuses OpenStreetMap's donated tile servers`, (t) => {
    /*
     * The default basemap is right for a laptop and forbidden for a shipped
     * product: OSM's usage policy does not permit a distributed application to
     * send every visitor at their donated capacity, and the day they enforce
     * it, every map in Shongre goes blank at once. The rule is checked here
     * rather than remembered, because the value that breaks it is also the
     * value that works perfectly in development.
     */
    const dir = fixture(t);
    rejects(
      run(dir, "scripts/env-check.sh", {
        ...bindings(profile),
        NEXT_PUBLIC_MAP_TILE_URL:
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      }),
      /must not use OpenStreetMap's donated tile servers/,
    );
  });

  test(`${profile}: requires a basemap provider at all`, (t) => {
    const dir = fixture(t);
    rejects(
      run(dir, "scripts/env-check.sh", {
        ...bindings(profile),
        NEXT_PUBLIC_MAP_TILE_URL: "",
      }),
      /NEXT_PUBLIC_MAP_TILE_URL is required/,
    );
  });
}

for (const [alias, profile] of [
  ["dev", "development"],
  ["prod", "production"],
  ["staging", "staging"],
  ["local", "local"],
]) {
  test(`make ENVIRONMENT=${alias} selects ${profile} and prints no credentials`, (t) => {
    const dir = fixture(t);
    const result = run(
      dir,
      `make --no-print-directory env-info ENVIRONMENT=${alias}`,
      bindings(profile),
    );
    succeeds(result);
    assert.match(result.stdout, new RegExp(`Environment +${profile}`));
    assert.doesNotMatch(
      result.stdout,
      /matrix-validation-(?:jwt|mfa|server)|sk_live_|sk_test_|local-only-secret/,
    );
  });
}

test("non-local profiles never read generic local files or Supabase runtime credentials", (t) => {
  const dir = fixture(t);
  mkdirSync(join(dir, ".runtime"));
  writeFileSync(
    join(dir, ".runtime/supabase.env"),
    `GENERATED_ONLY_SENTINEL=${secretSentinel}\n`,
  );
  for (const profile of profiles.filter((p) => p !== "local")) {
    succeeds(
      run(
        dir,
        'source scripts/env.sh; test -z "${LOCAL_ONLY_SENTINEL:-}"; test -z "${GENERATED_ONLY_SENTINEL:-}"',
        bindings(profile),
      ),
    );
  }
});

test("generated local Supabase credentials replace blank profile placeholders", (t) => {
  const dir = fixture(t);
  mkdirSync(join(dir, ".runtime"));
  writeFileSync(
    join(dir, ".runtime/supabase.env"),
    [
      "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      "SUPABASE_URL=http://127.0.0.1:54321",
      "SUPABASE_ANON_KEY=generated-anon-key",
      "SUPABASE_SERVICE_ROLE_KEY=generated-service-role-key",
      "JWT_SECRET=generated-local-jwt-secret",
      "",
    ].join("\n"),
  );
  succeeds(
    run(
      dir,
      'source scripts/env.sh; test "$SUPABASE_ANON_KEY" = generated-anon-key; test "$SUPABASE_SERVICE_ROLE_KEY" = generated-service-role-key; test "$JWT_SECRET" = generated-local-jwt-secret',
      { SHONGRE_ENV: "local" },
    ),
  );
});

test("profile overrides and intentionally empty shell values take precedence without evaluation", (t) => {
  const dir = fixture(t);
  writeFileSync(
    join(dir, ".env.development.local"),
    "OVERRIDE_TEST=profile\nEMPTY_TEST=profile\nLITERAL_TEST=$(touch should-not-exist)\n",
  );
  succeeds(
    run(
      dir,
      'source scripts/env.sh; test "$OVERRIDE_TEST" = profile; test -z "$EMPTY_TEST"; test "$LITERAL_TEST" = \'$(touch should-not-exist)\'; test ! -e should-not-exist',
      { SHONGRE_ENV: "dev", EMPTY_TEST: "" },
    ),
  );
});

test("a loaded profile is idempotent but cannot be switched in place", (t) => {
  const dir = fixture(t);
  succeeds(
    run(dir, "source scripts/env.sh; source scripts/env.sh", {
      SHONGRE_ENV: "local",
    }),
  );
  rejects(
    run(
      dir,
      "source scripts/env.sh; SHONGRE_ENV=staging; source scripts/env.sh",
      { SHONGRE_ENV: "local" },
    ),
    /different environment was already loaded/,
  );
  rejects(
    run(dir, "scripts/env-check.sh", {
      SHONGRE_ENV: "dev",
      APP_ENV: "production",
    }),
    /APP_ENV conflicts/,
  );
  succeeds(
    run(
      dir,
      'SHONGRE_ENV=invalid; if source scripts/env.sh; then exit 1; fi; test -z "${SHONGRE_ENV_LOADED:-}"; SHONGRE_ENV=local; source scripts/env.sh',
    ),
  );
});

const invalidCases = [
  ["local", { BACKEND_DATA_MODE: "demo" }, /BACKEND_DATA_MODE must/],
  ["staging", { DATABASE_INFRA_MODE: "local" }, /DATABASE_INFRA_MODE must/],
  ["production", { BACKEND_DATA_MODE: "demo" }, /BACKEND_DATA_MODE must/],
  [
    "development",
    { STRIPE_SECRET_KEY: "sk_live_matrix" },
    /cannot use live credentials/,
  ],
  [
    "development",
    { API_ENVIRONMENT_ID: "shongre-production" },
    /must match ENVIRONMENT_ID/,
  ],
  [
    "development",
    { EXPO_PUBLIC_FR_URL: "https://wrong.shongre.invalid" },
    /resource binding/,
  ],
  [
    "staging",
    { NEXT_PUBLIC_API_URL: "https://wrong.shongre.invalid/api/v1" },
    /resource binding/,
  ],
  [
    "staging",
    { EXPECTED_SUPABASE_PROJECT_REF: "wrong-project" },
    /resource binding/,
  ],
  [
    "development",
    { SUPABASE_URL: "https://wrong-project.supabase.co" },
    /resource binding/,
  ],
  [
    "development",
    { DATABASE_URL: `postgresql://user:${secretSentinel}@127.0.0.1/db` },
    /resource binding/,
  ],
  [
    "staging",
    { DATABASE_URL: `postgresql://user:${secretSentinel}@[::1]/db` },
    /resource binding/,
  ],
  ["development", { DATABASE_URL: secretSentinel }, /resource binding/],
  [
    "staging",
    { DATABASE_URL: "postgresql://user:matrix@127.1/db" },
    /resource binding/,
  ],
  [
    "staging",
    { DATABASE_URL: "postgresql://user:matrix@2130706433/db" },
    /resource binding/,
  ],
  [
    "staging",
    { DATABASE_URL: "postgresql://user:matrix@[::]/db" },
    /resource binding/,
  ],
  [
    "development",
    { NEXT_PUBLIC_DATABASE_URL: secretSentinel },
    /secret-like variable/,
  ],
  ["development", { SUPABASE_URL: "https://localhost" }, /resource binding/],
  ["production", { JWT_SECRET: "" }, /JWT_SECRET is required/],
];
for (const [profile, override, pattern] of invalidCases) {
  test(`${profile} rejects unsafe ${Object.keys(override)[0]}=${Object.values(override)[0] === secretSentinel ? "malformed" : "override"}`, (t) => {
    rejects(
      run(fixture(t), "scripts/env-check.sh", {
        ...bindings(profile),
        ...override,
      }),
      pattern,
    );
  });
}

test("hosted URL discovery reports selected public origins, not loopback listeners", (t) => {
  const result = run(
    fixture(t),
    "make --no-print-directory urls ENVIRONMENT=dev",
    bindings("development"),
  );
  succeeds(result);
  assert.match(result.stdout, /https:\/\/dev\.shongre\.fr/);
  assert.match(result.stdout, /https:\/\/api-dev\.shongre\.fr\/api\/v1/);
  assert.doesNotMatch(
    result.stdout,
    /127\.0\.0\.1|0\.0\.0\.0|localhost|matrix-validation-server/,
  );
});

test("invalid hosted startup and production launch stop before touching tracked services", (t) => {
  const dir = fixture(t);
  // Any cleanup/startup attempt fails the test before it can touch a process.
  writeFileSync(
    join(dir, "scripts/service.sh"),
    "#!/usr/bin/env bash\necho UNEXPECTED_SERVICE_MUTATION >&2\nexit 99\n",
  );
  for (const [profile, env, pattern] of [
    ["dev", {}, /required/],
    ["staging", {}, /required/],
    ["prod", bindings("production"), /production cannot run/],
  ]) {
    const result = run(
      dir,
      `make --no-print-directory dev ENVIRONMENT=${profile}`,
      env,
    );
    rejects(result, pattern);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /UNEXPECTED_SERVICE_MUTATION/,
    );
  }
  rejects(
    run(
      dir,
      "make --no-print-directory docker-start ENVIRONMENT=prod",
      bindings("production"),
    ),
    /local Docker commands require/,
  );
  rejects(
    run(dir, "make --no-print-directory env ENVIRONMENT=staging"),
    /initializes local only/,
  );
});

test("production cannot bypass the protected launcher using an individual service", (t) => {
  rejects(
    run(
      fixture(t),
      "scripts/service.sh foreground backend auto -- false",
      bindings("production"),
    ),
    /production services require/,
  );
});

test("Web launcher preserves APP_ENV and does not reload local files for hosted/test profiles", (t) => {
  const dir = fixture(t);
  const nextBin = join(dir, "node_modules/next/dist/bin");
  mkdirSync(nextBin, { recursive: true });
  writeFileSync(
    join(nextBin, "next"),
    "console.log(JSON.stringify({ app: process.env.APP_ENV, node: process.env.NODE_ENV, sentinel: process.env.LOCAL_ONLY_SENTINEL || null }));",
  );
  for (const profile of profiles.filter((p) => p !== "local")) {
    const result = run(
      dir,
      "source scripts/env.sh; node frontend/scripts/next-cli.mjs dev",
      bindings(profile),
    );
    succeeds(result);
    assert.deepEqual(JSON.parse(result.stdout), {
      app: profile,
      node: "development",
      sentinel: null,
    });
  }
});

test("backend test runtime does not reload ignored local credentials", (t) => {
  const dir = fixture(t);
  const configUrl = new URL(
    "../backend/src/app/config/index.ts",
    import.meta.url,
  ).href;
  const result = run(
    dir,
    `source scripts/env.sh; node --import tsx --input-type=module -e 'await import(${JSON.stringify(configUrl)}); if (process.env.LOCAL_ONLY_SENTINEL) process.exit(1)'`,
    bindings("test"),
  );
  succeeds(result);
});

test("deployment aliases use the existing protected workflows without loading local secrets", (t) => {
  const dir = fixture(t);
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "gh"),
    '#!/usr/bin/env bash\n[[ -z "${LOCAL_ONLY_SENTINEL:-}" ]] || exit 99\nprintf "%s\\n" "$*"\n',
    { mode: 0o755 },
  );
  writeFileSync(
    join(bin, "git"),
    '#!/usr/bin/env bash\nif [[ "$1" == rev-parse ]]; then printf "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n"; fi\n',
    { mode: 0o755 },
  );
  for (const [alias, workflow] of [
    ["dev", "build-deploy-dev.yml"],
    ["staging", "promote-staging.yml"],
    ["prod", "deploy-production.yml"],
  ]) {
    const result = run(
      dir,
      `make --no-print-directory deploy ENVIRONMENT=${alias}`,
      { PATH: `${bin}:${process.env.PATH}` },
    );
    succeeds(result);
    assert.match(result.stdout, new RegExp(`workflow run ${workflow}`));
  }
  rejects(
    run(dir, "make --no-print-directory deploy", {
      PATH: `${bin}:${process.env.PATH}`,
    }),
    /Environment must be/,
  );
});
