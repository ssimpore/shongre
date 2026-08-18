import { Page } from '@playwright/test';

/**
 * Demo personas, addressed the way the app itself stores them.
 *
 * `storageService` reads `shongre_current_user_key_v1` on boot, so seeding
 * localStorage before the first paint is equivalent to picking the persona in
 * the demo switcher — without driving the UI for it in every test.
 */
export const PERSONAS = {
  guest: { key: 'guest', role: 'guest' },
  individual_buyer: { key: 'buyer_thomas', role: 'individual_buyer' },
  individual_seller: { key: 'seller_camille', role: 'individual_seller' },
  pro_seller: { key: 'pro_atelier', role: 'pro_seller' },
  moderator: { key: 'moderator_claire', role: 'moderator' },
  support: { key: 'support_hugo', role: 'support' },
  finance: { key: 'finance_marc', role: 'finance' },
  admin: { key: 'admin_antoine', role: 'admin' },
} as const;

export type PersonaName = keyof typeof PERSONAS;

/** Seeds the persona before any app code runs, for every navigation on `page`. */
export async function usePersona(page: Page, persona: PersonaName): Promise<void> {
  const { key, role } = PERSONAS[persona];
  await page.addInitScript(
    ([userKey, userRole]) => {
      window.localStorage.setItem('shongre_current_user_key_v1', JSON.stringify(userKey));
      window.localStorage.setItem('shongre_current_role_v1', JSON.stringify(userRole));
    },
    [key, role],
  );
}
