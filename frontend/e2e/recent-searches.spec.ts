import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

async function recordRecentSearch(
  page: import("@playwright/test").Page,
  query: string,
): Promise<void> {
  await page.goto(`/recherche?query=${encodeURIComponent(query)}`, {
    waitUntil: "domcontentloaded",
  });
  // Recording happens in the mounted search page. Waiting on the actual
  // persisted contract prevents the next navigation from cancelling that
  // effect when route chunks are still compiling under parallel E2E load.
  await page.waitForFunction((expectedQuery) => {
    const raw = window.localStorage.getItem("shongre_recent_search_items_v1");
    if (!raw) return false;
    return JSON.parse(raw).some(
      (item: { title?: string }) => item.title === expectedQuery,
    );
  }, query);
}

test("records, resumes and removes a recent search on the homepage", async ({
  page,
}) => {
  await usePersona(page, "guest");

  const query = "Appareil photo dynamique";
  await recordRecentSearch(page, query);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const recentSection = page.locator(
    'section[aria-labelledby="home-recent-searches-title"]',
  );
  const recentCard = recentSection.getByRole("link", {
    name: new RegExp(query),
  });
  await expect(recentCard).toBeVisible();

  await recentCard.click();
  await expect(page).toHaveURL(/\/recherche\?query=Appareil\+photo\+dynamique/);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", {
      name: new RegExp(`Supprimer cette recherche.*${query}`),
    })
    .click();
  await expect(
    recentSection.getByRole("link", { name: new RegExp(query) }),
  ).toHaveCount(0);
});

test("shows up to six compact recent-search chips by default", async ({
  page,
}) => {
  await usePersona(page, "guest");

  for (let index = 0; index < 7; index += 1) {
    await recordRecentSearch(page, `Recherche limite ${index}`);
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const recentSection = page.locator(
    'section[aria-labelledby="home-recent-searches-title"]',
  );
  const chips = recentSection.getByTestId("home-recent-search-chip");
  await expect(chips).toHaveCount(6);
  await expect(recentSection.getByRole("link")).toHaveCount(6);

  const chipHeights = await chips.evaluateAll((elements) =>
    elements.map((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
  );
  expect(Math.max(...chipHeights)).toBeLessThanOrEqual(48);
});

test("lets an admin change the recent-search display limit for the homepage @serial", async ({
  page,
}) => {
  // This journey configures an admin override and then performs a five-route
  // write/read sweep. Keep the global single-route budget strict and widen only
  // this intentionally multi-navigation contract.
  test.setTimeout(90_000);
  await usePersona(page, "admin");
  await page.goto("/admin/marches", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  // The France card is the canonical configuration source. Editing it keeps
  // the setting inherited by markets that do not define a local override.
  await page
    .getByRole("button", { name: "Configurer le marché France" })
    .click();
  await page.getByRole("button", { name: "Fonctionnalités" }).click();

  const setting = page
    .getByText("Recherches récentes affichées")
    .locator("..")
    .locator("..")
    .locator("..");
  await setting.getByRole("button", { name: "Modifier" }).click();
  const value = page.locator("#admin-edit-override-value");
  await value.fill("2");
  await page
    .getByRole("button", { name: "Enregistrer la valeur locale" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("shongre_markets_v2");
        if (!raw) return null;
        const markets = JSON.parse(raw) as Array<{
          code?: string;
          configuration?: { features?: { recentSearchesLimit?: number } };
        }>;
        return markets.find((market) => market.code === "FR")?.configuration
          ?.features?.recentSearchesLimit;
      }),
    )
    .toBe(2);

  for (let index = 0; index < 5; index += 1) {
    await recordRecentSearch(page, `Admin limite ${index}`);
  }
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const recentSection = page.locator(
    'section[aria-labelledby="home-recent-searches-title"]',
  );
  await expect(recentSection.getByRole("link")).toHaveCount(2);
});
