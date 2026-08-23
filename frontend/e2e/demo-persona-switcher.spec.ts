import { expect, test, type Page } from '@playwright/test';

const VEHICLE_DETAIL_URL =
  '/auto/vehicule/peugeot-3008-bluehdi-130-allure-2019';

const PERSONA_STORAGE = {
  guest: { index: 0, key: 'guest', role: 'guest', label: '1. Visiteur non connecté' },
  buyer: {
    index: 1,
    key: 'buyer_thomas',
    role: 'buyer',
    label: '2. Acheteur Particulier',
  },
  seller: {
    index: 2,
    key: 'seller_camille',
    role: 'seller',
    label: '3. Vendeur Particulier',
  },
  pro: {
    index: 3,
    key: 'pro_atelier',
    role: 'pro_seller',
    label: '4. Vendeur Pro',
  },
  immo: {
    index: 4,
    key: 'pro_immo_clara',
    role: 'pro_seller',
    label: '5. Pro Immobilier',
  },
  auto: {
    index: 5,
    key: 'pro_auto_michel',
    role: 'pro_seller',
    label: '6. Pro Automobile',
  },
  courses: {
    index: 6,
    key: 'pro_courses_sophie',
    role: 'pro_seller',
    label: '7. Pro Cours',
  },
  employment: {
    index: 7,
    key: 'pro_employment_clara',
    role: 'pro_seller',
    label: '8. Pro Emploi',
  },
  moderator: {
    index: 8,
    key: 'moderator_claire',
    role: 'moderator',
    label: '9. Modérateur Shongre',
  },
  admin: {
    index: 9,
    key: 'admin_antoine',
    role: 'admin',
    label: '10. Administrateur Système',
  },
} as const;

type Persona = (typeof PERSONA_STORAGE)[keyof typeof PERSONA_STORAGE];

async function selectPersona(page: Page, persona: Persona): Promise<void> {
  const toggle = page.locator('button[aria-controls="demo-persona-menu"]');
  await toggle.click();

  const menu = page.getByRole('menu', { name: /Changer de profil utilisateur/i });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitemradio').nth(persona.index).click();

  await expect(toggle).toContainText(persona.label);
  await expect(menu).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        key: JSON.parse(
          window.localStorage.getItem('shongre_current_user_key_v1') || 'null',
        ),
        role: JSON.parse(
          window.localStorage.getItem('shongre_current_role_v1') || 'null',
        ),
      })),
    )
    .toEqual({ key: persona.key, role: persona.role });
}

test('switches all ten demo personas as real account sessions', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(VEHICLE_DETAIL_URL, { waitUntil: 'networkidle' });
  // Enter the requested starting state through the control itself. Unlike the
  // general `usePersona` test helper, this does not re-seed localStorage after
  // every reload, so the persistence assertions exercise the actual session.
  await selectPersona(page, PERSONA_STORAGE.admin);

  await selectPersona(page, PERSONA_STORAGE.guest);
  await expect(page.getByRole('link', { name: 'Se connecter', exact: true })).toBeVisible();
  await expect(page.locator('button[aria-label^="Menu du compte"]')).toHaveCount(0);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    page.locator('button[aria-controls="demo-persona-menu"]'),
  ).toContainText(PERSONA_STORAGE.guest.label);

  await selectPersona(page, PERSONA_STORAGE.buyer);
  await expect(page.locator('button[aria-label^="Menu du compte"]')).toContainText(
    'Thomas',
  );

  await selectPersona(page, PERSONA_STORAGE.seller);
  await expect(page.locator('button[aria-label^="Menu du compte"]')).toContainText(
    'Camille',
  );

  await selectPersona(page, PERSONA_STORAGE.pro);
  await expect(page.locator('button[aria-label^="Menu du compte"]')).toContainText(
    'Atelier',
  );

  await selectPersona(page, PERSONA_STORAGE.immo);
  await expect(page.getByRole('heading', { name: 'Agence Canopée' })).toBeVisible();
  await expect(page).toHaveURL(/\/compte\/immo$/);

  await selectPersona(page, PERSONA_STORAGE.auto);
  await expect(page.getByRole('heading', { name: 'Espace Auto' })).toBeVisible();
  await expect(page).toHaveURL(/\/compte\/auto$/);

  await selectPersona(page, PERSONA_STORAGE.courses);
  await expect(page.getByRole('heading', { name: 'Collège Lumière' })).toBeVisible();
  await expect(page).toHaveURL(/\/compte\/cours\/organisation$/);

  await selectPersona(page, PERSONA_STORAGE.employment);
  await expect(page.getByRole('heading', { name: 'TechNova' })).toBeVisible();
  await expect(page).toHaveURL(/\/compte\/emploi\/recruteur$/);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    page.locator('button[aria-controls="demo-persona-menu"]'),
  ).toContainText(PERSONA_STORAGE.employment.label);

  await selectPersona(page, PERSONA_STORAGE.moderator);
  await expect(page.locator('button[aria-label^="Menu du compte"]')).toContainText(
    'Claire',
  );

  await selectPersona(page, PERSONA_STORAGE.admin);
  await expect(page.locator('button[aria-label^="Menu du compte"]')).toContainText(
    'Antoine',
  );

  await page.goto('/admin', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: /Bonjour, Antoine Fabre/ }),
  ).toBeVisible();

  await page.goto(VEHICLE_DETAIL_URL, { waitUntil: 'networkidle' });
  await selectPersona(page, PERSONA_STORAGE.buyer);
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: 'Espace réservé aux équipes Shongre' }),
  ).toBeVisible();
});
