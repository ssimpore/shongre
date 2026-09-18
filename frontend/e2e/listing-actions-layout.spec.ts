import { readBrowserFixtures, testListingPath } from "./fixtures";
import { expect, test } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { loginWithForm } from "./browser-api";

const belgianListingUrl = () =>
  new URL(`/be${testListingPath("list-be-201")}`, process.env.PUBLIC_INTL_URL)
    .href;

const revealStickyActions = async (page: import("@playwright/test").Page) => {
  const inlineAction = page.getByTestId("listing-inline-mobile-action");
  await inlineAction.scrollIntoViewIfNeeded();
  await expect(inlineAction).toBeVisible();
  await page.waitForTimeout(100);
  await inlineAction.evaluate((element) => {
    const box = element.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + box.bottom + 48);
  });
  await expect(page.getByTestId("listing-mobile-actions")).toBeVisible();
};

test.describe("listing negotiation and reservation eligibility @serial", () => {
  for (const width of [390, 1408]) {
    test(`shows eligible actions and resumes them after sign-in at ${width}px`, async ({
      page,
    }) => {
      await useEstablishedConsent(page);
      await usePersona(page, "guest");
      await page.setViewportSize({ width, height: 900 });
      const path = `/be${testListingPath("list-be-201")}`;
      const actionArea = page.getByTestId(
        width < 1024
          ? "listing-inline-mobile-action"
          : "listing-desktop-actions",
      );

      for (const [action, intent, title] of [
        ["offer.create", "offer", "Faire une offre de prix"],
        ["reservation.start", "reserve", "Réserver l’annonce"],
      ] as const) {
        await usePersona(page, "guest");
        await page.goto(belgianListingUrl(), { waitUntil: "domcontentloaded" });
        // The action is server-rendered before React handles it; a click
        // that lands before hydration goes nowhere.
        await waitForStableLayout(page);
        const button = actionArea.locator(
          `[data-marketplace-action="${action}"]`,
        );
        await expect(button).toBeVisible();
        await button.click();
        await expect(page).toHaveURL(/\/be\/connexion\?/);
        const redirect = new URL(page.url()).searchParams.get("redirect");
        expect(redirect).toBe(`${testListingPath("list-be-201")}?${intent}=1`);

        const account = readBrowserFixtures().accounts.user_camille;
        await page.locator("#login-email").fill(account.email);
        await page
          .locator("#login-password")
          .fill(process.env.DEMO_ACCOUNT_PASSWORD!);
        await page
          .getByRole("button", { name: "Se connecter", exact: true })
          .click();
        const dialog = page.getByRole("dialog", { name: title });
        await expect(dialog).toBeVisible();
        expect(new URL(page.url()).pathname).toBe(path);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        expect(new URL(page.url()).searchParams.has(intent)).toBe(false);
        await expectNoHorizontalOverflow(page, `${action} at ${width}px`);
      }
    });
  }

  test("omits ineligible actions and rejects action links on fixed, free and owned listings", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width: 1408, height: 900 });
    await usePersona(page, "individual_seller");
    for (const source of ["list-112", "list-110"]) {
      await page.goto(`${testListingPath(source)}?offer=1&reserve=1`, {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator("h1")).toBeVisible();
      await expect
        .poll(() => new URL(page.url()).searchParams.has("offer"))
        .toBe(false);
      await expect(
        page.locator('[data-marketplace-action="offer.create"]:visible'),
      ).toHaveCount(0);
      await expect(
        page.locator('[data-marketplace-action="reservation.start"]:visible'),
      ).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await loginWithForm(
      page,
      process.env.PUBLIC_INTL_URL!,
      {
        email: readBrowserFixtures().accounts.user_thomas.email,
        password: process.env.DEMO_ACCOUNT_PASSWORD!,
        id: "user_thomas",
      },
      "/be",
    );
    await page.goto(`${belgianListingUrl()}?offer=1&reserve=1`, {
      waitUntil: "domcontentloaded",
    });
    await expect
      .poll(() => new URL(page.url()).searchParams.has("offer"))
      .toBe(false);
    await expect(
      page
        .getByRole("main")
        .locator('[data-marketplace-action="listing.publish"]:visible'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-marketplace-action="offer.create"]:visible'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-marketplace-action="reservation.start"]:visible'),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("listing mobile action hierarchy", () => {
  /*
   * On a purchasable listing the first phone-width action block offered only
   * the purchase and the price offer; the seller's Message button first
   * appeared in the sidebar rendered under the whole description, measured at
   * 4,760px of a 6,680px page. Every buyer action the resolver grants belongs
   * in that first block.
   */
  test("offers the seller message beside the purchase in the first phone-width action block", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(testListingPath("list-109"), {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const inlineAction = page.getByTestId("listing-inline-mobile-action");
    await expect(
      inlineAction.locator('[data-marketplace-action="purchase.start"]'),
    ).toBeVisible();
    const message = inlineAction.locator(
      '[data-marketplace-action="message.send"]',
    );
    await expect(message).toBeVisible();
    const geometry = await message.evaluate((element) => ({
      top: element.getBoundingClientRect().top + window.scrollY,
      pageHeight: document.documentElement.scrollHeight,
    }));
    // Reachable within the first two screens of a page far longer than that.
    expect(geometry.top).toBeLessThan(844 * 2);
    expect(geometry.pageHeight).toBeGreaterThan(844 * 2);
  });

  test("keeps secondary actions balanced and gives a three-action primary CTA a full row", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 444, height: 795 });
    await page.goto(testListingPath("list-109"), {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await revealStickyActions(page);
    const actions = page.getByTestId("listing-mobile-actions");
    await expect(actions).toBeVisible();
    await expect(actions.getByRole("button")).toHaveCount(3);

    const layout = await actions.evaluate((container) => {
      const buttons = [
        ...container.querySelectorAll<HTMLButtonElement>("button"),
      ];
      const containerRect = container.getBoundingClientRect();
      return {
        containerWidth: containerRect.width,
        buttons: buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { top: Math.round(rect.top), width: rect.width };
        }),
      };
    });

    expect(layout.buttons[0].top).toBe(layout.buttons[1].top);
    expect(layout.buttons[2].top).toBeGreaterThan(layout.buttons[0].top);
    expect(layout.buttons[2].width).toBeGreaterThanOrEqual(
      layout.containerWidth - 2,
    );
    await expectNoHorizontalOverflow(
      page,
      "listing mobile action hierarchy at 444px",
    );
  });

  test("keeps the action hierarchy contained at the minimum supported width", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(testListingPath("list-109"), {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await revealStickyActions(page);
    const actions = page.getByTestId("listing-mobile-actions");
    const layout = await actions.evaluate((container) => {
      const buttons = [
        ...container.querySelectorAll<HTMLButtonElement>("button"),
      ];
      const containerRect = container.getBoundingClientRect();
      const primaryRect = buttons.at(-1)?.getBoundingClientRect();
      return {
        containerWidth: containerRect.width,
        primaryWidth: primaryRect?.width ?? 0,
      };
    });

    expect(layout.primaryWidth).toBeGreaterThanOrEqual(
      layout.containerWidth - 2,
    );
    await expectNoHorizontalOverflow(
      page,
      "listing mobile action hierarchy at 320px",
    );
  });

  test("keeps four-action layouts in two balanced rows", async ({ page }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 444, height: 844 });
    await page.goto(belgianListingUrl(), {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await revealStickyActions(page);
    const actions = page.getByTestId("listing-mobile-actions");
    await expect(actions.getByRole("button")).toHaveCount(4);
    const purchaseAction = actions.locator(
      '[data-marketplace-action="purchase.start"]',
    );
    await expect(purchaseAction.locator("svg.lucide-credit-card")).toHaveCount(
      1,
    );
    await expect(purchaseAction.locator("svg.lucide-shopping-bag")).toHaveCount(
      0,
    );

    const layout = await actions.evaluate((container) => {
      const buttons = [
        ...container.querySelectorAll<HTMLButtonElement>("button"),
      ];
      const containerWidth = container.getBoundingClientRect().width;
      return {
        containerWidth,
        buttons: buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { top: Math.round(rect.top), width: rect.width };
        }),
      };
    });

    expect(layout.buttons[0].top).toBe(layout.buttons[1].top);
    expect(layout.buttons[2].top).toBe(layout.buttons[3].top);
    expect(layout.buttons[2].width).toBe(layout.buttons[0].width);
    expect(layout.buttons[3].width).toBe(layout.buttons[1].width);
    expect(layout.buttons[2].top).toBeGreaterThan(layout.buttons[0].top);
    await expectNoHorizontalOverflow(
      page,
      "four-action mobile hierarchy at 444px",
    );
  });
});

test.describe("listing price disclosure", () => {
  test("every row carries a value, and none of them is a placeholder", async ({
    page,
  }) => {
    /* Three of the four rows were fixed strings — "Selon le mode de remise",
       "Selon l'option choisie" and, on the total, "Confirmé avant paiement" —
       because the only quote that could produce numbers required
       `permission("order.create")`. A signed-out visitor is the normal case for
       a listing arriving from a search engine, and the disclosure now resolves
       for one — but the demo fixture inventory this suite runs against only
       offers direct purchase to a signed-in buyer, so the persona matches the
       rest of the file. */
    await usePersona(page, "individual_buyer");
    await page.setViewportSize({ width: 1408, height: 900 });
    await page.goto(testListingPath("list-112"), {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    /* The panel renders twice — once in the `lg:hidden` inline row and once in
       the sticky sidebar — so the assertion has to name the one this width
       actually shows, not whichever comes first in the DOM. */
    const disclosure = page
      .locator('[data-testid="purchase-price-disclosure"]:visible')
      .first();
    await disclosure.scrollIntoViewIfNeeded();
    await expect(disclosure).toHaveAttribute("data-quote-state", "resolved");

    const values = await disclosure.locator("dd").allInnerTexts();
    expect(values.length).toBe(4);
    for (const value of values) {
      expect(value.trim(), "no row may be empty").not.toBe("");
      expect(value).not.toMatch(/Selon |Confirmé avant paiement/);
    }
    // A zero delivery fee is not "Don / Gratuit", which is the wording for a
    // listing given away and says nothing true about delivery.
    expect(values.join(" | ")).not.toContain("Don / Gratuit");
  });
});

test.describe("listing purchase affordance", () => {
  for (const [width, height] of [
    [399, 602],
    [768, 900],
  ] as const) {
    test(`shows one purchase control at a time at ${width}px`, async ({
      page,
    }) => {
      /* The sticky bar observed only the inline mobile row, so once the sticky
         sidebar row scrolled into view its own Acheter/Message pair sat on
         screen alongside the bar's — measured at two scroll offsets on a 399px
         phone and three at 768px. It also latched on "the inline row is not
         intersecting", which the lazily hydrated sections above that row set on
         their own, so at 768px the bar was pinned over the listing media at
         scroll 0. */
      await usePersona(page, "guest");
      await page.setViewportSize({ width, height });
      await page.goto(testListingPath("list-112"), {
        waitUntil: "domcontentloaded",
      });
      await waitForStableLayout(page);

      const survey = await page.evaluate(async () => {
        const onScreen = (element: Element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            box.bottom > 0 &&
            box.top < window.innerHeight
          );
        };
        const surfaceOf = (element: Element) => {
          if (element.closest('[data-testid="listing-mobile-actions"]'))
            return "bar";
          if (element.closest('[data-testid="listing-inline-mobile-action"]'))
            return "inline";
          return "sidebar";
        };
        const max = document.body.scrollHeight - window.innerHeight;
        const rows: { y: number; surfaces: string[] }[] = [];
        for (let y = 0; y <= max; y += 250) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 250));
          const shown = [
            ...document.querySelectorAll(
              '[data-marketplace-action="purchase.start"]',
            ),
          ].filter(onScreen);
          rows.push({
            y,
            surfaces: [...new Set(shown.map(surfaceOf))].sort(),
          });
        }
        return rows;
      });

      const duplicated = survey.filter((row) => row.surfaces.length > 1);
      expect(
        duplicated.map((row) => `${row.y}:${row.surfaces.join("+")}`),
        "two purchase controls must never be on screen together",
      ).toEqual([]);

      // The bar must still stay off the listing media on arrival.
      expect(survey[0].surfaces).not.toContain("bar");
    });
  }
});
