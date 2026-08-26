#!/usr/bin/env node

/**
 * Shongre Platform CLI
 * Utility tool for administration, AI testing, and project management.
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync, spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const projectRoot = resolve(rootDir, "..");

const args = process.argv.slice(2);
const command = args[0] || "help";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function getPort() {
  const exported = process.env.FRONTEND_PORT || process.env.PORT;
  if (exported) return parseInt(exported, 10);
  for (const envName of [".env.local", ".env"]) {
    const envPath = resolve(projectRoot, envName);
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf8");
      const match = content.match(/^FRONTEND_PORT\s*=\s*"?([0-9]+)"?/m);
      if (match?.[1]) return parseInt(match[1], 10);
    }
  }
  throw new Error(
    "FRONTEND_PORT is required. Run make env-init from the repository root.",
  );
}

function freePort(port) {
  const result = spawnSync("make", ["free-port", `PORT=${port}`], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function printBanner() {
  console.log(`${colors.cyan}${colors.bright}
  ======================================================
     SHONGRE PLATFORM CLI - Marketplace & Escrow Core   
  ======================================================${colors.reset}\n`);
}

function printHelp() {
  printBanner();
  const port = getPort();
  console.log(`${colors.bright}Usage:${colors.reset}
  node bin/shongre.js <command> [options]
  make <target>

${colors.bright}Available Commands:${colors.reset}
  ${colors.green}dev${colors.reset}             Start Next.js through the root tracked-process tooling on port ${port}
  ${colors.green}free-port${colors.reset}       Safely release a Shongre-owned process from port ${port}
  ${colors.green}build${colors.reset}           Compile production bundle with chunk optimizations
  ${colors.green}test${colors.reset}            Run Vitest unit test suite (RBAC, Escrow, AI, SIRET)
  ${colors.green}test-watch${colors.reset}      Run tests in interactive watch mode
  ${colors.green}lint${colors.reset}            Type-check (tsc --noEmit) + design-token guard
  ${colors.green}check${colors.reset}           Run complete CI pipeline (lint + unit + e2e + build)
  ${colors.green}test-e2e${colors.reset}        Playwright: responsive overflow, axe a11y, journey matrix
  ${colors.green}info${colors.reset}            Display platform environment, versions & configuration
  ${colors.green}ai-test [prompt]${colors.reset} Exercise the AI listing-assistance adapter (demo, deterministic)
  ${colors.green}clean${colors.reset}           Remove build artifacts and cache
  ${colors.green}help${colors.reset}            Show this help manual
`);
}

function runInfo() {
  printBanner();
  const pkg = JSON.parse(
    readFileSync(resolve(rootDir, "package.json"), "utf8"),
  );
  const port = getPort();
  console.log(`${colors.bright}Project Information:${colors.reset}`);
  console.log(`  • Name        : ${pkg.name}`);
  console.log(`  • Version     : ${pkg.version}`);
  console.log(
    `  • Config Port : ${colors.green}${port}${colors.reset} (loaded from .env)`,
  );
  console.log(`  • Node        : ${process.version}`);
  console.log(`  • Platform    : ${process.platform} (${process.arch})`);
  console.log(`  • Root Path   : ${rootDir}`);

  const hasEnv =
    existsSync(resolve(rootDir, ".env")) ||
    existsSync(resolve(rootDir, ".env.local"));
  console.log(
    `  • .env file   : ${hasEnv ? `${colors.green}Detected${colors.reset}` : `${colors.yellow}Missing; run make env-init${colors.reset}`}`,
  );
  console.log(
    `  • Data mode   : ${colors.green}${process.env.NEXT_PUBLIC_DATA_MODE || "demo"}${colors.reset} (frontend runs on local adapters)`,
  );
  // AI runs behind the service contract now, so the browser holds no provider
  // key to report on — credentials belong to backend/ when the HTTP adapter lands.
  console.log(
    `  • AI          : ${colors.dim}deterministic demo adapter (no provider key in the browser)${colors.reset}\n`,
  );
}

function runNpmCommand(script, extraArgs = []) {
  console.log(
    `${colors.dim}> Executing: npm run ${script} ${extraArgs.join(" ")}${colors.reset}\n`,
  );
  const result = spawnSync("npm", ["run", script, ...extraArgs], {
    cwd: rootDir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function runAiTest(promptInput) {
  printBanner();
  const prompt = promptInput || "Vélo de course carbone Shimano 105";
  console.log(
    `${colors.bright}Testing the AI listing assistance adapter...${colors.reset}`,
  );
  console.log(`${colors.dim}Input Prompt:${colors.reset} "${prompt}"\n`);

  try {
    console.log(
      `${colors.yellow}Running listing-assistance & safety-audit validation...${colors.reset}`,
    );
    const result = spawnSync(
      "npx",
      ["vitest", "run", "src/api/adapters/demo/demo-ai.service.test.ts"],
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );

    if (result.status === 0) {
      console.log(
        `\n${colors.green}✔ AI adapter & anti-fraud audit tests passed successfully!${colors.reset}\n`,
      );
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error(
      `${colors.red}Error executing AI test: ${err.message}${colors.reset}`,
    );
    process.exit(1);
  }
}

function runCheck() {
  printBanner();
  console.log(
    `${colors.cyan}${colors.bright}Step 1/4: Type Checking & Design Token Guard...${colors.reset}`,
  );
  runNpmCommand("lint");

  console.log(
    `\n${colors.cyan}${colors.bright}Step 2/4: Running Vitest Test Suite...${colors.reset}`,
  );
  runNpmCommand("test");

  // Responsive overflow, axe accessibility and the journey matrix. Skippable
  // with SKIP_E2E=1 for a fast inner loop, but part of `check` by default —
  // these are the suites that catch layout and a11y regressions, which nothing
  // else in this pipeline can see.
  if (process.env.SKIP_E2E === "1") {
    console.log(
      `\n${colors.yellow}Step 3/4: End-to-end suite skipped (SKIP_E2E=1).${colors.reset}`,
    );
  } else {
    console.log(
      `\n${colors.cyan}${colors.bright}Step 3/4: Running Playwright Suite (responsive, a11y, journeys)...${colors.reset}`,
    );
    runNpmCommand("test:e2e");
  }

  console.log(
    `\n${colors.cyan}${colors.bright}Step 4/4: Running Production Build...${colors.reset}`,
  );
  runNpmCommand("build");

  console.log(
    `\n${colors.green}${colors.bright}✔ All quality checks passed successfully!${colors.reset}\n`,
  );
}

// Router
switch (command) {
  case "dev":
  case "start": {
    const child = spawn("make", ["frontend-dev"], {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      process.exit(code || 0);
    });
    break;
  }
  case "free-port": {
    const port = getPort();
    freePort(port);
    break;
  }
  case "build":
    runNpmCommand("build");
    break;
  case "test":
    runNpmCommand("test");
    break;
  case "test-e2e":
    runNpmCommand("test:e2e");
    break;
  case "test-watch":
    spawnSync("npx", ["vitest"], { cwd: rootDir, stdio: "inherit" });
    break;
  case "lint":
    runNpmCommand("lint");
    break;
  case "check":
  case "ci":
    runCheck();
    break;
  case "clean":
    runNpmCommand("clean");
    break;
  case "info":
    runInfo();
    break;
  case "ai-test":
    runAiTest(args.slice(1).join(" "));
    break;
  case "help":
  case "--help":
  case "-h":
  default:
    printHelp();
    break;
}
