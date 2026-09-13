import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

/**
 * The geospatial guarantees that are easy to lose and hard to notice.
 *
 * Each of these was a live defect during the MapLibre migration, and each has
 * the same shape: the page looks fine. A map with no attribution, a map with no
 * markers on it, and a listing whose public coordinate is its seller's real one
 * all render without an error anywhere.
 */

test.describe("map rendering", () => {
  test("draws a real map and credits the data it draws", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await usePersona(page, "guest");
    await page.goto("/recherche?view=map", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const container = page.locator("[data-map-container]").first();
    await expect(container).toBeVisible();
    await expect(container).toHaveAttribute("data-map-status", "ready", {
      timeout: 20_000,
    });
    // A canvas proves the renderer took the container, not just that a div exists.
    await expect(container.locator("canvas")).toBeVisible();

    /* Attribution is a condition of the OpenStreetMap-derived data's licence,
       not a caption. Two of the five surfaces this replaced had disabled it. */
    const attribution = container.locator(".maplibregl-ctrl-attrib");
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText(/OpenStreetMap/i);
  });

  test("puts a named, focusable control on every marker", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await usePersona(page, "guest");
    await page.goto("/recherche?view=map", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await expect(page.locator("[data-map-container]").first()).toHaveAttribute(
      "data-map-status",
      "ready",
      { timeout: 20_000 },
    );

    const markers = page.locator(".maplibregl-marker");
    await expect(markers.first()).toBeVisible({ timeout: 20_000 });

    /* A marker that is a div with a click handler is invisible to a keyboard
       and unnameable to a screen reader; the previous renderer also nested one
       focusable node inside another, which axe reported as nested-interactive. */
    const first = markers.first();
    await expect(first).toHaveJSProperty("tagName", "BUTTON");
    const label = await first.getAttribute("aria-label");
    expect(label?.trim().length ?? 0).toBeGreaterThan(0);
  });
});

test.describe("map provider outage", () => {
  test("leaves the listings reachable when the tiles cannot load", async ({
    page,
  }) => {
    /* The acceptance criterion is that a third party being down degrades the
       map and nothing else. A grey box where the results used to be would pass
       any check that only looks for errors. */
    await page.route("**/tiles.openfreemap.org/**", (route) => route.abort());
    await page.setViewportSize({ width: 1280, height: 900 });
    await usePersona(page, "guest");
    await page.goto("/recherche?view=map", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await page.waitForTimeout(3_000);

    await expect(page.locator("h1")).toBeVisible();
    const results = page.locator("article");
    expect(await results.count()).toBeGreaterThan(0);
    await expect(
      page.getByRole("button", { name: /Affichage liste|Liste/ }).first(),
    ).toBeVisible();
  });
});

test.describe("map and filter layout", () => {
  test("opening and closing the filters does not re-search the map", async ({
    page,
  }) => {
    /*
     * Opening or hiding the filter panel resizes the map, which the renderer
     * reports as a `moveend` — the same event a drag produces. Acted
     * on blindly, that applies a viewport filter nobody asked for: the count
     * on this page dropped from two results to one on a layout change alone.
     * Only a move carrying an `originalEvent` is the reader asking to search
     * somewhere else.
     */
    const searches: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/v1\/real-estate/.test(request.url()))
        searches.push(request.url());
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await usePersona(page, "guest");
    await page.goto("/immo", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await page.waitForTimeout(2_000);

    const countBefore = await resultCount(page);
    expect(countBefore).toBeGreaterThan(0);
    const searchesBefore = searches.length;

    const toggle = page
      .locator('button[aria-expanded][aria-controls*="filter"]')
      .first();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await page.waitForTimeout(2_500);

    expect(await resultCount(page)).toBe(countBefore);
    expect(
      searches.length - searchesBefore,
      "opening or closing the filter panel must not query the catalogue",
    ).toBe(0);
  });

  test("keeps the panel's own word on the control that opens it", async ({
    page,
  }) => {
    /* It used to read "Masquer" once open, which removed the only label a
       reader could look for to get the filters back. The action a press will
       perform is still announced, through the accessible name. */
    await page.setViewportSize({ width: 1440, height: 900 });
    await usePersona(page, "guest");
    await page.goto("/immo", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const toggle = page
      .locator('button[aria-expanded][aria-controls*="filter"]')
      .first();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveText(/Filtres/i);
    await expect(toggle).toHaveAttribute("aria-label", /Afficher les filtres/i);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveText(/Filtres/i);
    await expect(toggle).toHaveAttribute("aria-label", /Masquer les filtres/i);
  });
});

async function resultCount(page: import("@playwright/test").Page) {
  const text = await page.locator("body").innerText();
  return Number(/(\d+)\s+biens?/.exec(text)?.[1] ?? 0);
}

test.describe("public location privacy", () => {
  test("never leaks a private location field to any public response", async ({
    page,
  }) => {
    /* Deliberately not aimed at one endpoint. `toPublicListing` builds its
       payload from a rest spread, so a column added to `listings` becomes a
       public field on *every* surface that projects a listing at once — which
       is how the seller's real coordinate would ship the moment geocoding
       started writing one. A test that watched a single route would miss the
       next surface; this watches all of them.

       Asserted on what the browser received, not on a direct request: the
       first-party relay validates the calling origin, so a bare API call is not
       the path a visitor's payload travels. */
    const PRIVATE_FIELDS = [
      "normalizedAddress",
      "locationSource",
      "geocodingProvider",
      "geocodedAt",
      "locationUpdatedAt",
    ];
    const offenders: string[] = [];
    let inspected = 0;

    page.on("response", async (response) => {
      if (!response.url().includes("/api/v1/")) return;
      let body = "";
      try {
        body = await response.text();
      } catch {
        return;
      }
      if (!body.includes("locationPrecision") && !body.includes("latitude")) {
        return;
      }
      inspected += 1;
      const route = new URL(response.url()).pathname;
      if (/"locationPrecision"\s*:\s*"exact"/.test(body)) {
        offenders.push(`${route}: publishes a listing at exact precision`);
      }
      for (const field of PRIVATE_FIELDS) {
        if (new RegExp(`"${field}"\\s*:`).test(body)) {
          offenders.push(`${route}: leaks ${field}`);
        }
      }
    });

    await usePersona(page, "guest");
    for (const path of ["/", "/recherche"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
    }
    await page.waitForTimeout(2_000);

    expect(offenders, offenders.join("\n")).toEqual([]);
    // A test that inspected nothing proves nothing.
    expect(
      inspected,
      "no location-bearing API response was observed",
    ).toBeGreaterThan(0);
  });
});
