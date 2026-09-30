import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { statSync } from "node:fs";
import { useEstablishedConsent, usePersona } from "./personas";
import { browserApi } from "./browser-api";

test.describe("audit task recovery", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("exact price bounds survive focus and numeric edits", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/recherche?maxPrice=195");
    await page
      .getByRole("button", {
        name: "Ouvrir les filtres de recherche",
        exact: true,
      })
      .click();
    const panel = page.locator("#search-filter-panel");
    const max = panel.getByRole("textbox", {
      name: "Prix maximum",
      exact: true,
    });
    await expect(max).toHaveValue("195");
    const slider = panel.getByRole("slider", {
      name: "Prix maximum",
      exact: true,
    });
    await expect(slider).toHaveAttribute("aria-valuetext", /195/);
    await slider.focus();
    await slider.press("Tab");
    await expect(page).toHaveURL(/maxPrice=195/);
    await max.focus();
    await max.press("Tab");
    await expect(page).toHaveURL(/maxPrice=195/);
    await max.fill("195,5");
    await max.press("Enter");
    await expect(page).toHaveURL(/maxPrice=195\.5/);
    await panel
      .getByRole("textbox", { name: "Prix minimum", exact: true })
      .fill("195,5");
    await panel
      .getByRole("textbox", { name: "Prix minimum", exact: true })
      .press("Enter");
    await expect(page).toHaveURL(/minPrice=195\.5/);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("exact-price.png"),
      fullPage: true,
    });
  });

  for (const [path, operation] of [
    ["/auto", "auto/search"],
    ["/immo", "real-estate/search"],
    ["/emploi", "employment/search"],
    ["/education", "education/search"],
  ]) {
    test(`${path} retries the same failed search`, async ({ page }) => {
      let requests = 0;
      const bodies: string[] = [];
      await page.route(`**/api/v1/${operation}**`, async (route) => {
        requests += 1;
        bodies.push(
          route.request().postData() || new URL(route.request().url()).search,
        );
        if (requests === 1) await route.abort("failed");
        else await route.continue();
      });
      await page.goto(`${path}?q=velo-audit`);
      const retry = page.getByRole("button", {
        name: "Réessayer",
        exact: true,
      });
      await retry.click();
      await expect.poll(() => requests).toBe(2);
      await expect(retry).toBeHidden();
      expect(bodies[1]).toBe(bodies[0]);
      await expect(page).toHaveURL(/q=velo-audit/);
    });
  }

  test("education loading exposes a valid status", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/education/search**", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/education?q=velo-audit", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Chargement des professeurs" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    release();
    expect(results.violations).toEqual([]);
  });

  test("support choices survive a delayed lookup and sign-in continuation", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 740 });
    let release!: () => void;
    let lookupStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      lookupStarted = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/listings/audit-unavailable", async (route) => {
      lookupStarted();
      await held;
      await route.fulfill({
        status: 404,
        json: { error: { code: "NOT_FOUND", message: "Unavailable" } },
      });
    });
    await page.goto("/contact?listingId=audit-unavailable", {
      waitUntil: "domcontentloaded",
    });
    // The lookup starts in the mounted effect; exercise the keyboard after hydration.
    await started;
    const category = page.getByRole("radio", {
      name: "Autre demande ou suggestion",
      exact: true,
    });
    await category.focus();
    await category.press("Space");
    await expect(category).toBeChecked();
    const reason = page.getByRole("radio", {
      name: "Question générale sur le fonctionnement de Shongre",
      exact: true,
    });
    await reason.focus();
    await reason.press("Space");
    release();
    await expect(category).toBeChecked();
    await expect(
      page.getByRole("textbox", { name: "Détaillez votre situation" }),
    ).toHaveCount(0);
    const signIn = page
      .getByRole("link", { name: "Se connecter", exact: true })
      .last();
    const href = await signIn.getAttribute("href");
    const destination = new URL(href!, page.url()).searchParams.get("redirect");
    expect(destination).toContain("listingId=audit-unavailable");
    expect(destination).toContain("category=other");
    expect(destination).toContain("reason=general_question");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await page.screenshot({
      path: testInfo.outputPath("support-guest.png"),
      fullPage: true,
    });
  });

  test("taxonomy edits persist without another navigation read", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    let reads = 0;
    page.on("request", (request) => {
      if (
        request.method() === "GET" &&
        request.url().includes("header-navigation")
      )
        reads += 1;
    });
    await page.goto("/admin/taxonomie");
    const control = page.getByRole("switch", {
      name: "Activer ou désactiver Véhicules",
    });
    await expect(control).toBeVisible();
    const initial = await control.isChecked();
    expect(reads).toBeGreaterThan(0);
    const baseline = reads;
    await control.focus();
    await control.press("Space");
    await expect(control).toBeChecked({ checked: !initial });
    await page.waitForTimeout(1100);
    await expect(control).toBeChecked({ checked: !initial });
    expect(reads).toBe(baseline);
    await control.press("Space");
    await expect(control).toBeChecked({ checked: initial });
  });
});

test("salary amounts retain their chosen period and decimal precision", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
  let query: Record<string, unknown> | undefined;
  await page.route("**/api/v1/employment/search**", async (route) => {
    query = route.request().postDataJSON();
    await route.continue();
  });
  await page.goto(
    "/emploi?salary=195%2C50&salaryFrequency=employment.fr.salary_frequency.month",
  );
  await expect.poll(() => query?.salaryMinimumMinor).toBe(19550);
  expect(query?.salaryFrequencyId).toBe("employment.fr.salary_frequency.month");
  await page.goto("/emploi?salary=195%2C50");
  await expect(
    page.getByRole("heading", { name: "Vérifiez la rémunération" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Corriger les filtres" }).click();
  await expect(
    page.getByRole("textbox", { name: /Rémunération minimale/ }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("invalid salary filters retain retry when the correction catalogue fails", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  let catalogueReads = 0;
  await page.route("**/api/v1/employment/catalog**", async (route) => {
    catalogueReads += 1;
    if (catalogueReads === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/emploi?salary=195%2C50");
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect.poll(() => catalogueReads).toBe(2);
  await page.getByRole("button", { name: "Corriger les filtres" }).click();
  await expect(
    page.getByRole("textbox", { name: /Rémunération minimale/ }),
  ).toHaveValue("195,50");
});

for (const [persona, projection] of [
  ["individual_buyer", "purchases"],
  ["individual_seller", "sales"],
] as const) {
  test(`transaction continuation restores the ${projection} dossier with readable copy`, async ({
    page,
  }, testInfo) => {
    await useEstablishedConsent(page);
    await usePersona(page, persona);
    await page.goto("/compte/achats");
    await expect(
      page.getByRole("heading", {
        name: "Transactions, réservations et paiements",
        exact: true,
      }),
    ).toBeVisible();
    const response = await browserApi(page, `/orders/${projection}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    const orders = response.body as unknown as Array<{
      id: string;
      orderNumber: string;
    }>;
    expect(orders.length).toBeGreaterThan(0);
    const order = orders[0];
    await page.goto(
      `/compte/achats?transactionId=${encodeURIComponent(order.id)}`,
    );
    await expect(
      page.getByRole("dialog", {
        name: `Commande ${order.orderNumber}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText(
      "transactions.transactionsPage.",
    );
    await page.screenshot({
      path: testInfo.outputPath(`transaction-${projection}.png`),
    });
  });
}

test("moderators inspect the target before an explicitly named decision", async ({
  page,
}, testInfo) => {
  await useEstablishedConsent(page);
  await usePersona(page, "moderator");
  await page.goto("/admin/moderation");
  const article = page
    .getByRole("article")
    .filter({ hasText: "Annonce" })
    .first();
  await article
    .getByRole("button", { name: "Examiner le signalement" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Examiner le signalement" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Motif :/)).toBeVisible();
  await expect
    .poll(
      async () =>
        (await dialog.innerText()).includes("indisponible") ||
        (await dialog
          .getByRole("link", {
            name: "Voir l’annonce complète (nouvel onglet)",
          })
          .count()) === 1,
    )
    .toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("moderation-inspection.png"),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Revenir à la file" }).click();
  await article.getByRole("button", { name: "Classer sans suite" }).click();
  await expect(
    page.getByRole("dialog", { name: /Classer sans suite — Annonce/ }),
  ).toBeVisible();
});

test("report reviewers can inspect reports without appeal-review permissions", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  await usePersona(page, "trust_safety");
  const appealRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/admin\/moderation\/(cases|appeals)/.test(request.url()))
      appealRequests.push(request.url());
  });
  await page.goto("/admin/moderation");
  await expect(
    page.getByRole("button", { name: "Examiner le signalement" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Dossiers et recours/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Retirer l’annonce", exact: true }),
  ).toHaveCount(0);
  expect(appealRequests).toEqual([]);
});

test("hero artwork uses smaller responsive images only where visible", async ({
  browser,
}, testInfo) => {
  const originalBytes = statSync(
    new URL("../public/images/home-marketplace-hero.webp", import.meta.url),
  ).size;
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      viewport: { width, height: 844 },
    });
    const page = await context.newPage();
    const artworkRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("home-marketplace-hero"))
        artworkRequests.push(request.url());
    });
    try {
      await useEstablishedConsent(page);
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: /Trouvez la perle rare/ }),
      ).toBeVisible();
      await expect(page.getByText("Chargement de SHONGRE.…")).toBeHidden();
      const image = page.locator("[data-home-hero-surface] > picture img");
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const source = await image.evaluate(
        (element: HTMLImageElement) => element.currentSrc,
      );
      if (width === 390) {
        expect(source).toMatch(/^data:/);
        expect(artworkRequests).toEqual([]);
      } else {
        const url = new URL(source);
        expect(url.pathname).toBe("/_next/image");
        expect(url.searchParams.get("url")).toBe(
          "/images/home-marketplace-hero.webp",
        );
        const response = await page.request.get(source, {
          headers: { Accept: "image/webp" },
        });
        expect(response.ok()).toBeTruthy();
        const bytes = (await response.body()).length;
        expect(bytes).toBeLessThan(originalBytes);
        await testInfo.attach(`hero-${width}-bytes.json`, {
          contentType: "application/json",
          body: JSON.stringify({ width, source, originalBytes, bytes }),
        });
      }
      await page.screenshot({
        path: testInfo.outputPath(`optimized-hero-${width}.png`),
      });
    } finally {
      await context.close();
    }
  }
});

test("records discovery image performance after the audit fixes @serial", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const samples = [];
  for (const [path, width] of [
    ["/", 1440],
    ["/", 390],
    ["/recherche", 390],
  ] as const) {
    for (let sample = 1; sample <= 2; sample++) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        baseURL: testInfo.project.use.baseURL,
      });
      const page = await context.newPage();
      await useEstablishedConsent(page);
      await page.addInitScript(() => {
        const metrics = {
          lcp: 0,
          cls: 0,
          longTasks: [] as number[],
          lcpElement: "",
          lcpUrl: "",
        };
        (window as unknown as { auditMetrics: typeof metrics }).auditMetrics =
          metrics;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[])
            if (!e.hadRecentInput) metrics.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & {
            element?: HTMLElement;
            url?: string;
          })[]) {
            metrics.lcp = e.startTime;
            metrics.lcpUrl = e.url || "";
            metrics.lcpElement =
              e.element?.tagName +
              " " +
              (e.element?.getAttribute("alt") ||
                e.element?.textContent?.slice(0, 80) ||
                "");
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) metrics.longTasks.push(e.duration);
        }).observe({ type: "longtask", buffered: true });
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 200000,
        uploadThroughput: 100000,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(8000);
      const metrics = await page.evaluate(() => {
        const m = (
          window as unknown as {
            auditMetrics: {
              lcp: number;
              cls: number;
              longTasks: number[];
              lcpElement: string;
              lcpUrl: string;
            };
          }
        ).auditMetrics;
        const n = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType(
          "resource",
        ) as PerformanceResourceTiming[];
        return {
          ...m,
          title: document.querySelector("main h1")?.textContent,
          mainImageCount: document.querySelectorAll("main img").length,
          lcpRequest: resources.find((r) => r.name === m.lcpUrl)?.toJSON(),
          ttfb: n.responseStart - n.requestStart,
          dom: n.domContentLoadedEventEnd,
          resourceCount: resources.length,
          encodedBytes: resources.reduce(
            (sum, r) => sum + r.encodedBodySize,
            0,
          ),
          totalBlockingTime: m.longTasks.reduce(
            (sum, d) => sum + Math.max(0, d - 50),
            0,
          ),
          unloadedImages: [...document.images].filter(
            (e) => !e.complete || !e.naturalWidth,
          ).length,
        };
      });
      samples.push({ path, width, sample, ...metrics });
      expect(metrics.title).toBeTruthy();
      await page.screenshot({
        path: testInfo.outputPath(
          `lab-${path === "/" ? "home" : "search"}-${width}-${sample}.png`,
        ),
      });
      await context.close();
    }
  }
  await testInfo.attach("discovery-performance.json", {
    contentType: "application/json",
    body: JSON.stringify(
      {
        environment:
          "isolated production Web and fixture API; Chrome CDP 4x CPU; 150ms latency; 200000 bytes/s download; 100000 bytes/s upload; cold browser cache; 8-second post-DOM observation; two samples; long-task blocking is not standard TBT or INP; no field claim",
        samples,
      },
      null,
      2,
    ),
  });
});
