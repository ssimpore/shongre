import { expect, test } from "@playwright/test";
import { PUBLICATION_CONSTRAINTS } from "@shongre/contracts/publication";
import { browserApi } from "./browser-api";
import { useEstablishedConsent, usePersona } from "./personas";

// Each viewport edits the same isolated backend-owned seller's draft.
test.describe.configure({ mode: "serial" });

for (const width of [1408, 390]) {
  test(`product onboarding preserves old titles and limits new input at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    let draftReads = 0;
    page.on("request", (request) => {
      if (
        request.method() === "GET" &&
        new URL(request.url()).pathname === "/api/v1/listing-drafts/current"
      )
        draftReads += 1;
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize({ width, height: 900 });
    await useEstablishedConsent(page);
    await usePersona(page, "individual_seller");
    const max = PUBLICATION_CONSTRAINTS.title.maxLength;
    const limitError = `Raccourcissez le titre à ${max} caractères maximum avant de continuer.`;
    const legacyTitle =
      "Téléphone avec accessoires et boîte d’origine — très bon état";
    expect(legacyTitle.length).toBeGreaterThan(max);
    const saved = await browserApi(page, "/listing-drafts/current", {
      method: "PUT",
      body: {
        marketCode: "FR",
        selectedMarkets: ["FR"],
        taxonomyNodeId: "electronics.smartphones.phones",
        listingTypeId: "electronics.smartphones.phones.listing",
        taxonomyVersion: "4.0.0",
        taxonomyPath: [],
        listingIntent: "SELL",
        title: legacyTitle,
        description:
          "Téléphone en bon état, fourni avec sa boîte et ses accessoires.",
        condition: "good",
        attributes: { condition: "good" },
        photos: [],
        pricing: {
          priceModel: "fixed",
          amount: 120,
          currency: "EUR",
          isNegotiable: false,
          isFreeDonation: false,
        },
        fulfillment: { allowHandDelivery: true, allowParcelShipping: false },
        fulfillmentTypes: ["PHYSICAL"],
        proInventory: { stock: 1 },
        location: {
          city: "Lyon",
          postalCode: "69002",
          countryCode: "FR",
          hideExactAddress: true,
        },
        currentStep: 1,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(saved.status).toBe(200);
    await page.goto("/deposer");
    await expect(page).toHaveURL(/\/deposer$/);
    await expect(page).toHaveTitle(/Shongre/i);
    await page.getByRole("button", { name: /reprendre/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const titleStep = page.getByRole("button", { name: /^2 Votre annonce/ });
    await expect(titleStep).toBeEnabled({ timeout: 30_000 });
    await titleStep.click();
    const title = page.getByRole("textbox", { name: /Titre de l['’]annonce/ });
    await expect(title).toHaveValue(legacyTitle);
    await expect(title).toHaveAttribute("maxlength", String(max));
    await expect(title).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(limitError, { exact: true })).toBeVisible();
    const readsBeforeValidation = draftReads;
    await page.getByRole("button", { name: /^Continuer/ }).click();
    await expect(title).toBeVisible();

    const compactTitle = "Téléphone Sony Xperia avec boîte et accessoires";
    const boundaryTitle = compactTitle.padEnd(max, "!");
    await title.fill(`${boundaryTitle}extra`);
    await expect(title).toHaveValue(boundaryTitle);
    await expect(title).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(limitError, { exact: true })).toBeHidden();
    expect(draftReads).toBe(readsBeforeValidation);
    await expect(
      page.getByText(new RegExp(`${max}/${max} caractères`)),
    ).toBeVisible();
    await title.press("End");
    await title.pressSequentially("X");
    await expect(title).toHaveValue(boundaryTitle);
    await title.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`title-${width}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: /^Continuer/ }).click();
    await expect(page.getByText("Étape 3 / 3", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
