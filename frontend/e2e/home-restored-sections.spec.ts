import { expect as baseExpect, test } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

// Session restoration and the first API projection can be cold on WebKit.
const expect = baseExpect.configure({ timeout: 30_000 });
test.setTimeout(90_000);

for (const width of [1408, 390]) {
  test(`homepage restores real recent searches and API collections at ${width}px`, async ({
    page,
  }, testInfo) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/Shongre/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await waitForStableLayout(page);
    await expect(page.getByTestId("home-recent-searches")).toHaveCount(0);
    const field = page
      .getByRole("combobox", { name: /rechercher une annonce/i })
      .filter({ visible: true })
      .first();
    await field.fill("Table");
    await field.press("Enter");
    await expect(page).toHaveURL(/\/recherche\?.*query=Table/);
    await page
      .getByRole("banner")
      .getByRole("link", { name: /SHONGRE.*accueil/i })
      .click();
    const searches = page.getByTestId("home-recent-searches");
    // The section mounts once the restored preferences reach the shell;
    // scrolling a locator that is still resolving detaches on hydration.
    await expect(searches).toBeAttached();
    await searches.scrollIntoViewIfNeeded();
    await expect(
      searches.getByRole("link", { name: "Table", exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, `recent searches ${width}`);
    await searches.locator("..").screenshot({
      path: testInfo.outputPath(`recent-searches-${width}.png`),
      scale: "css",
    });
    await searches.getByRole("link", { name: "Table", exact: true }).click();
    await expect(page).toHaveURL(/\/recherche\?query=Table/);
    await page
      .getByRole("banner")
      .getByRole("link", { name: /SHONGRE.*accueil/i })
      .click();
    await searches
      .getByRole("button", {
        name: "Supprimer cette recherche : Table",
        exact: true,
      })
      .click();
    await expect(searches).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(searches).toHaveCount(0);

    const collections = page.getByTestId("home-collection-explorer");
    const cards = collections.getByRole("link", {
      name: /^Explorer la collection/,
    });
    await expect(cards.first()).toBeAttached();
    await collections.scrollIntoViewIfNeeded();
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    const image = cards.first().locator("img");
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expectNoHorizontalOverflow(page, `collections ${width}`);
    await collections.screenshot({
      path: testInfo.outputPath(`collections-${width}.png`),
      scale: "css",
    });
    const destination = await cards.first().getAttribute("href");
    await cards.first().click();
    expect(new URL(page.url()).pathname).toBe(destination);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-listing-card]").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("recent searches synchronize with autocomplete and stay isolated after account changes", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  await usePersona(page, "individual_buyer");
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Menu du compte de Thomas Laurent",
      exact: true,
    }),
  ).toBeVisible();
  const searchField = page
    .getByRole("combobox", { name: /rechercher une annonce/i })
    .first();
  await searchField.fill("Table");
  await searchField.press("Enter");
  await expect(page.locator("#search-results-toolbar")).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { name: /SHONGRE.*accueil/i })
    .click();
  const searches = page.getByTestId("home-recent-searches");
  await expect(
    searches.getByRole("link", { name: "Table", exact: true }),
  ).toBeVisible();
  await usePersona(page, "individual_seller");
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Menu du compte de Camille Martin",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(searches).toHaveCount(0);
  await usePersona(page, "individual_buyer");
  await page.goto("/");
  await expect(
    searches.getByRole("link", { name: "Table", exact: true }),
  ).toBeVisible();
  await searches
    .getByRole("button", {
      name: "Supprimer cette recherche : Table",
      exact: true,
    })
    .click();
  const field = page
    .getByRole("combobox", { name: /rechercher une annonce/i })
    .first();
  await field.focus();
  await expect(
    page.getByRole("button", { name: /supprimer.*Table/i }),
  ).toHaveCount(0);
});
