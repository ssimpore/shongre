import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { messagesFr } from "./messages.fr";
import { adminCatalogueFr } from "./admin.catalogue.fr";
import { deliveryCatalogueFr } from "./delivery.catalogue.fr";
import { digitalMessagesFr } from "./digital.catalogue.fr";
import { sellerCatalogueFr } from "./seller.catalogue.fr";

/**
 * The Staff console catalogue is loaded with the admin surfaces, not the shared
 * shell: in the shell it was 151.6 KiB of source (40.1 KiB gzip) downloaded by
 * every anonymous visitor for screens they cannot open. Splitting it is only
 * safe while two things hold — nothing renders an `admin.*` key without loading
 * the catalogue, and the handful of Staff strings the shared Header renders on
 * every route stay in the shell.
 */

const SHELL_RENDERED_STAFF_KEYS = [
  "admin.staff.status.active",
  "admin.staff.status.suspended",
  "admin.staff.status.revoked",
] as const;

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(path) && !/\.(test|spec)\.tsx?$/.test(path)) {
      out.push(path);
    }
  }
  return out;
}

describe("message catalogue split", () => {
  it("keeps the Staff strings the shared Header renders in the shell", () => {
    for (const key of SHELL_RENDERED_STAFF_KEYS) {
      expect(
        (messagesFr as Record<string, string | undefined>)[key],
        `${key} is rendered by the Header on every route and must stay in the shell catalogue`,
      ).toBeTruthy();
    }
  });

  it("holds the rest of the Staff console outside the shell", () => {
    const shellAdminKeys = Object.keys(messagesFr).filter((key) =>
      key.startsWith("admin."),
    );
    expect(shellAdminKeys.sort()).toEqual(
      [...SHELL_RENDERED_STAFF_KEYS].sort(),
    );
    expect(Object.keys(adminCatalogueFr).length).toBeGreaterThan(1_000);
  });

  it("declares every key exactly once across the shipped catalogues", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [name, catalogue] of [
      ["messages.fr", messagesFr],
      ["admin", adminCatalogueFr],
      ["delivery", deliveryCatalogueFr],
      ["digital", digitalMessagesFr],
      ["seller", sellerCatalogueFr],
    ] as const) {
      for (const key of Object.keys(catalogue)) {
        const previous = seen.get(key);
        if (previous) duplicates.push(`${key} in ${previous} and ${name}`);
        else seen.set(key, name);
      }
    }
    expect(duplicates, duplicates.join("\n")).toEqual([]);
  });

  it("never renders a seller key without loading the seller catalogue", () => {
    const sellerPrefixes = new Set(
      Object.keys(sellerCatalogueFr).map((key) =>
        key.split(".").slice(0, 3).join("."),
      ),
    );
    const rendersSellerCopy = new RegExp(
      `\\bt\\(\\s*["'\`](?:${[...sellerPrefixes]
        .map((prefix) => prefix.replace(/\./g, "\\."))
        .join("|")})\\.`,
    );
    const offenders: string[] = [];
    for (const file of sourceFiles("src")) {
      const source = readFileSync(file, "utf8");
      if (!rendersSellerCopy.test(source)) continue;
      if (!source.includes("sellerCatalogueFr")) offenders.push(file);
    }
    expect(
      offenders,
      `these render seller copy but never load the catalogue, so the raw key would ship:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("never renders an admin key without loading the admin catalogue", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles("src")) {
      const source = readFileSync(file, "utf8");
      const rendersAdminCopy = /\bt\(\s*["'`]admin\./.test(source);
      if (!rendersAdminCopy) continue;
      // The Header renders only the three shell-resident Staff status strings.
      if (file.endsWith("app/layouts/Header.tsx")) continue;
      if (!source.includes("adminCatalogueFr")) offenders.push(file);
    }
    expect(
      offenders,
      `these render admin.* copy but never load the catalogue, so the raw key would ship:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
