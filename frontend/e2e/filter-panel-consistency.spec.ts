import { expect, test, type Locator } from "@playwright/test";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

const FILTER_SURFACES = [
  {
    name: "marketplace search",
    path: "/recherche",
    desktopTrigger: "Catégories",
    mobileTrigger: /^Ouvrir les filtres de recherche/,
  },
  {
    name: "vehicles",
    path: "/auto",
    desktopTrigger: "Type de véhicule",
    mobileTrigger: /^Ouvrir les filtres de recherche/,
  },
  {
    name: "real estate",
    path: "/immo",
    desktopTrigger: "Projet",
    mobileTrigger: /^Ouvrir les filtres de recherche/,
  },
  {
    name: "employment",
    path: "/emploi",
    desktopTrigger: "Métier",
    mobileTrigger: /^Ouvrir les filtres de recherche/,
  },
  {
    name: "education",
    path: "/education",
    desktopTrigger: "Matière",
    mobileTrigger: /^Ouvrir les filtres de recherche/,
  },
] as const;

const DROPDOWN_SURFACES = [
  {
    name: "vehicles",
    path: "/auto",
    filterLabel: "Type de véhicule",
    sortLabel: "Trier les véhicules",
    nextSortLabel: "Prix croissant",
    expectedSort: "price_asc",
  },
  {
    name: "employment",
    path: "/emploi",
    filterLabel: "Métier",
    sortLabel: "Trier les offres",
    nextSortLabel: "Plus récentes",
    expectedSort: "newest",
  },
  {
    name: "education",
    path: "/education",
    filterLabel: "Matière",
    sortLabel: "Trier les professeurs",
    nextSortLabel: "Prix croissant",
    expectedSort: "price_asc",
  },
] as const;

const expectBrandedBooleanControl = async (
  control: Locator,
  kind: "checkbox" | "radio",
) => {
  await expect
    .poll(async () =>
      control.evaluate((element, controlKind) => {
        const input = element as HTMLInputElement;
        const rootStyle = getComputedStyle(document.documentElement);
        const style = getComputedStyle(input);
        const mark = getComputedStyle(input, "::before");
        const probe = document.createElement("span");
        probe.style.color = rootStyle.getPropertyValue("--color-primary");
        document.body.appendChild(probe);
        const primary = getComputedStyle(probe).color;
        probe.style.color = rootStyle.getPropertyValue("--color-on-primary");
        const onPrimary = getComputedStyle(probe).color;
        probe.remove();

        return {
          appearance: style.appearance,
          usesPrimaryBorder: style.borderColor === primary,
          usesExpectedFill:
            controlKind === "radio"
              ? mark.backgroundColor === primary
              : style.backgroundColor === primary,
          usesExpectedMark:
            controlKind === "radio"
              ? mark.backgroundColor === primary
              : mark.borderRightColor === onPrimary,
          markVisible:
            mark.transform !== "none" && !mark.transform.includes("0, 0, 0, 0"),
        };
      }, kind),
    )
    .toEqual({
      appearance: "none",
      usesPrimaryBorder: true,
      usesExpectedFill: true,
      usesExpectedMark: true,
      markVisible: true,
    });
};

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
});

test.describe("canonical marketplace filter panel", () => {
  test("desktop quick-filter rails show only complete controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 800 });

    for (const surface of FILTER_SURFACES) {
      await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const rail = page.locator("[data-search-filter-rail]");
      await expect(rail).toBeVisible();
      const geometry = await rail.evaluate((element) => {
        const railRect = element.getBoundingClientRect();
        const buttons = [...element.querySelectorAll("button")].filter(
          (button) => getComputedStyle(button).visibility !== "hidden",
        );
        return {
          railLeft: railRect.left,
          railRight: railRect.right,
          buttons: buttons.map((button) => {
            const rect = button.getBoundingClientRect();
            return { left: rect.left, right: rect.right };
          }),
          visibleCount: Number(
            element.getAttribute("data-search-filter-visible-count"),
          ),
          overflowCount: Number(
            element.getAttribute("data-search-filter-overflow-count"),
          ),
        };
      });

      expect(geometry.buttons.length).toBeGreaterThan(0);
      for (const button of geometry.buttons) {
        expect(button.left).toBeGreaterThanOrEqual(geometry.railLeft - 1);
        expect(button.right).toBeLessThanOrEqual(geometry.railRight + 1);
      }
      expect(geometry.visibleCount + geometry.overflowCount).toBe(
        surface.name === "real estate" ? 4 : 5,
      );
      await expect(
        rail.getByRole("button", { name: /Afficher les filtres/ }),
      ).toBeVisible();
    }
  });

  for (const surface of FILTER_SURFACES) {
    test(`${surface.name} uses the shared desktop right drawer`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const panel = page.locator('[data-filter-panel="drawer"]');
      await expect(panel).toBeHidden();
      await page
        .locator("[data-search-filter-rail]")
        .getByRole("button", {
          name: surface.desktopTrigger,
          exact: true,
        })
        .click();

      await expect(panel).toHaveCount(1);
      await expect(panel).toBeVisible();
      await expect(page.getByRole("dialog").getByRole("heading")).toBeVisible();
      await expect(
        panel.getByRole("button", { name: "Réinitialiser", exact: true }),
      ).toBeVisible();
      await expect
        .poll(() =>
          panel
            .locator("[data-filter-section]")
            .first()
            .evaluate((section) => {
              const style = getComputedStyle(section);
              return {
                hasBorder: Number.parseFloat(style.borderTopWidth) > 0,
                hasRadius: Number.parseFloat(style.borderTopLeftRadius) > 0,
              };
            }),
        )
        .toEqual({ hasBorder: true, hasRadius: true });

      const checkbox = panel.getByRole("checkbox").first();
      await expect(checkbox).toBeVisible();
      if (await checkbox.isChecked()) await checkbox.click();
      await checkbox.click();
      await expect(checkbox).toBeChecked();
      await expectBrandedBooleanControl(checkbox, "checkbox");

      if (surface.name === "marketplace search") {
        const selectedSellerType = panel.getByRole("button", {
          name: "Tous",
          exact: true,
        });
        await expect(selectedSellerType).toHaveClass(/bg-primary/);
        await expect(selectedSellerType).toHaveClass(/text-on-primary/);
      }
    });

    test(`${surface.name} uses the shared mobile drawer presentation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      await page
        .getByRole("button", { name: surface.mobileTrigger })
        .first()
        .click();

      const panel = page.locator('[data-filter-panel="drawer"]');
      await expect(panel).toHaveCount(1);
      await expect(panel).toBeVisible();
      await expect(
        panel.getByRole("button", { name: "Réinitialiser", exact: true }),
      ).toBeVisible();
    });
  }
});

test.describe("canonical vertical dropdowns", () => {
  for (const surface of DROPDOWN_SURFACES) {
    test(`${surface.name} composes the shared listbox primitive`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const main = page.locator("main#main-content");
      await expect(main.locator("select")).toHaveCount(0);
      await main
        .locator("[data-search-filter-rail]")
        .getByRole("button", { name: surface.filterLabel, exact: true })
        .click();

      const panel = main.locator('[data-filter-panel="drawer"]');
      const filter = panel.getByRole("button", {
        name: surface.filterLabel,
        exact: true,
      });
      await expect(filter).toBeVisible();
      await expect(filter).toHaveAttribute("aria-haspopup", "listbox");
      await expect(filter).toHaveClass(/rounded-control/);
      await expect(filter).toHaveClass(/border-border-base/);
      await page.getByRole("button", { name: "Fermer" }).click();

      const sort = main.getByRole("button", {
        name: surface.sortLabel,
        exact: true,
      });
      await expect(sort).toBeVisible();
      await expect(sort).toHaveAttribute("aria-haspopup", "listbox");
      await expect(sort).toHaveClass(/rounded-control/);
      await expect(sort).toHaveClass(/border-border-base/);

      await sort.click();
      const listbox = main.getByRole("listbox", {
        name: surface.sortLabel,
      });
      await expect(listbox).toBeVisible();
      await expect(listbox).toHaveClass(/rounded-card/);
      await expect(listbox).toHaveClass(/shadow-dropdown/);
      await expect(listbox).toHaveClass(/border-border-base/);
      await expect(
        listbox.getByText("Trier par", { exact: true }),
      ).toBeVisible();

      await listbox
        .getByRole("option", { name: surface.nextSortLabel, exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`(?:\\?|&)sort=${surface.expectedSort}(?:&|$)`),
      );
      await expect(listbox).toBeHidden();
      await expect(sort).toBeFocused();
    });
  }
});
