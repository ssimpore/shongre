import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

test.describe("account identity badges", () => {
  test("shares the compact professional badge recipe between storefronts and listing cards", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/boutique/auto-select-lyon", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const storefrontBadge = page
      .getByRole("heading", { level: 1, name: "Auto Select Lyon" })
      .locator("..")
      .locator('[data-ui-pro-badge="true"]');
    await expect(storefrontBadge).toHaveAttribute(
      "aria-label",
      "Compte professionnel",
    );
    await expect(storefrontBadge).toContainClass("text-overline");
    // The shared recipe is the badge's geometry and type scale; the tone is
    // the one thing a surface chooses (inverse on the storefront banner,
    // primary over card artwork), so colour tokens are set aside.
    const layoutRecipe = (value: string | null) =>
      (value ?? "")
        .split(/\s+/)
        .filter(
          (token) =>
            token && !/^(bg-|text-text-|text-on-|border-|border$)/.test(token),
        )
        .sort()
        .join(" ");
    const storefrontRecipe = layoutRecipe(
      await storefrontBadge.getAttribute("class"),
    );
    expect(storefrontRecipe).toContain("text-overline");

    await page.goto("/auto", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const listingCardBadge = page
      .locator('[data-listing-card="true"] [data-ui-pro-badge="true"]')
      .first();
    await expect(listingCardBadge).toBeVisible();
    await expect(listingCardBadge).toHaveAttribute(
      "aria-label",
      "Vendeur professionnel",
    );
    expect(layoutRecipe(await listingCardBadge.getAttribute("class"))).toBe(
      storefrontRecipe,
    );
  });

  test("moves the individual verification mark beside the account name", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/compte", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const sidebarIdentity = page.locator("aside [data-account-identity]");
    await expect(sidebarIdentity).toContainText("Thomas Laurent");
    await expect(
      sidebarIdentity.locator('[data-ui-verified-icon="true"]'),
    ).toHaveAttribute("aria-label", "Profil vérifié");
    await expect(
      page.locator("[data-account-hero]").getByText("Vérifié", { exact: true }),
    ).toHaveCount(0);
  });

  test("redirects administrators away from the customer account workspace", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/compte", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: /Bonjour, Antoine Fabre/ }),
    ).toBeVisible();
    await expect(page.locator("[data-account-hero]")).toHaveCount(0);
  });

  test("keeps the standalone verification badge hidden for professional accounts", async ({
    page,
  }) => {
    await usePersona(page, "pro_seller");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compte", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const hero = page.locator("[data-account-hero]");
    await expect(hero.getByText("Pro", { exact: true })).toHaveCount(0);
    await expect(hero.getByText("Vérifié", { exact: true })).toHaveCount(0);
    await expect(
      page.locator('[data-ui-pro-badge="true"]:visible').first(),
    ).toHaveAttribute("aria-label", "Compte professionnel");
    await expect(
      page.getByRole("heading", { name: "Niveaux de sécurité", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "(KYC / KYB / IBAN) →", exact: true }),
    ).toBeVisible();
  });
});
