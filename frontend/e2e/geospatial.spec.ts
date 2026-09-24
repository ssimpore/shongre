import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";
import { DEMO_LISTING_ID } from "./routes";

/** Requests that only a mounted map makes: its worker pair and its tiles. */
function recordMapRequests(page: import("@playwright/test").Page): string[] {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/\/vendor\/maplibre-gl\/|tiles\.openfreemap\.org/.test(url)) {
      requests.push(url);
    }
  });
  return requests;
}

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

test.describe("map loading", () => {
  /*
   * A lazy import keeps the renderer out of the initial bundle and nothing
   * else: a lazily imported map that mounts on page load still costs the
   * renderer, its worker and the first tiles on every view. Measured on a
   * throttled phone, that was two thirds of a listing page's JavaScript and a
   * second and a half of main-thread time for a section most readers never
   * scroll to. The gate is the slot being on screen.
   */
  test("a listing page fetches its map only once the map is scrolled to", async ({
    page,
  }) => {
    const mapRequests = recordMapRequests(page);
    // The slot starts loading one viewport-height before it scrolls into view
    // (`DeferUntilVisible`'s 100% root margin). A phone-width, shorter window
    // keeps the map well outside that prefetch band however the copy above it
    // wraps, instead of depending on the page being a few pixels longer.
    await page.setViewportSize({ width: 390, height: 640 });
    await usePersona(page, "guest");
    await page.goto(`/annonce/${DEMO_LISTING_ID}`, { waitUntil: "load" });
    await waitForStableLayout(page);
    await page.waitForTimeout(1_500);

    const slot = page.getByTestId("listing-location-map-slot");
    await expect(slot).toBeAttached();
    const slotTop = await slot.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    expect(
      slotTop,
      "the map slot must start outside the prefetch band for this check",
    ).toBeGreaterThan(2 * 640);
    expect(mapRequests).toEqual([]);

    await slot.scrollIntoViewIfNeeded();
    await expect(slot.locator("[data-map-container]")).toHaveAttribute(
      "data-map-status",
      "ready",
      { timeout: 20_000 },
    );
    expect(mapRequests.length).toBeGreaterThan(0);
  });

  test("a results page whose map panel is hidden never fetches the map", async ({
    page,
  }) => {
    const mapRequests = recordMapRequests(page);
    // Below `xl` the property results keep the list and hide the map panel.
    await page.setViewportSize({ width: 1024, height: 900 });
    await usePersona(page, "guest");
    await page.goto("/immo", { waitUntil: "load" });
    await waitForStableLayout(page);
    await page.waitForTimeout(2_000);

    const panel = page.locator('[data-search-map-panel="true"]').first();
    await expect(panel).toBeAttached();
    await expect(panel).toBeHidden();
    expect(mapRequests).toEqual([]);
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
     * The filter drawer overlays the map instead of resizing it. Opening and
     * closing that surface must remain presentation-only and never issue a
     * catalogue query or change the result count.
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
      .locator(
        '[data-search-filter-rail] button[aria-controls="immo-filter-panel"]',
      )
      .last();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Fermer" }).click();
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
      .locator(
        '[data-search-filter-rail] button[aria-controls="immo-filter-panel"]',
      )
      .last();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveText(/Tous les filtres/i);
    await expect(toggle).toHaveAttribute("aria-label", /Afficher les filtres/i);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveText(/Tous les filtres/i);
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
       the path a visitor's payload travels. The document itself is a surface
       too: the homepage and the search page serialise their first listings
       into the HTML, so a leak there would ship without any API call. Flight
       data escapes its quotes, which the normalisation below undoes. */
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
      const isApi = response.url().includes("/api/v1/");
      const isDocument =
        response.request().resourceType() === "document" &&
        (response.headers()["content-type"] ?? "").includes("text/html");
      if (!isApi && !isDocument) return;
      let body = "";
      try {
        body = (await response.text()).replace(/\\"/g, '"');
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
