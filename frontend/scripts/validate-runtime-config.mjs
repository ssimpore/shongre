const environments = new Set([
  "local",
  "test",
  "preview",
  "development",
  "staging",
  "production",
]);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`[Web Startup] ${name} is required.`);
  return value;
}

function origin(name) {
  const value = required(name);
  const url = new URL(value);
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error(`[Web Startup] ${name} must use HTTP or HTTPS.`);
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(`[Web Startup] ${name} must be a credential-free origin.`);
  }
  return url;
}

const environment = required("APP_ENV");
if (!environments.has(environment)) {
  throw new Error(`[Web Startup] Unsupported APP_ENV=${environment}.`);
}
const environmentId = required("ENVIRONMENT_ID");
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(environmentId)) {
  throw new Error(
    "[Web Startup] ENVIRONMENT_ID must use lowercase kebab-case.",
  );
}
const urls = [
  origin("PUBLIC_FR_URL"),
  origin("PUBLIC_INTL_URL"),
  origin("API_URL"),
];
if (
  !new Set(["local", "test"]).has(environment) &&
  urls.some((url) => url.protocol !== "https:")
) {
  throw new Error(`[Web Startup] ${environment} URLs must use HTTPS.`);
}

const dataMode = process.env.NEXT_PUBLIC_DATA_MODE || "demo";
if (!new Set(["demo", "api"]).has(dataMode)) {
  throw new Error("[Web Startup] NEXT_PUBLIC_DATA_MODE must be demo or api.");
}
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
if (environment !== "production" && stripeKey.startsWith("pk_live_")) {
  throw new Error(
    "[Web Startup] A live Stripe key is forbidden outside production.",
  );
}
if (environment === "production") {
  if (dataMode !== "api")
    throw new Error(
      "[Web Startup] Production requires NEXT_PUBLIC_DATA_MODE=api.",
    );
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_STORAGE !== "false") {
    throw new Error(
      "[Web Startup] Production requires NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false.",
    );
  }
  if (!/^pk_live_[A-Za-z0-9]+$/.test(stripeKey)) {
    throw new Error(
      "[Web Startup] Production requires a live Stripe publishable key.",
    );
  }
}

console.log(
  `[Web Startup] validated ${environment} (${environmentId}) runtime configuration.`,
);
