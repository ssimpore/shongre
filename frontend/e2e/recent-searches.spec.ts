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
  // The history is scoped per account and market under one key prefix.
  await page.waitForFunction((expectedQuery) => {
    return Object.entries(window.localStorage).some(
      ([key, value]) =>
        key.startsWith("shongre_recent_searches_v2") &&
        (JSON.parse(value) as string[]).includes(expectedQuery),
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

async function publishRecentSearchLimit(
  page: import("@playwright/test").Page,
  limit: number,
  reason: string,
): Promise<void> {
  await page.goto("/admin/tendances", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
  const section = page.getByTestId("homepage-admin-section-recent_searches");
  await expect(section).toBeVisible();
  await section
    .getByLabel("Nombre maximal d’éléments", { exact: true })
    .fill(String(limit));
  await page.getByLabel("Motif de modification / publication").fill(reason);
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(
    page.getByText("Nouvelle version de la page d’accueil publiée."),
  ).toBeVisible();
}

test("lets an admin change the recent-search display limit for the homepage @serial", async ({
  page,
}) => {
  // The limit is the homepage's recent-searches section itself, published
  // from the homepage configuration like every other section: this journey
  // publishes a lower limit, reads the homepage, then restores the default.
  test.setTimeout(120_000);
  await usePersona(page, "admin");
  await publishRecentSearchLimit(
    page,
    2,
    "Limite de recherches récentes réduite pour vérification",
  );

  try {
    for (let index = 0; index < 5; index += 1) {
      await recordRecentSearch(page, `Admin limite ${index}`);
    }
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const recentSection = page.locator(
      'section[aria-labelledby="home-recent-searches-title"]',
    );
    await expect(recentSection.getByRole("link")).toHaveCount(2);
  } finally {
    // The published composition is shared by every journey in the run.
    await publishRecentSearchLimit(
      page,
      6,
      "Retour à la limite par défaut après vérification",
    );
  }
});
