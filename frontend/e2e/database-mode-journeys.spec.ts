import { expect, test } from "@playwright/test";
import { browserApi } from "./browser-api";
import { readBrowserFixtures, testListingId } from "./fixtures";
import { useEstablishedConsent, usePersona } from "./personas";

/**
 * Authenticated and search journeys against the PostgreSQL repositories.
 *
 * `database-mode-public-routes.spec.ts` proves the public route families
 * answer; this file walks the production-shaped chain the demo suite cannot:
 * browser → generated HTTP operation → authorization → domain service →
 * Postgres repository → migrated database, including the read-back.
 */

test.describe("database-mode journeys", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
  });

  test("authenticates a seeded buyer through Supabase Auth and reads the account back", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    const me = await browserApi(page, "/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(readBrowserFixtures().accounts.user_thomas.id);
    const response = await page.goto("/compte", { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("button", { name: "Menu du compte de Thomas Laurent" }),
    ).toBeVisible();
  });

  test("toggles a favorite through the database and reads it back", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    const listingId = testListingId("list-103");
    const path = `/listings/${encodeURIComponent(listingId)}/favorite`;
    // Leave the seeded data as found: the seed does not favourite this one.
    const added = await browserApi(page, path, {
      method: "PUT",
      body: { isFavorite: true },
    });
    expect(added.status, JSON.stringify(added.body)).toBe(200);
    const favorites = await browserApi(page, "/favorites");
    expect(favorites.status).toBe(200);
    expect(favorites.body.listingIds).toContain(listingId);
    const removed = await browserApi(page, path, {
      method: "PUT",
      body: { isFavorite: false },
    });
    expect(removed.status).toBe(200);
    const afterwards = await browserApi(page, "/favorites");
    expect(afterwards.body.listingIds).not.toContain(listingId);
  });

  test("lists the seller's own inventory from the seller workspace", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    const response = await page.goto("/compte/annonces", {
      waitUntil: "load",
    });
    expect(response?.status()).toBe(200);
    await expect(
      page.getByText("Apple iPhone 15 Pro 128 Go", { exact: false }).first(),
    ).toBeVisible();
  });

  test("completes a Staff sign-in with a real single-use recovery code", async ({
    page,
  }) => {
    await usePersona(page, "moderator");
    const me = await browserApi(page, "/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.staffStatus).toBe("active");
  });

  test("completes search words from the catalogue vocabulary", async ({
    page,
  }) => {
    await page.goto("/healthz", { waitUntil: "load" });
    const suggestions = await browserApi(page, "/listings/suggestions?q=vel");
    expect(suggestions.status, JSON.stringify(suggestions.body)).toBe(200);
    const items = suggestions.body.items as Array<Record<string, unknown>>;
    expect(items.some((item) => item.kind === "term" && item.query === "vélo"))
      .toBe(true);
  });

  test("offers the nearest known spelling when a search finds nothing", async ({
    page,
  }) => {
    const response = await page.goto("/recherche?query=ipone", {
      waitUntil: "load",
    });
    expect(response?.status()).toBe(200);
    const didYouMean = page.locator("[data-search-did-you-mean]");
    await expect(didYouMean).toHaveAttribute("data-search-did-you-mean", "iphone");
    await didYouMean.getByRole("button").click();
    await expect(page).toHaveURL(/query=iphone/);
    await expect(page.locator("[data-search-did-you-mean]")).toHaveCount(0);
  });

  test("lets the reviewed seller answer publicly and readers vote it helpful", async ({
    page,
  }) => {
    // The seed leaves Camille's review of Atelier Nordique; the atelier answers it.
    await usePersona(page, "pro_seller");
    const atelier = readBrowserFixtures().accounts.user_pro_atelier.id;
    const reviews = await browserApi(page, `/reviews/user/${atelier}`);
    expect(reviews.status).toBe(200);
    const [review] = reviews.body as unknown as Array<Record<string, unknown>>;
    expect(review, "seeded review for the atelier").toBeTruthy();
    const answer = `Merci pour votre retour, ravi que la table vous plaise. (${Date.now()})`;
    const replied = await browserApi(page, `/reviews/${review.id}/reply`, {
      method: "POST",
      body: { comment: answer },
    });
    expect(replied.status, JSON.stringify(replied.body)).toBe(200);
    expect((replied.body.reply as Record<string, unknown>).comment).toBe(answer);
    // The recipient cannot rate their own exchange.
    const ownVote = await browserApi(page, `/reviews/${review.id}/helpful`, {
      method: "PUT",
      body: { helpful: true },
    });
    expect(ownVote.status).toBe(400);

    // A third party sees the answer on the profile and can vote, once.
    await usePersona(page, "individual_buyer");
    const voted = await browserApi(page, `/reviews/${review.id}/helpful`, {
      method: "PUT",
      body: { helpful: true },
    });
    expect(voted.status, JSON.stringify(voted.body)).toBe(200);
    expect(voted.body).toMatchObject({ helpfulCount: 1, viewerMarkedHelpful: true });
    const asReader = await browserApi(page, `/reviews/user/${atelier}`);
    expect(
      (asReader.body as unknown as Array<Record<string, unknown>>)[0],
    ).toMatchObject({ helpfulCount: 1, viewerMarkedHelpful: true });
    const response = await page.goto("/boutique/atelier-nordique?tab=reviews", {
      waitUntil: "load",
    });
    expect(response?.status()).toBe(200);
    await expect(page.locator(`[data-review-reply="${review.id}"]`)).toContainText(
      answer,
    );
    await expect(
      page.locator(`[data-review-helpful="${review.id}"]`),
    ).toHaveAttribute("aria-pressed", "true");
    // Leave the seeded data as found.
    const unvoted = await browserApi(page, `/reviews/${review.id}/helpful`, {
      method: "PUT",
      body: { helpful: false },
    });
    expect(unvoted.body).toMatchObject({ helpfulCount: 0 });
  });

});

/*
 * These journeys change what every other test can see (an absent seller hides
 * her listings), so they run in the serial phase, alone, after the rest.
 */
test.describe("database-mode seller automation @serial", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
  });

  test("pauses a seller's listings for an absence and resumes them on return", async ({
    page,
    request,
  }) => {
    // A cookie-less read: what a visitor sees, not what the owner sees.
    const publicRead = (listingId: string) =>
      request.get(`/api/v1/listings/${encodeURIComponent(listingId)}`, {
        headers: { "X-Shongre-Market": "FR" },
      });
    await usePersona(page, "individual_seller");
    const listingId = testListingId("list-103");
    const until = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const away = await browserApi(page, "/account/away", {
      method: "PUT",
      body: { until, message: "De retour lundi." },
    });
    expect(away.status, JSON.stringify(away.body)).toBe(200);
    try {
      expect(away.body).toMatchObject({ awayMessage: "De retour lundi." });
      expect(Number(away.body.pausedPublications)).toBeGreaterThan(0);
      // A paused publication is not a public listing anymore: the public
      // read answers null, as for any listing that is not discoverable.
      expect(await (await publicRead(listingId)).json()).toBeNull();
      // The workspace shows the absence, and the profile tells buyers.
      await page.goto("/compte/annonces", { waitUntil: "load" });
      await expect(page.locator("[data-seller-away-panel]")).toHaveAttribute(
        "data-seller-away-panel",
        "away",
      );
      await page.goto("/profil/camille-martin", { waitUntil: "load" });
      await expect(page.locator("[data-seller-away-notice]")).toContainText(
        "De retour lundi.",
      );
    } finally {
      // Leave the seeded data as found even when an assertion above fails:
      // a seller left "away" hides her listings from every later journey.
      const back = await browserApi(page, "/account/away", {
        method: "PUT",
        body: { until: null },
      });
      expect(back.status).toBe(200);
      expect(Number(back.body.resumedPublications)).toBe(
        Number(away.body.pausedPublications),
      );
    }
    expect(await (await publicRead(listingId)).json()).toMatchObject({
      id: listingId,
    });
  });

  test("stores the auto-renew opt-in on the seller's own listing", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    const listingId = testListingId("list-103");
    const enabled = await browserApi(page, `/listings/${listingId}`, {
      method: "PUT",
      body: { autoRenew: true },
    });
    expect(enabled.status, JSON.stringify(enabled.body)).toBe(200);
    expect(enabled.body.autoRenew).toBe(true);
    await page.goto("/compte/annonces", { waitUntil: "load" });
    await expect(
      page.locator(`[data-listing-auto-renew="${listingId}"]`),
    ).toHaveAttribute("aria-checked", "true");
    // Leave the seeded data as found.
    const disabled = await browserApi(page, `/listings/${listingId}`, {
      method: "PUT",
      body: { autoRenew: false },
    });
    expect(disabled.body.autoRenew).toBe(false);
  });
});
