import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Every routed page must declare its own metadata.
 *
 * 37 of the 54 routed pages once rendered the default document title, so every
 * screen behind authentication — the whole account area, the admin console, the
 * CRM, the messaging inbox, the publish wizard — announced itself as
 * "Shongre - Petites Annonces Particuliers & Pros". Open five tabs and none of
 * them could be told apart; a screen reader heard the same title on every route
 * change; and the publish wizard inherited whatever title the previous route
 * had left behind.
 *
 * This is a source-level check rather than a rendering one on purpose: it
 * catches a new page the moment it is written, without needing the route table,
 * a DOM, or a provider tree.
 */

const FEATURES = new URL("../../features", import.meta.url).pathname;

/** Components that a route element renders directly. */
const PAGE_FILE = /(?:Page|Wizard)\.tsx$/;

/** Not routed: shells, layouts and shared sub-components. */
const NOT_ROUTED =
  /(?:Layout|Modal|Card|Section|Tab|Panel|Header|Row|Item)\.tsx$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return [full];
  });
}

const pageFiles = walk(FEATURES)
  .filter(
    (f) => PAGE_FILE.test(f) && !NOT_ROUTED.test(f) && !/\.test\.tsx?$/.test(f),
  )
  // `components/` holds pieces a page composes, never a route target.
  .filter((f) => !f.includes("/components/"));

const SERVER_METADATA_PAGES = new Set([
  "global/GlobalGatewayPage.tsx",
  "global/MarketLaunchPage.tsx",
]);

/** Thin route wrappers whose shared page owns entry-point-aware metadata. */
const DELEGATED_CLIENT_METADATA_PAGES = new Map([
  ["admin/crm/CrmAiProspectingPage.tsx", "<ProspectingWorkspacePage"],
  [
    "prospecting/ProspectsStandaloneWorkspacePage.tsx",
    "<ProspectingWorkspacePage",
  ],
]);

const clientMetadataPages = pageFiles.filter(
  (file) => !SERVER_METADATA_PAGES.has(relative(FEATURES, file)),
);

const SERVER_ROUTE = new URL(
  "../../../app/[[...segments]]/page.tsx",
  import.meta.url,
).pathname;

describe("page metadata coverage", () => {
  it("finds the routed page modules", () => {
    // A guard on the guard: a rename that breaks the glob would otherwise turn
    // this suite green by testing nothing.
    expect(pageFiles.length).toBeGreaterThan(40);
  });

  it("keeps gateway and launch metadata in the server route", () => {
    const source = readFileSync(SERVER_ROUTE, "utf8");
    expect(source).toContain("export async function generateMetadata");
    expect(source).toContain('context.kind === "global_gateway"');
    expect(source).toContain('context.kind === "coming_soon"');
  });

  it.each(clientMetadataPages.map((f) => [relative(FEATURES, f), f]))(
    "%s declares or delegates usePageMeta",
    (name, file) => {
      const source = readFileSync(file as string, "utf8");
      const delegatedOwner = DELEGATED_CLIENT_METADATA_PAGES.get(
        name as string,
      );
      expect(
        source.includes("usePageMeta(") ||
          Boolean(delegatedOwner && source.includes(delegatedOwner)),
      ).toBe(true);
    },
  );
});
