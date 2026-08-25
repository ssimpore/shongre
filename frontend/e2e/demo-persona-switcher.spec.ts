import { expect, test, type Page } from "@playwright/test";
import { waitForStableLayout } from "./overflow";

const VEHICLE_DETAIL_URL =
  "/auto/vehicule/peugeot-3008-bluehdi-130-allure-2019";

const PERSONA_STORAGE = {
  guest: {
    key: "guest",
    role: "guest",
    label: "1. Visiteur non connecté",
  },
  buyer: {
    key: "buyer_thomas",
    role: "buyer",
    label: "2. Acheteur Particulier",
  },
  seller: {
    key: "seller_camille",
    role: "seller",
    label: "3. Vendeur Particulier",
  },
  pro: {
    key: "pro_atelier",
    role: "pro_seller",
    label: "4. Vendeur Pro",
  },
  immo: {
    key: "pro_immo_clara",
    role: "pro_seller",
    label: "5. Pro Immobilier",
  },
  auto: {
    key: "pro_auto_michel",
    role: "pro_seller",
    label: "6. Pro Automobile",
  },
  courses: {
    key: "pro_courses_sophie",
    role: "pro_seller",
    label: "7. Pro Éducation",
  },
  employment: {
    key: "pro_employment_clara",
    role: "pro_seller",
    label: "8. Pro Emploi",
  },
  support: {
    key: "support_hugo",
    role: "support",
    label: "9. Support Shongre",
    staffPath: "/admin/support",
  },
  moderator: {
    key: "moderator_claire",
    role: "moderator",
    label: "10. Modérateur Shongre",
    staffPath: "/admin/moderation",
  },
  trustSafety: {
    key: "trust_nadia",
    role: "operations",
    label: "11. Trust & Safety",
    staffPath: "/admin/verifications",
  },
  compliance: {
    key: "compliance_samia",
    role: "operations",
    label: "12. Conformité",
    staffPath: "/admin/verifications",
  },
  finance: {
    key: "finance_marc",
    role: "finance",
    label: "13. Finance Shongre",
    staffPath: "/admin/finance",
  },
  operations: {
    key: "ops_elena",
    role: "operations",
    label: "14. Opérations Shongre",
    staffPath: "/admin/fournisseurs",
  },
  commercial: {
    key: "commercial_lea",
    role: "commercial",
    label: "15. Commercial Shongre",
    staffPath: "/admin/crm",
  },
  admin: {
    key: "admin_antoine",
    role: "admin",
    label: "16. Administrateur Système",
    staffPath: "/admin",
  },
  superAdmin: {
    key: "super_admin_alex",
    role: "super_admin",
    label: "17. Propriétaire Gouvernance",
    staffPath: "/admin/roles",
  },
} as const;

type Persona = (typeof PERSONA_STORAGE)[keyof typeof PERSONA_STORAGE];

async function selectPersona(page: Page, persona: Persona): Promise<void> {
  const toggle = page.locator('button[aria-controls="demo-persona-menu"]');
  await toggle.click();

  const menu = page.getByRole("menu", {
    name: /Changer de profil utilisateur/i,
  });
  await expect(menu).toBeVisible();
  const option = menu
    .getByRole("menuitemradio")
    .filter({ hasText: persona.label });
  await expect(option).toHaveCount(1);
  await option.click();

  await expect(menu).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        key: JSON.parse(
          window.localStorage.getItem("shongre_current_user_key_v1") || "null",
        ),
        role: JSON.parse(
          window.localStorage.getItem("shongre_current_role_v1") || "null",
        ),
      })),
    )
    .toEqual({ key: persona.key, role: persona.role });

  if ("staffPath" in persona) {
    await expect(page).toHaveURL((url) => url.pathname === persona.staffPath);
    await expect(toggle).toHaveCount(0);
  } else {
    await expect(toggle).toContainText(persona.label);
  }
}

test("switches all 17 demo personas as real account sessions @serial", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto(VEHICLE_DETAIL_URL, { waitUntil: "domcontentloaded" });
  // Use the control itself rather than re-seeding localStorage after every
  // navigation, so persistence and role-directed destinations are exercised.
  await selectPersona(page, PERSONA_STORAGE.guest);
  await expect(
    page.getByRole("link", { name: "Se connecter", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('button[aria-label^="Menu du compte"]'),
  ).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
  await expect(
    page.locator('button[aria-controls="demo-persona-menu"]'),
  ).toContainText(PERSONA_STORAGE.guest.label);

  await selectPersona(page, PERSONA_STORAGE.buyer);
  await expect(
    page.locator('button[aria-label^="Menu du compte"]'),
  ).toContainText("Thomas");

  await selectPersona(page, PERSONA_STORAGE.seller);
  await expect(
    page.locator('button[aria-label^="Menu du compte"]'),
  ).toContainText("Camille");

  await selectPersona(page, PERSONA_STORAGE.pro);
  await expect(
    page.locator('button[aria-label^="Menu du compte"]'),
  ).toContainText("Atelier");

  await selectPersona(page, PERSONA_STORAGE.immo);
  await expect(
    page.getByRole("heading", { name: "Agence Canopée" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/compte\/immo$/);

  await selectPersona(page, PERSONA_STORAGE.auto);
  await expect(
    page.getByRole("heading", { name: "Espace Auto" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/compte\/auto$/);

  await selectPersona(page, PERSONA_STORAGE.courses);
  await expect(
    page.getByRole("heading", { name: "Collège Lumière" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/compte\/education\/organisation$/);

  await selectPersona(page, PERSONA_STORAGE.employment);
  await expect(page.getByRole("heading", { name: "TechNova" })).toBeVisible();
  await expect(page).toHaveURL(/\/compte\/emploi\/recruteur$/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
  await expect(
    page.locator('button[aria-controls="demo-persona-menu"]'),
  ).toContainText(PERSONA_STORAGE.employment.label);

  for (const persona of [
    PERSONA_STORAGE.support,
    PERSONA_STORAGE.moderator,
    PERSONA_STORAGE.trustSafety,
    PERSONA_STORAGE.compliance,
    PERSONA_STORAGE.finance,
    PERSONA_STORAGE.operations,
    PERSONA_STORAGE.commercial,
    PERSONA_STORAGE.admin,
    PERSONA_STORAGE.superAdmin,
  ]) {
    await selectPersona(page, persona);
    await page
      .getByRole("link", { name: "Retour à la place de marché" })
      .click();
    await expect(page).toHaveURL((url) => url.pathname === "/");
  }

  await selectPersona(page, PERSONA_STORAGE.buyer);
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL((url) => url.pathname === "/compte");
  await expect(
    page.getByRole("heading", { name: /Bonjour, Antoine Fabre/ }),
  ).toHaveCount(0);
});
