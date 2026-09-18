import { readFileSync } from "node:fs";

export interface BrowserFixtures {
  /** Which repository family the isolated API serves. */
  dataMode: "demo" | "database";
  accounts: Record<
    string,
    { id: string; email: string; recoveryCodes: string[] }
  >;
  listingIds: Record<string, string>;
  /** Orders projected from the fixture's transactions, by fixture id. */
  orderIds: Record<string, string>;
  /** Delivery requests the scenario published, by fixture id. */
  deliveryRequestIds: Record<string, string>;
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

export function testOrderId(sourceId: string): string {
  const id = readBrowserFixtures().orderIds?.[sourceId];
  if (!id) throw new Error(`Missing backend order scenario: ${sourceId}`);
  return id;
}

export function testDeliveryRequestId(fixtureId: string): string {
  const id = readBrowserFixtures().deliveryRequestIds?.[fixtureId];
  if (!id) throw new Error(`Missing backend delivery scenario: ${fixtureId}`);
  return id;
}
