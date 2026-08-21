export type MobileDataMode = "demo" | "api";

function resolveDataMode(): MobileDataMode {
  const value = process.env.EXPO_PUBLIC_DATA_MODE || "demo";
  if (value !== "demo" && value !== "api") {
    throw new Error(`[Mobile Config] Invalid EXPO_PUBLIC_DATA_MODE=${value}.`);
  }
  return value;
}

const dataMode = resolveDataMode();
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
const webUrl = (process.env.EXPO_PUBLIC_WEB_URL || "").replace(/\/$/, "");

if (dataMode === "api" && !apiUrl) {
  throw new Error(
    "[Mobile Config] EXPO_PUBLIC_API_URL is required in api mode.",
  );
}
if (!webUrl) {
  throw new Error("[Mobile Config] EXPO_PUBLIC_WEB_URL is required.");
}

export const mobileEnvironment = Object.freeze({
  dataMode,
  apiUrl,
  webUrl,
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || `${webUrl}/privacy`,
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || `${webUrl}/terms`,
  supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL || `${webUrl}/support`,
  accountDeletionUrl:
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL || `${webUrl}/account/delete`,
});
