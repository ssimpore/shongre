import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const directory = mkdtempSync(resolve(tmpdir(), "shongre-deploy-env-"));
const frontendPath = resolve(directory, "frontend.env");
const backendPath = resolve(directory, "backend.env");
const tokenPath = resolve(directory, "tunnel-token");
const environment = "staging";
const environmentId = "shongre-staging";

const frontend = `APP_ENV=${environment}
ENVIRONMENT_ID=${environmentId}
PUBLIC_FR_URL=https://staging.shongre.example
PUBLIC_INTL_URL=https://staging-intl.shongre.example
API_URL=https://api-staging.shongre.example
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false
`;
const backend = `APP_ENV=${environment}
ENVIRONMENT_ID=${environmentId}
API_ENVIRONMENT_ID=${environmentId}
DATABASE_ENVIRONMENT_ID=${environmentId}
SUPABASE_ENVIRONMENT_ID=${environmentId}
STORAGE_ENVIRONMENT_ID=${environmentId}
`;

function writePrivate(path, value) {
  writeFileSync(path, value, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function run(expectedStatus) {
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/validate-deployment-env.mjs"),
      environment,
      environmentId,
      frontendPath,
      backendPath,
      tokenPath,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== expectedStatus) {
    throw new Error(
      result.stderr || result.stdout || `unexpected status ${result.status}`,
    );
  }
}

try {
  writePrivate(frontendPath, frontend);
  writePrivate(backendPath, backend);
  writePrivate(tokenPath, "test-token\n");
  run(0);

  writePrivate(
    frontendPath,
    `${frontend}DATABASE_URL=postgresql://forbidden\n`,
  );
  run(1);

  writePrivate(frontendPath, frontend);
  writePrivate(
    backendPath,
    backend.replace(
      `DATABASE_ENVIRONMENT_ID=${environmentId}`,
      "DATABASE_ENVIRONMENT_ID=shongre-production",
    ),
  );
  run(1);

  writePrivate(backendPath, backend);
  chmodSync(tokenPath, 0o644);
  run(1);

  console.log(
    "Deployment environment isolation and permission invariants passed.",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
