import { expect, test, type Page } from "@playwright/test";
import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import { waitForStableLayout } from "./overflow";
import { usePersona } from "./personas";
import { DEMO_LISTING_ID } from "./routes";

const CONSENT_KEY = "shongre_cookie_consent_v1";

async function installAnalyticsProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as typeof window & {
      __shongreAnalyticsEvents?: AnalyticsEventEnvelope[];
    };
    target.__shongreAnalyticsEvents = [];
    window.addEventListener("shongre:analytics", (event) => {
      target.__shongreAnalyticsEvents?.push(
        (event as CustomEvent<AnalyticsEventEnvelope>).detail,
      );
    });
  });
}

function capturedEvents(page: Page): Promise<AnalyticsEventEnvelope[]> {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          __shongreAnalyticsEvents?: AnalyticsEventEnvelope[];
        }
      ).__shongreAnalyticsEvents ?? [],
  );
}

test.describe("consent-aware canonical analytics", () => {
  test.beforeEach(async ({ page }) => {
    await installAnalyticsProbe(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
  });

  test("emits no event before a choice or after refusal", async ({ page }) => {
    await expect(
      page.locator('[aria-labelledby="cookie-banner-title"]'),
    ).toBeVisible();
    expect(await capturedEvents(page)).toEqual([]);

    await page.getByRole("button", { name: /tout refuser/i }).click();
    await page.goto("/recherche?query=velo");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    expect(await capturedEvents(page)).toEqual([]);
  });

  test("records a sanitized search-to-listing journey after opt-in", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /tout accepter/i }).click();
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? Boolean(JSON.parse(raw).categories?.analytics) : false;
        }, CONSENT_KEY),
      )
      .toBe(true);
    await page.goto("/recherche?query=velo&utm_source=qa&utm_campaign=journey");

    const runtime = await page.evaluate(() => {
      const raw = localStorage.getItem("shongre_cookie_consent_v1");
      return {
        environment: window.__SHONGRE_RUNTIME_CONFIG__?.appEnvironment,
        analyticsMode: window.__SHONGRE_RUNTIME_CONFIG__?.analytics.mode,
        analyticsConsent: raw
          ? Boolean(JSON.parse(raw).categories?.analytics)
          : false,
        probeInstalled: Array.isArray(
          (
            window as typeof window & {
              __shongreAnalyticsEvents?: AnalyticsEventEnvelope[];
            }
          ).__shongreAnalyticsEvents,
        ),
      };
    });
    expect(runtime).toEqual({
      environment: "test",
      analyticsMode: "test",
      analyticsConsent: true,
      probeInstalled: true,
    });

    await expect
      .poll(async () => (await capturedEvents(page)).map(({ name }) => name))
      .toEqual(
        expect.arrayContaining([
          "session_started",
          "page_viewed",
          "search_started",
          "search_performed",
        ]),
      );

    const searchEvents = await capturedEvents(page);
    const searchEventNames = searchEvents.map(({ name }) => name);
    expect(
      searchEventNames.filter((name) => name === "page_viewed"),
    ).toHaveLength(1);
    expect(
      searchEventNames.filter((name) => name === "search_started"),
    ).toHaveLength(1);
    expect(
      searchEventNames.filter((name) => name === "search_performed"),
    ).toHaveLength(1);
    const search = searchEvents.find(({ name }) => name === "search_performed");
    expect(search?.context).toMatchObject({
      platform: "web",
      marketCode: "FR",
      countryCode: "FR",
      source: "qa",
      campaign: "journey",
      isTestTraffic: true,
    });
    expect(search?.properties).not.toHaveProperty("email");
    expect(search?.properties).not.toHaveProperty("message");

    await page.goto(`/annonce/${DEMO_LISTING_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect
      .poll(async () => (await capturedEvents(page)).map(({ name }) => name))
      .toContain("listing_viewed");
  });

  test("shows acquisition intelligence to an authorized administrator", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Analytics, SEO & observabilité" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Acquisition" }).click();

    const channels = page.getByRole("region", {
      name: "Acquisition par canal",
    });
    await expect(channels).toBeVisible();
    await expect(channels.getByText("google / organic")).toBeVisible();

    await page.getByRole("tab", { name: "Monétisation" }).click();
    for (const metric of ["MRR", "ARR", "Attrition abonnements"]) {
      await expect(page.getByText(metric, { exact: true })).toBeVisible();
    }

    await page.getByRole("tab", { name: "Santé technique" }).click();
    for (const provider of [
      "internal",
      "posthog",
      "ga4",
      "matomo",
      "cloudflare",
      "search console",
      "sentry",
    ]) {
      await expect(
        page.getByRole("heading", { name: provider, exact: true }),
      ).toBeVisible();
    }
  });

  test("keeps platform analytics inaccessible to a buyer", async ({ page }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL("/compte");
    await expect(
      page.getByRole("heading", { name: "Analytics, SEO & observabilité" }),
    ).toHaveCount(0);
  });
});
