import { testListingPath } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test("keeps the homepage compact and all carousel slides but neighbors out of the DOM", async ({
  page,
}) => {
  await usePersona(page, "guest");
  await page.setViewportSize({ width: 1008, height: 598 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const rail = page.locator("#hero-boosted-track");
  await expect(rail).toBeVisible();
  expect(await rail.locator("article").count()).toBeLessThanOrEqual(3);
  await expect(
    page.getByRole("button", { name: "Mettre le carrousel en pause" }),
  ).toBeVisible();
  const categoryRail = page.locator("#header-category-rail");
  const categoryOverflow = await categoryRail.evaluate(
    (element) => element.scrollWidth > element.clientWidth + 1,
  );
  if (categoryOverflow) {
    await expect(
      page.getByRole("button", {
        name: "Faire défiler les catégories vers la droite",
      }),
    ).toBeVisible();
  }

  // The homepage now server-renders every section, so the ceiling covers the
  // hero, the recent rail, the deals and the three universe rails as cards —
  // not only the shell the earlier 1,800 was measured on.
  const elementCount = await page.locator("*").count();
  expect(elementCount).toBeLessThan(3_200);
  await expectNoHorizontalOverflow(page, "production homepage at 1008px");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", {
      name: "Faire défiler les catégories vers la droite",
    }),
  ).toBeVisible();
});

test("restores a known session and consent before profile-dependent UI", async ({
  page,
}) => {
  await usePersona(page, "individual_buyer");
  await page.addInitScript(() => {
    const inspect = () => {
      if (document.body?.innerText.includes("Visiteur non connecté")) {
        sessionStorage.setItem("shongre_test_saw_guest_flash", "true");
      }
    };
    new MutationObserver(inspect).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
  await useEstablishedConsent(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
  // The session is the API's, so the header names the restored account rather
  // than a persona label from the retired local-storage switcher.
  const accountMenu = page.getByRole("button", {
    name: "Menu du compte de Thomas Laurent",
  });
  await expect(accountMenu).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(accountMenu).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("shongre_test_saw_guest_flash"),
    ),
  ).toBeNull();
  await expect(
    page.getByRole("region", { name: "Vos choix de confidentialité" }),
  ).toHaveCount(0);
});

test("does not cover listing media and reveals honest sticky purchase controls only after use", async ({
  page,
}) => {
  await usePersona(page, "individual_buyer");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(testListingPath("list-112"), {
    waitUntil: "domcontentloaded",
  });
  await waitForStableLayout(page);

  await expect(page.getByTestId("listing-mobile-actions")).toHaveCount(0);
  const disclosure = page.getByTestId("purchase-price-disclosure").first();
  await disclosure.scrollIntoViewIfNeeded();
  await expect(disclosure).toContainText("Prix de l’annonce");
  /* The breakdown used to answer three of its four rows — including the total —
     with fixed strings. It now carries the same figures checkout charges, from
     the same escrow calculation, priced for the cheapest fulfilment the listing
     allows. */
  await expect(disclosure).toHaveAttribute("data-quote-state", "resolved");
  await expect(disclosure).not.toContainText("Selon le mode de remise");
  await expect(disclosure).not.toContainText("Selon l’option choisie");
  await expect(disclosure).not.toContainText("Confirmé avant paiement");
  const total = await disclosure.locator("dd").last().innerText();
  expect(total, "the total row must carry a figure").toMatch(/\d/);

  await page.waitForTimeout(100);
  await page.getByTestId("listing-inline-mobile-action").evaluate((element) => {
    const box = element.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + box.bottom + 48);
  });
  await expect(page.getByTestId("listing-mobile-actions")).toBeVisible();
  await expectNoHorizontalOverflow(page, "mobile listing actions after scroll");
});

test("uses one wizard progress system, native intent radios, and remembers the preparation choice", async ({
  page,
}) => {
  await usePersona(page, "individual_seller");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/deposer", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const skip = page.getByRole("checkbox", {
    name: "Ne plus afficher cette préparation sur cet appareil",
  });
  await skip.check();
  await page.getByRole("button", { name: /Commencer mon annonce/ }).click();
  await expect(page.getByRole("progressbar")).toHaveCount(1);
  await expect(page.getByRole("radio")).not.toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: /Progression/ }),
  ).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("progressbar")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});
