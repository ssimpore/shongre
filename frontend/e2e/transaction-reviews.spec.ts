import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { testOrderId } from "./fixtures";
import { useEstablishedConsent, usePersona } from "./personas";
import { expectNoHorizontalOverflow } from "./overflow";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test("seller publishes one review, sees it after reload, and can report review UGC", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await usePersona(page, "pro_seller");
  await page.goto(`/compte/achats?transactionId=${testOrderId("tx-903")}`, {
    waitUntil: "domcontentloaded",
  });
  const form = page.getByRole("region", {
    name: "Votre avis sur cette transaction",
  });
  await expect(
    form.getByRole("combobox", { name: "Note", exact: true }),
  ).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Publier mon avis" }),
  ).toBeDisabled();
  await form
    .getByRole("combobox", { name: "Note", exact: true })
    .selectOption("4");
  await form
    .getByRole("textbox", { name: "Votre expérience", exact: true })
    .fill("Très bonne communication et rendez-vous respecté.");
  const accessibility = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(
    accessibility.violations.filter((item) =>
      ["critical", "serious"].includes(item.impact || ""),
    ),
  ).toEqual([]);
  await form.getByRole("button", { name: "Publier mon avis" }).click();
  await expect(form).toContainText("Votre avis est enregistré.");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(form).toContainText("Votre avis est enregistré.");
  await expect(
    form.getByRole("button", { name: "Publier mon avis" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `/tmp/shongre-transaction-review-${testInfo.project.name}.png`,
    fullPage: true,
  });

  await page.goto("/profil/camille-martin?tab=reviews", {
    waitUntil: "domcontentloaded",
  });
  const publishedReview = page
    .locator("[data-review-item]", {
      hasText: "Très bonne communication et rendez-vous respecté.",
    })
    .first();
  await expect(publishedReview).toBeVisible();
  await expect(
    publishedReview.getByText("Transaction vérifiée", { exact: true }),
  ).toBeVisible();
  // One's own review is not reportable UGC: the author sees no report
  // control, and the API refuses such a report anyway.
  await expect(
    publishedReview.getByRole("button", { name: "Signaler cet avis" }),
  ).toHaveCount(0);

  // Another member reads the same review and reports it.
  await usePersona(page, "individual_buyer");
  await page.goto("/profil/camille-martin?tab=reviews", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText("Très bonne communication et rendez-vous respecté."),
  ).toBeVisible();
  await page
    .locator("[data-review-item]", {
      hasText: "Très bonne communication et rendez-vous respecté.",
    })
    .first()
    .getByRole("button", { name: "Signaler cet avis" })
    .click();
  const report = page.getByRole("dialog", { name: "Signaler cet avis" });
  await expect(report).toBeVisible();
  await report
    .getByRole("radio", { name: "Comportement abusif, injures ou harcèlement" })
    .check();
  await report
    .getByRole("textbox")
    .fill("Ce commentaire nécessite un examen de modération.");
  await report.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(report).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("buyer sees their existing review on a narrow screen without a second form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await usePersona(page, "individual_seller");
  await page.goto(`/compte/achats?transactionId=${testOrderId("tx-903")}`, {
    waitUntil: "domcontentloaded",
  });
  const review = page.getByRole("region", {
    name: "Votre avis sur cette transaction",
  });
  await expect(review).toContainText("Votre avis est enregistré.");
  await expect(
    review.getByRole("button", { name: "Publier mon avis" }),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("incomplete orders offer no review form", async ({ page }) => {
  await usePersona(page, "individual_buyer");
  await page.goto(`/compte/achats?transactionId=${testOrderId("tx-904")}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("dialog", { name: /Commande SHG-771920/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Votre avis sur cette transaction" }),
  ).toHaveCount(0);
});
