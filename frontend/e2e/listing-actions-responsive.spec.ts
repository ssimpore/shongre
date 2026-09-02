import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { usePersona } from "./personas";

const seedConsentDecision = async (page: Parameters<typeof usePersona>[0]) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "shongre_cookie_consent_v1",
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        choices: { analytics: false, advertising: false },
      }),
    );
  });
};

test("keeps every listing-detail commerce action full-width and readable", async ({
  page,
}) => {
  await usePersona(page, "individual_buyer");
  await seedConsentDecision(page);

  for (const width of [1024, 1065, 1280, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/annonce/list-113", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const actionGroup = page.getByTestId("listing-desktop-actions");
    const actions = actionGroup.getByRole("button");
    await expect(actions).toHaveCount(4);

    const groupBox = await actionGroup.boundingBox();
    expect(groupBox, `missing action group at ${width}px`).not.toBeNull();

    for (const action of await actions.all()) {
      await expect(action, `hidden action at ${width}px`).toBeVisible();
      const actionBox = await action.boundingBox();
      expect(actionBox, `missing action geometry at ${width}px`).not.toBeNull();
      expect(
        Math.round(actionBox!.width),
        `non-full-width action at ${width}px`,
      ).toBe(Math.round(groupBox!.width));
      expect(
        await action.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
        `clipped action label at ${width}px`,
      ).toBe(true);
    }

    await expectNoHorizontalOverflow(page, `listing actions at ${width}px`);
  }

  await page.setViewportSize({ width: 1065, height: 701 });
  await page.goto("/annonce/list-113", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
  await page
    .getByRole("button", { name: "Offre de prix", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Faire une offre de prix" }),
  ).toBeVisible();
});

test("uses the payment icon for every direct-purchase entry point", async ({
  page,
}) => {
  await usePersona(page, "individual_buyer");
  await seedConsentDecision(page);
  await page.setViewportSize({ width: 1408, height: 701 });
  await page.goto("/annonce/list-109", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const purchaseActions = page.locator(
    '[data-marketplace-action="purchase.start"]',
  );
  await expect(purchaseActions).toHaveCount(2);

  for (const action of await purchaseActions.all()) {
    await expect(action.locator("svg.lucide-credit-card")).toHaveCount(1);
    await expect(action.locator("svg.lucide-shopping-bag")).toHaveCount(0);
    await expect(action.locator("svg.lucide-shield-check")).toHaveCount(0);
  }

  const desktopPurchaseAction = page
    .getByTestId("listing-desktop-actions")
    .getByRole("button", { name: "Acheter maintenant", exact: true });
  await desktopPurchaseAction.click();
  await expect(
    page.getByRole("dialog", { name: "Finaliser votre achat" }),
  ).toBeVisible();
});

test("keeps the listing owner workspace action contained at the narrow desktop breakpoint", async ({
  page,
}) => {
  await usePersona(page, "individual_seller");
  await seedConsentDecision(page);
  await page.setViewportSize({ width: 1055, height: 701 });
  await page.goto("/annonce/list-109", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const manageListings = page.getByRole("link", {
    name: "Gérer mes annonces",
    exact: true,
  });
  await expect(manageListings).toBeVisible();
  expect(
    await manageListings.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
    "owner workspace label must remain inside its action",
  ).toBe(true);
  await expectNoHorizontalOverflow(page, "owner listing action at 1055px");

  await manageListings.click();
  await expect(page).toHaveURL(/\/compte\/annonces$/);
});
