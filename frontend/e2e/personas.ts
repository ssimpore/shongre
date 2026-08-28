import { Page } from "@playwright/test";

/**
 * Demo personas, addressed the way the app itself stores them.
 *
 * `storageService` reads `shongre_current_user_key_v1` on boot, so seeding
 * localStorage before the first paint is equivalent to picking the persona in
 * the demo switcher — without driving the UI for it in every test.
 */
export const PERSONAS = {
  guest: { key: "guest", role: "guest" },
  individual_buyer: { key: "buyer_thomas", role: "individual_buyer" },
  individual_seller: { key: "seller_camille", role: "individual_seller" },
  pro_seller: { key: "pro_atelier", role: "pro_seller" },
  standalone_prospects: { key: "standalone_trial_owner", role: "pro_seller" },
  standalone_facturation: {
    key: "standalone_facturation_owner",
    role: "pro_seller",
  },
  pro_immo: { key: "pro_immo_clara", role: "pro_seller" },
  pro_auto: { key: "pro_auto_michel", role: "pro_seller" },
  pro_courses: { key: "pro_courses_sophie", role: "pro_seller" },
  pro_employment: { key: "pro_employment_clara", role: "pro_seller" },
  moderator: { key: "moderator_claire", role: "moderator" },
  trust_safety: { key: "trust_nadia", role: "operations" },
  support: { key: "support_hugo", role: "support" },
  finance: { key: "finance_marc", role: "finance" },
  commercial: { key: "commercial_lea", role: "commercial" },
  admin: { key: "admin_antoine", role: "admin" },
} as const;

export type PersonaName = keyof typeof PERSONAS;

/**
 * Seeds an explicit refusal so a test aimed at another application surface is
 * not actually testing through the pinned first-visit consent region. Consent
 * itself has a dedicated suite which deliberately omits this helper.
 */
export async function useEstablishedConsent(page: Page): Promise<void> {
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
}

/** Seeds the persona before any app code runs, for every navigation on `page`. */
export async function usePersona(
  page: Page,
  persona: PersonaName,
): Promise<void> {
  const { key, role } = PERSONAS[persona];
  await page.addInitScript(
    ([userKey, userRole]) => {
      window.localStorage.setItem(
        "shongre_current_user_key_v1",
        JSON.stringify(userKey),
      );
      window.localStorage.setItem(
        "shongre_current_role_v1",
        JSON.stringify(userRole),
      );
    },
    [key, role],
  );
}
