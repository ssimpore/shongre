import { expect, test } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";

test("the course organization exposes truthful plan-backed team availability", async ({
  page,
}) => {
  await usePersona(page, "pro_courses");
  await useEstablishedConsent(page);
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
    name: "Inviter un membre",
  });
  await expect(inviteButton).toBeEnabled();
  await inviteButton.click();
  const invitation = page.getByRole("dialog", { name: "Inviter un membre" });
  await expect(invitation).toBeVisible();
  await expect(
    invitation.getByRole("combobox", { name: "Rôle du membre" }),
  ).toBeVisible();
  await invitation.getByRole("button", { name: "Annuler" }).click();
  await expect(invitation).toHaveCount(0);
});
