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
  moderator: {
    index: 4,
    key: 'moderator_claire',
    role: 'moderator',
    label: '5. Modérateur Shongre',
  },
  admin: {
    index: 5,
    key: 'admin_antoine',
    role: 'admin',
    label: '6. Administrateur Système',
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

test('switches all six demo personas as real account sessions', async ({ page }) => {
  test.setTimeout(90_000);
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

  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    page.locator('button[aria-controls="demo-persona-menu"]'),
  ).toContainText(PERSONA_STORAGE.pro.label);

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
