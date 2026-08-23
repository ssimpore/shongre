import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Architecture & Boundary Integrity", () => {
  const rootDir = path.resolve(__dirname, "../../../");
  const frontendDir = path.resolve(rootDir, "frontend");
  const generatedDirectories = new Set([
    "node_modules",
    "dist",
    ".git",
    ".next",
    "coverage",
    "test-results",
    "playwright-report",
  ]);

  it("verifies that frontend contains NO server secrets or service-role keywords", () => {
    const forbidden = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "DATABASE_URL",
    ];
    let leakFound = false;

    function checkDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (generatedDirectories.has(entry.name)) continue;
          checkDir(full);
        } else if (entry.isFile()) {
          if (
            [".ts", ".tsx", ".js", ".jsx", ".html"].includes(
              path.extname(entry.name),
            )
          ) {
            const content = fs.readFileSync(full, "utf8");
            for (const key of forbidden) {
              if (content.includes(key)) {
                leakFound = true;
                console.error(`Leak detected in ${full}: ${key}`);
              }
            }
          }
        }
      }
    }

    checkDir(frontendDir);
    expect(leakFound).toBe(false);
  });
});
