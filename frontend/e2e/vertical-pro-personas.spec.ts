import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";

const seedConsent = async (page: Parameters<typeof usePersona>[0]) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "shongre_cookie_consent_v1",
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        categories: { necessary: true, analytics: false, marketing: false },
      }),
    );
  });
};

test("the demo persona menu remains operable at the commented mobile viewport", async ({
  page,
}) => {
  await seedConsent(page);
  await page.setViewportSize({ width: 546, height: 701 });
  await page.goto(
    "/emploi/offre/conseiller-ere-de-vente-en-alternance-job-sales-apprentice-lille/postuler",
    { waitUntil: "networkidle" },
  );

  await page.locator('button[aria-controls="demo-persona-menu"]').click();
  const menu = page.getByRole("menu", {
    name: /Changer de profil utilisateur/i,
  });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitemradio")).toHaveCount(10);
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitemradio").last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(menu.getByRole("menuitemradio").first()).toBeFocused();

  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(546);
  expect(box!.y + box!.height).toBeLessThanOrEqual(701);

  await menu
    .getByRole("menuitemradio", { name: /8\. Pro Emploi/ })
    .click();
  await expect(page).toHaveURL(/\/compte\/emploi\/recruteur$/);
  await expect(page.getByRole("heading", { name: "TechNova" })).toBeVisible();
});

test("the course organization persona can use its plan-backed team service", async ({
  page,
}) => {
  await usePersona(page, "pro_courses");
  await seedConsent(page);
  await page.goto("/compte/cours/organisation", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Collège Lumière" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Organisme Cours" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Espace Immo" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Espace Auto" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Espace recruteur/i })).toHaveCount(0);

  await page.getByRole("button", { name: "Inviter un membre" }).click();
  await page.getByLabel("Nom du membre").fill("Amina Robert");
  await page.getByLabel("Rôle du membre").selectOption("lead_coordinator");
  await page.getByRole("button", { name: "Envoyer l’invitation" }).click();
  await expect(page.getByText("Amina Robert")).toBeVisible();
  await expect(page.getByText("Invité", { exact: true })).toBeVisible();
});
