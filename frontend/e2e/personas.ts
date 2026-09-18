import { mkdirSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { browserApi } from "./browser-api";
import { readBrowserFixtures } from "./fixtures";

/** References to the backend-owned scenario, never client-selected authority. */
const PERSONAS = {
  guest: null,
  individual_buyer: "user_thomas",
  individual_seller: "user_camille",
  pro_seller: "user_pro_atelier",
  standalone_prospects: "user_standalone_trial_owner",
  standalone_facturation: "user_standalone_facturation_owner",
  pro_immo: "user_immo_clara",
  pro_auto: "user_dealer_owner",
  pro_courses: "user_tutor_sophie",
  pro_employment: "user_employment_clara",
  moderator: "user_mod_claire",
  trust_safety: "user_trust_nadia",
  compliance: "user_compliance_samia",
  support: "user_support_hugo",
  operations: "user_ops_elena",
  finance: "user_finance_marc",
  commercial: "user_commercial_lea",
  admin: "user_admin_antoine",
  super_admin: "user_super_admin_alex",
} as const;

export type PersonaName = keyof typeof PERSONAS;

/** Explicit refusal for tests which do not exercise first-visit consent. */
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

function claimRecoveryCode(file: string, id: string, codes: string[]): string {
  // Atomic claims survive worker restarts and prevent cross-worker reuse.
  // The runner removes these private directories with its API fixture.
  for (const [index, code] of codes.entries()) {
    try {
      mkdirSync(`${file}.${id}.${index}`, { mode: 0o700 });
      return code;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("The isolated Staff MFA recovery fixture is exhausted.");
}

/**
 * Authenticate through first-party HTTP cookies, including real Staff MFA.
 *
 * Sessions are host-only cookies, so a product served from its own origin
 * (Facturation in the isolated runner, as in production) must be signed into
 * on that origin: pass it as `origin`.
 */
export async function usePersona(
  page: Page,
  persona: PersonaName,
  options: { origin?: string } = {},
): Promise<void> {
  await page
    .context()
    .clearCookies({ name: /^shongre_(access|refresh|csrf)$/ });
  const id = PERSONAS[persona];
  if (!id) return;
  const file = process.env.E2E_ACCOUNTS_FILE;
  const origin = options.origin || process.env.E2E_BASE_URL;
  if (
    process.env.APP_ENV !== "test" ||
    !file ||
    !origin ||
    !process.env.DEMO_ACCOUNT_PASSWORD
  ) {
    throw new Error(
      "Personas require the isolated API runner: make frontend-test-e2e.",
    );
  }
  const { accounts } = readBrowserFixtures();
  const account = accounts[id];
  if (!account) throw new Error(`Missing backend test account for ${persona}.`);
  await page.goto(new URL("/healthz", origin).href, { waitUntil: "load" });
  const login = await browserApi(page, "/auth/login", {
    method: "POST",
    body: { email: account.email, password: process.env.DEMO_ACCOUNT_PASSWORD },
  });
  expect(login.status, `API login for ${persona}`).toBe(200);
  if (login.body.requiresMfa) {
    const challenge = await browserApi(page, "/auth/mfa/challenge", {
      method: "POST",
      body: {
        tempMfaToken: login.body.tempMfaToken,
        code: claimRecoveryCode(file, id, account.recoveryCodes),
      },
    });
    expect(challenge.status, `MFA challenge for ${persona}`).toBe(200);
  }
  const session = await browserApi(page, "/auth/me");
  expect(session.status).toBe(200);
  // The scenario owns the identity: a fixture key in demo mode, the seeded
  // profile UUID in database mode.
  expect(session.body.id, `Verified API identity for ${persona}`).toBe(
    account.id,
  );
}
