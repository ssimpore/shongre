import { expect, test } from "@playwright/test";
import { waitForStableLayout } from "./overflow";
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
    { waitUntil: "domcontentloaded" },
  );
  await waitForStableLayout(page);

  await page.locator('button[aria-controls="demo-persona-menu"]').click();
  const menu = page.getByRole("menu", {
    name: /Changer de profil utilisateur/i,
  });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitemradio")).toHaveCount(17);
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitemradio").last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(menu.getByRole("menuitemradio").first()).toBeFocused();

  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(546);
  expect(box!.y + box!.height).toBeLessThanOrEqual(701);

  await menu.getByRole("menuitemradio", { name: /8\. Pro Emploi/ }).click();
  await expect(page).toHaveURL(/\/compte\/emploi\/recruteur$/);
  await expect(page.getByRole("heading", { name: "TechNova" })).toBeVisible();
});

test("the course organization exposes truthful plan-backed team availability", async ({
  page,
}) => {
  await usePersona(page, "pro_courses");
  await seedConsent(page);
  await page.goto("/compte/education/organisation", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "Collège Lumière" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Organisme Éducation" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Espace Immo" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Espace Auto" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Espace recruteur/i }),
  ).toHaveCount(0);

  const inviteButton = page.getByRole("button", {
    name: "Invitations indisponibles",
  });
  await expect(inviteButton).toBeDisabled();
  await expect(
    page.getByText(/Consultation uniquement.*invitations restent suspendues/i),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
