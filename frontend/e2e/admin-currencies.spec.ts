import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.describe("currency governance", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "admin");
  });

  test("exposes USD and XOF through audited platform and market controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await page.goto("/admin/marches");
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { name: "Gestion des devises" }),
    ).toBeVisible();
    await expect(
      page.locator("p").filter({ hasText: "$ USD · Dollar américain" }),
    ).toBeVisible();
    await expect(
      page.locator("p").filter({ hasText: "F CFA XOF · Franc CFA BCEAO" }),
    ).toBeVisible();
    await expect(page.getByLabel("Devise par défaut")).toHaveValue("EUR");
    await expect(page.getByRole("checkbox", { name: "€ EUR" })).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "$ USD" }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "F CFA XOF" }),
    ).not.toBeChecked();
    await expect(page.getByLabel("Devise source")).toHaveValue("EUR");
    await expect(page.getByLabel("Devise cible")).toHaveValue("USD");
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the currency controls usable on a narrow staff viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/marches");
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { name: "Gestion des devises" }),
    ).toBeVisible();
    await expect(page.getByLabel("Devise source")).toBeVisible();
    await expect(page.getByLabel("Devise cible")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
