import { expect as baseExpect, test } from "@playwright/test";
import { testListingId, testListingPath } from "./fixtures";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow } from "./overflow";

const expect = baseExpect.configure({ timeout: 30_000 });
test.setTimeout(90_000);

for (const width of [1408, 390]) {
  test(`listing characteristics render the API projection at ${width}px`, async ({
    page,
  }, testInfo) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const publicationRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/taxonomy/v1/resolve"))
        publicationRequests.push(request.url());
    });
    const responsePromise = page.waitForResponse((response) =>
      response
        .url()
        .includes(`/listings/${testListingId("list-105")}/characteristics`),
    );
    await page.goto(testListingPath("list-105"));
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.groups.length).toBeGreaterThan(0);
    await expect(page).toHaveTitle(/Shongre/i);
    const panel = page.locator("[data-listing-characteristics]");
    await panel.scrollIntoViewIfNeeded();
    const disclosure = panel.locator("[data-detail-disclosure]");
    for (const button of await disclosure.all()) await button.click();
    for (const group of data.groups) {
      for (const item of group.items) {
        const row = panel.locator(
          `[data-detail-${item.presentation === "feature" ? "feature" : "fact"}="${item.code}"]`,
        );
        await expect(row).toContainText(item.label);
        if (item.presentation !== "feature")
          await expect(row.locator("dd")).toHaveText(item.value);
        await expect(row.locator("[data-fact-icon]")).toHaveAttribute(
          "data-fact-icon",
          item.icon,
        );
      }
    }
    await expect(
      page.getByText(
        "Les caractéristiques ne sont pas disponibles pour le moment.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expectNoHorizontalOverflow(page, `characteristics ${width}`);
    await panel.screenshot({
      path: testInfo.outputPath(`characteristics-${width}.png`),
      scale: "css",
    });
    expect(publicationRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("listing characteristics retry an API failure without replacing the listing", async ({
  page,
}) => {
  await useEstablishedConsent(page);
  let unavailable = true;
  await page.route("**/listings/*/characteristics?*", async (route) => {
    if (!unavailable) return route.continue();
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "SERVICE_UNAVAILABLE", message: "Temporary failure" },
      }),
    });
  });
  await page.goto(testListingPath("list-105"));
  const error = page
    .getByText("Les caractéristiques ne sont pas disponibles pour le moment.", {
      exact: true,
    })
    .locator("..");
  await expect(error).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  unavailable = false;
  await error.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.locator("[data-listing-characteristics]")).toBeVisible();
  await expect(error).toHaveCount(0);
});

for (const width of [1408, 390]) {
  test(`vehicle facts follow API icons and expand with the keyboard at ${width}px`, async ({
    page,
    request,
  }, testInfo) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 900 });
    const response = await request.get("/api/v1/auto/vehicles/vehicle_bmw_x3", {
      params: { marketCode: "FR" },
    });
    expect(response.ok()).toBe(true);
    const vehicle = await response.json();
    const fields = vehicle.taxonomy.detailCharacteristics;
    expect(fields.length).toBeGreaterThan(8);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/auto/vehicule/${vehicle.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      vehicle.title,
    );
    const panel = page.locator("[data-listing-characteristics]");
    const visibleFacts = panel.locator("[data-detail-fact]:visible");
    await expect(visibleFacts).toHaveCount(8);
    const button = panel.locator("[data-detail-disclosure]").first();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    for (const field of fields) {
      const row = panel.locator(`[data-detail-fact="${field.code}"]`);
      await expect(row).toBeVisible();
      await expect(row.locator("[data-fact-icon]")).toHaveAttribute(
        "data-fact-icon",
        field.icon,
      );
      await expect(row.locator("dd")).toHaveText(field.values["fr-FR"]);
    }
    await button.press("Enter");
    await expect(visibleFacts).toHaveCount(8);
    await expect(button).toBeFocused();
    await expectNoHorizontalOverflow(page, `vehicle facts ${width}`);
    await panel.screenshot({
      path: testInfo.outputPath(`vehicle-facts-${width}.png`),
    });
    expect(errors).toEqual([]);
  });
}
