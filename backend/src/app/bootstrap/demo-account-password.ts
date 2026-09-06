/**
 * Shared credential for synthetic demo personas. Managed environments can
 * override it; production never provisions these known-password accounts.
 */
export const DEMO_ACCOUNT_PASSWORD =
  process.env.DEMO_ACCOUNT_PASSWORD || "ShongreDemo2024!";
