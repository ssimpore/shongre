import { readFileSync } from "node:fs";

export interface BrowserFixtures {
  /** Which repository family the isolated API serves. */
  dataMode: "demo" | "database";
  accounts: Record<
    string,
    { id: string; email: string; recoveryCodes: string[] }
  >;
  listingIds: Record<string, string>;
}

/** Backend-owned identifiers; this module is never imported by application code. */
export function readBrowserFixtures(): BrowserFixtures {
  const file = process.env.E2E_ACCOUNTS_FILE;
  if (process.env.APP_ENV !== "test" || !file) {
    throw new Error("Browser fixtures require make frontend-test-e2e.");
  }
  return JSON.parse(readFileSync(file, "utf8")) as BrowserFixtures;
}

export function testListingId(sourceId: string): string {
  const id = readBrowserFixtures().listingIds[sourceId];
  if (!id) throw new Error(`Missing backend listing scenario: ${sourceId}`);
  return id;
}

export function testListingPath(sourceId: string): string {
  return `/annonce/${encodeURIComponent(testListingId(sourceId))}`;
}
