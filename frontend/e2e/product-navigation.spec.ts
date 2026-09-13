import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

for (const width of [1408, 390]) {
  test(`selects products from product pages at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/collections", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    if (width < 768) {
      await footer.getByRole("button", { name: "Vendre", exact: true }).click();
    }
    await expect(
      footer.getByRole("link", { name: /^Shongre (Prospects|Facturation)$/ }),
    ).toHaveCount(0);
    await expect(
      footer.getByRole("link", { name: "Toutes les solutions Shongre" }),
    ).toBeVisible();

    await page.goto("/prospects", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const switcher = page.getByRole("button", {
      name: "Choisir un produit Shongre",
    });
    await expect(switcher).toHaveText("Prospects");
    await switcher.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Prospects", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expectNoHorizontalOverflow(page, "open product selector");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(switcher).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      new URL("/", process.env.SHONGRE_FACTURATION_ORIGIN!).href,
    );
    await waitForStableLayout(page);
    await expect(switcher).toHaveText("Facturation");
    await switcher.click();
    await page.getByRole("option", { name: "Prospects", exact: true }).click();
    await expect(page).toHaveURL(
      new URL("/prospects", process.env.E2E_BASE_URL!).href,
    );
    await waitForStableLayout(page);
    await switcher.click();
    await page
      .getByRole("option", { name: "Voir toutes les solutions" })
      .click();
    await expect(page).toHaveURL(
      new URL("/solutions", process.env.E2E_BASE_URL!).href,
    );
    await waitForStableLayout(page);
    await expectNoHorizontalOverflow(page, "solutions destination");
  });
}

test("preserves the focused shell for product-only accounts", async ({
  page,
}) => {
  await usePersona(page, "standalone_facturation");
  await page.goto("/facturation", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
  await expect(
    page.getByRole("button", { name: "Choisir un produit Shongre" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Facturation, ouvrir l’application" }),
  ).toHaveAttribute("href", /\/app$/);
});
