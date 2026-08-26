#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const mobileRoot = join(root, "mobile");
const mode = process.argv[2] || "store";

const STATUS = {
  pass: "PASS",
  fail: "FAIL",
  warning: "WARNING",
  manual: "MANUAL REVIEW REQUIRED",
  na: "NOT APPLICABLE",
};

const results = [];
const performed = new Set();

function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line
          .slice(0, separator)
          .replace(/^export\s+/, "")
          .trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2");
        return [key, value];
      }),
  );
}

const env = {
  ...parseEnvFile(join(root, ".env")),
  ...parseEnvFile(join(root, ".env.local")),
  ...process.env,
};

function file(path) {
  return readFileSync(join(root, path), "utf8");
}

function declaresRoute(source, route) {
  return source.includes(`"${route}"`) || source.includes(`'${route}'`);
}

function add(name, status, detail) {
  results.push({ name, status, detail });
}

function once(name, check) {
  if (performed.has(name)) return;
  performed.add(name);
  check();
}

function command(executable, args) {
  try {
    return execFileSync(executable, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    return `${error.stdout || ""}${error.stderr || ""}`.trim();
  }
}

function walk(directory, files = []) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    if (["node_modules", ".expo", "build", "Pods"].includes(entry)) continue;
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

function checkProductionEnvironment() {
  once("production-env", () => {
    const names = ["API_URL", "PUBLIC_FR_URL", "PUBLIC_INTL_URL"];
    const forbidden =
      /localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|\.local(?::|\/|$)|trycloudflare|ngrok|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|10\.\d+\./i;
    const invalid = [];
    for (const name of names) {
      try {
        const value = env[name];
        const parsed = new URL(value);
        if (parsed.protocol !== "https:" || forbidden.test(value))
          invalid.push(name);
      } catch {
        invalid.push(name);
      }
    }
    add(
      "Production HTTPS endpoints",
      invalid.length ? STATUS.fail : STATUS.pass,
      invalid.length
        ? `Missing or development-only: ${invalid.join(", ")}`
        : "All configured release endpoints use stable HTTPS hosts.",
    );
    add(
      "Production endpoint availability",
      STATUS.manual,
      "Verify deployed pages and API health from outside the development network before submission.",
    );
  });
}

function checkIdentifiers() {
  once("identifiers", () => {
    const ios = env.IOS_BUNDLE_IDENTIFIER || "";
    const android = env.ANDROID_PACKAGE_NAME || "";
    const valid = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9_-]*){2,}$/;
    add(
      "iOS bundle identifier",
      valid.test(ios) ? STATUS.pass : STATUS.fail,
      ios || "Not configured",
    );
    add(
      "Android package name",
      valid.test(android) ? STATUS.pass : STATUS.fail,
      android || "Not configured",
    );
    add(
      "Identifier ownership",
      STATUS.manual,
      "Confirm both identifiers are registered in the Apple and Google developer accounts before the first release.",
    );
  });
}

function checkVersion() {
  once("version", () => {
    const semantic = /^\d+\.\d+\.\d+$/.test(env.APP_VERSION || "");
    const iosBuild =
      /^\d+$/.test(env.IOS_BUILD_NUMBER || "") &&
      Number(env.IOS_BUILD_NUMBER) > 0;
    const androidCode =
      /^\d+$/.test(env.ANDROID_VERSION_CODE || "") &&
      Number(env.ANDROID_VERSION_CODE) > 0;
    add(
      "Application version",
      semantic ? STATUS.pass : STATUS.fail,
      env.APP_VERSION || "Not configured",
    );
    add(
      "iOS build number",
      iosBuild ? STATUS.pass : STATUS.fail,
      env.IOS_BUILD_NUMBER || "Not configured",
    );
    add(
      "Android versionCode",
      androidCode ? STATUS.pass : STATUS.fail,
      env.ANDROID_VERSION_CODE || "Not configured",
    );
    add(
      "Store version monotonicity",
      STATUS.manual,
      "Compare buildNumber and versionCode with the latest uploaded builds in both store consoles.",
    );
  });
}

function checkIosSdk() {
  once("ios-sdk", () => {
    const xcode = command("xcodebuild", ["-version"]);
    const xcodeMajor = Number(xcode.match(/Xcode\s+(\d+)/)?.[1] || 0);
    const sdk = command("xcrun", ["--sdk", "iphoneos", "--show-sdk-version"]);
    const sdkMajor = Number(sdk.match(/^(\d+)/)?.[1] || 0);
    const propertiesPath = join(mobileRoot, "ios/Podfile.properties.json");
    const deployment = existsSync(propertiesPath)
      ? JSON.parse(readFileSync(propertiesPath, "utf8"))["ios.deploymentTarget"]
      : undefined;
    add(
      "Apple Xcode requirement",
      xcodeMajor >= 26 ? STATUS.pass : STATUS.fail,
      xcode || "Xcode not available; use a compatible EAS build image.",
    );
    add(
      "Apple iOS SDK requirement",
      sdkMajor >= 26 ? STATUS.pass : STATUS.fail,
      sdk || "iOS SDK not available locally.",
    );
    add(
      "iOS deployment target",
      Number.parseFloat(deployment) >= 16.4 ? STATUS.pass : STATUS.fail,
      deployment || "Generated native configuration missing.",
    );
  });
}

function checkAndroidSdk() {
  once("android-sdk", () => {
    const propertiesPath = join(mobileRoot, "android/gradle.properties");
    if (!existsSync(propertiesPath)) {
      add(
        "Android generated SDK configuration",
        STATUS.fail,
        "Run make mobile-prebuild-clean.",
      );
      return;
    }
    const properties = parseEnvFile(propertiesPath);
    const compileSdk = Number(properties["android.compileSdkVersion"]);
    const targetSdk = Number(properties["android.targetSdkVersion"]);
    const minSdk = Number(properties["android.minSdkVersion"]);
    const buildTools = properties["android.buildToolsVersion"];
    add(
      "Android compileSdk",
      compileSdk >= 36 ? STATUS.pass : STATUS.fail,
      String(compileSdk || "missing"),
    );
    add(
      "Google Play targetSdk",
      targetSdk >= 36 ? STATUS.pass : STATUS.fail,
      String(targetSdk || "missing"),
    );
    add(
      "Android minSdk",
      minSdk >= 24 ? STATUS.pass : STATUS.warning,
      String(minSdk || "missing"),
    );
    add(
      "Android build tools",
      buildTools?.startsWith("36.") ? STATUS.pass : STATUS.fail,
      buildTools || "missing",
    );
  });
}

function checkIosPrivacy() {
  once("ios-privacy", () => {
    const manifestPath = join(mobileRoot, "ios/Shongre/PrivacyInfo.xcprivacy");
    if (!existsSync(manifestPath)) {
      add(
        "Apple privacy manifest",
        STATUS.fail,
        "Generated PrivacyInfo.xcprivacy is missing.",
      );
      return;
    }
    const manifest = readFileSync(manifestPath, "utf8");
    const hasReason =
      manifest.includes("NSPrivacyAccessedAPICategoryUserDefaults") &&
      manifest.includes("CA92.1");
    const noTracking =
      manifest.includes("<key>NSPrivacyTracking</key>") &&
      manifest.includes("<false/>");
    add(
      "Apple privacy manifest",
      hasReason && noTracking ? STATUS.pass : STATUS.fail,
      "Generated manifest declares UserDefaults reason CA92.1 and tracking=false.",
    );
    add(
      "Required-reason API accuracy",
      STATUS.manual,
      "Re-audit the release archive and every embedded SDK; do not copy reasons that do not match behavior.",
    );
    add(
      "App Store privacy labels",
      STATUS.manual,
      "A human must reconcile App Store Connect answers with the maintained data inventory and production processors.",
    );
  });
}

function activeAndroidPermissions(manifest) {
  return [
    ...manifest.matchAll(
      /<uses-permission\s+android:name="([^"]+)"([^>]*)\/>/g,
    ),
  ]
    .filter((match) => !match[2].includes('tools:node="remove"'))
    .map((match) => match[1]);
}

function checkPermissions() {
  once("permissions", () => {
    const infoPath = join(mobileRoot, "ios/Shongre/Info.plist");
    const androidPath = join(
      mobileRoot,
      "android/app/src/main/AndroidManifest.xml",
    );
    if (!existsSync(infoPath) || !existsSync(androidPath)) {
      add(
        "Generated permission configuration",
        STATUS.fail,
        "Generated iOS or Android project is missing.",
      );
      return;
    }
    const plist = readFileSync(infoPath, "utf8");
    const unwantedIos = [
      "NSFaceIDUsageDescription",
      "NSCameraUsageDescription",
      "NSLocationWhenInUseUsageDescription",
      "NSLocationAlwaysUsageDescription",
      "NSLocationAlwaysAndWhenInUseUsageDescription",
      "NSMotionUsageDescription",
      "NSMicrophoneUsageDescription",
    ].filter((key) => plist.includes(key));
    const requiredIos = ["NSPhotoLibraryUsageDescription"].filter(
      (key) => !plist.includes(key),
    );
    add(
      "iOS purpose strings",
      unwantedIos.length || requiredIos.length ? STATUS.fail : STATUS.pass,
      unwantedIos.length
        ? `Unexpected: ${unwantedIos.join(", ")}`
        : requiredIos.length
          ? `Missing: ${requiredIos.join(", ")}`
          : "User-selected photos only; camera and location remain absent.",
    );

    const manifest = readFileSync(androidPath, "utf8");
    const active = activeAndroidPermissions(manifest);
    const allowed = new Set([
      "android.permission.INTERNET",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.VIBRATE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ]);
    const unexpected = active.filter((permission) => !allowed.has(permission));
    add(
      "Android permission allowlist",
      unexpected.length ? STATUS.fail : STATUS.pass,
      unexpected.length
        ? `Unexpected: ${unexpected.join(", ")}`
        : active.join(", "),
    );
    const legacyScoped =
      /READ_EXTERNAL_STORAGE[^>]+maxSdkVersion="32"/.test(manifest) &&
      /WRITE_EXTERNAL_STORAGE[^>]+maxSdkVersion="32"/.test(manifest);
    add(
      "Android legacy media scope",
      legacyScoped ? STATUS.pass : STATUS.warning,
      "Legacy photo permissions must remain capped at API 32; Android 13+ uses the system picker.",
    );
    add(
      "Runtime permission timing",
      STATUS.manual,
      "Verify on physical devices that photos and notifications are requested only after an explained user action.",
    );
  });
}

function checkAndroid16kb() {
  once("android-16kb", () => {
    const packageJson = JSON.parse(file("mobile/package.json"));
    const propertiesPath = join(mobileRoot, "android/gradle.properties");
    const properties = existsSync(propertiesPath)
      ? parseEnvFile(propertiesPath)
      : {};
    const rn = packageJson.dependencies["react-native"];
    const expo = packageJson.dependencies.expo;
    const modernRuntime = Number(rn?.match(/(\d+)\.(\d+)/)?.[2] || 0) >= 86;
    add(
      "Android 16 KB runtime baseline",
      modernRuntime && expo?.includes("57.") ? STATUS.pass : STATUS.fail,
      `Expo ${expo}, React Native ${rn}`,
    );
    add(
      "Android native library packaging",
      properties["expo.useLegacyPackaging"] === "false"
        ? STATUS.pass
        : STATUS.fail,
      `expo.useLegacyPackaging=${properties["expo.useLegacyPackaging"] || "missing"}`,
    );
    const artifacts = walk(
      join(mobileRoot, "android/app/build/outputs"),
    ).filter((path) => /\.(aab|apk)$/.test(path));
    add(
      "Packaged native .so alignment",
      artifacts.length ? STATUS.manual : STATUS.manual,
      artifacts.length
        ? `Inspect with bundletool/apksigner: ${artifacts.map((path) => relative(root, path)).join(", ")}`
        : "No release AAB/APK exists locally; inspect every packaged .so in the signed candidate.",
    );
  });
}

function checkDeepLinks() {
  once("deep-links", () => {
    const entitlementsPath = join(
      mobileRoot,
      "ios/Shongre/Shongre.entitlements",
    );
    const androidPath = join(
      mobileRoot,
      "android/app/src/main/AndroidManifest.xml",
    );
    const sourceConfigured =
      existsSync(entitlementsPath) &&
      file("mobile/app.config.ts").includes("associatedDomains");
    const androidConfigured =
      existsSync(androidPath) &&
      readFileSync(androidPath, "utf8").includes('android:autoVerify="true"');
    add(
      "iOS Universal Links configuration",
      sourceConfigured ? STATUS.pass : STATUS.fail,
      sourceConfigured
        ? "Associated domain is present in generated entitlements."
        : "Missing associated-domain entitlement.",
    );
    add(
      "Android App Links configuration",
      androidConfigured ? STATUS.pass : STATUS.fail,
      androidConfigured
        ? "autoVerify HTTPS intent filter is present."
        : "Missing verified app-link intent filter.",
    );
    const appleFile = join(
      root,
      "frontend/public/.well-known/apple-app-site-association",
    );
    const googleFile = join(
      root,
      "frontend/public/.well-known/assetlinks.json",
    );
    add(
      "Production association files",
      existsSync(appleFile) && existsSync(googleFile)
        ? STATUS.pass
        : STATUS.manual,
      existsSync(appleFile) && existsSync(googleFile)
        ? "Generated web association files are present; deployment still needs verification."
        : "Run make association-files after providing Apple team ID and Android signing fingerprint.",
    );
  });
}

function checkSigning() {
  once("signing", () => {
    add(
      "Apple signing credentials",
      env.APPLE_TEAM_ID && env.EAS_PROJECT_ID ? STATUS.manual : STATUS.manual,
      env.APPLE_TEAM_ID && env.EAS_PROJECT_ID
        ? "Identifiers exist; confirm distribution certificate and provisioning profile in EAS."
        : "APPLE_TEAM_ID/EAS_PROJECT_ID are intentionally not committed; configure them in secure release infrastructure.",
    );
    add(
      "Google Play signing",
      env.ANDROID_SHA256_CERT_FINGERPRINT && env.EAS_PROJECT_ID
        ? STATUS.manual
        : STATUS.manual,
      env.ANDROID_SHA256_CERT_FINGERPRINT && env.EAS_PROJECT_ID
        ? "Confirm upload key and Play App Signing enrollment."
        : "Signing fingerprint/EAS project are intentionally not committed; configure secure credentials before release.",
    );
  });
}

function checkDocumentation() {
  once("privacy-docs", () => {
    const docs = [
      "mobile/store/common/privacy-data-inventory.md",
      "mobile/store/common/permissions-inventory.md",
      "mobile/store/common/third-party-sdk-inventory.md",
      "mobile/store/common/account-deletion.md",
      "mobile/store/common/billing-classification.md",
      "mobile/store/apple/privacy-label-map.md",
      "mobile/store/google/data-safety-map.md",
      "docs/compliance/store-requirements.md",
    ];
    const missing = docs.filter((path) => !existsSync(join(root, path)));
    add(
      "Privacy and store inventories",
      missing.length ? STATUS.fail : STATUS.pass,
      missing.length
        ? `Missing: ${missing.join(", ")}`
        : `${docs.length} evidence documents present.`,
    );
  });
}

function checkAccountDeletionAndUgc() {
  once("product-safety", () => {
    const router = file("backend/src/api/v1/router.ts");
    const migration = file(
      "backend/supabase/migrations/00009_mobile_safety_and_account_deletion.sql",
    );
    add(
      "In-app account deletion",
      declaresRoute(router, "/account/delete") &&
        existsSync(join(root, "mobile/app/settings/delete-account.tsx"))
        ? STATUS.pass
        : STATUS.fail,
      "Reauthentication, active-order blocking, anonymization, and token revocation are implemented.",
    );
    add(
      "External account deletion route",
      existsSync(
        join(root, "frontend/src/features/legal/AccountDeletionPage.tsx"),
      )
        ? STATUS.pass
        : STATUS.fail,
      `${env.PUBLIC_INTL_URL ? `${env.PUBLIC_INTL_URL.replace(/\/$/, "")}/account/delete` : "URL not configured"}`,
    );
    const ugc =
      declaresRoute(router, "/reports") &&
      declaresRoute(router, "/messaging/block") &&
      declaresRoute(router, "/messaging/unblock") &&
      migration.includes("blocked_users");
    add(
      "UGC report and block controls",
      ugc ? STATUS.pass : STATUS.fail,
      "Backend-authoritative report, block, unblock, and blocked-message enforcement.",
    );
    add(
      "Moderation operations readiness",
      STATUS.manual,
      "Confirm production staffing, response SLAs, escalation, and legal evidence-retention procedures.",
    );
  });
}

function checkBilling() {
  once("billing", () => {
    const runtimeFiles = walk(join(mobileRoot, "app")).concat(
      walk(join(mobileRoot, "src")),
    );
    const digitalCheckoutSurface = runtimeFiles.some(
      (path) =>
        /\.(ts|tsx|js|jsx)$/.test(path) &&
        /\/monetization\/checkouts|createCheckout\s*\(/.test(
          readFileSync(path, "utf8"),
        ),
    );
    const documented = existsSync(
      join(root, "mobile/store/common/billing-classification.md"),
    );
    add(
      "Billing classification",
      documented && !digitalCheckoutSurface ? STATUS.pass : STATUS.fail,
      digitalCheckoutSurface
        ? "A mobile digital checkout surface is present without an approved store billing implementation."
        : "No digital checkout ships in mobile; physical marketplace payments remain separately classified.",
    );
    add(
      "Regional/store billing decision",
      STATUS.manual,
      "Legal/product owners must approve the current Apple and Google billing path for each digital product and region before enabling sales.",
    );
  });
}

function checkPush() {
  once("push", () => {
    const router = file("backend/src/api/v1/router.ts");
    const service = file(
      "mobile/src/services/notifications/notifications.service.ts",
    );
    const valid =
      declaresRoute(router, "/notifications/devices") &&
      service.includes("unregisterCurrentDevice");
    add(
      "Push token lifecycle",
      valid ? STATUS.pass : STATUS.fail,
      "Contextual permission, backend registration, and logout/deletion cleanup are wired.",
    );
  });
}

function checkReviewerAccess() {
  once("reviewer-access", () => {
    const path = join(root, "mobile/store/common/reviewer-access.md");
    add(
      "Reviewer access documentation",
      existsSync(path) ? STATUS.pass : STATUS.fail,
      existsSync(path)
        ? "Access paths and review scenarios are documented without committed credentials."
        : "Documentation is missing.",
    );
    add(
      "Reviewer credentials",
      STATUS.manual,
      "Create a stable, non-expiring review account and enter credentials only in App Store Connect/Play Console secure fields.",
    );
  });
}

function checkContent() {
  once("content", () => {
    const candidates = walk(join(mobileRoot, "app")).concat(
      walk(join(mobileRoot, "src")),
    );
    const findings = [];
    for (const path of candidates) {
      if (!/\.(ts|tsx|js|jsx)$/.test(path)) continue;
      const source = readFileSync(path, "utf8");
      if (/\b(TODO|FIXME|HACK)\b|\bdebugger\b|console\.log\s*\(/.test(source))
        findings.push(relative(root, path));
    }
    add(
      "Release content scan",
      findings.length ? STATUS.fail : STATUS.pass,
      findings.length
        ? `Debug/incomplete markers: ${findings.join(", ")}`
        : "No TODO/FIXME/debugger/console.log markers in mobile runtime source.",
    );
    const sourceGraph = command("node", ["mobile/scripts/dead-code-check.mjs"]);
    add(
      "Mobile source reachability",
      sourceGraph.startsWith("Mobile source graph is clean:")
        ? STATUS.pass
        : STATUS.fail,
      sourceGraph || "The source graph check did not return a result.",
    );
    add(
      "Store metadata and screenshots",
      STATUS.manual,
      "Finalize localized copy, screenshots, support contact, category, ratings, and promotional assets in both consoles.",
    );
  });
}

function checkDependencies() {
  once("dependencies", () => {
    const packageJson = JSON.parse(file("mobile/package.json"));
    add(
      "Expo mobile baseline",
      packageJson.dependencies.expo?.includes("57.") &&
        packageJson.dependencies["react-native"] === "0.86.2"
        ? STATUS.pass
        : STATUS.fail,
      `Expo ${packageJson.dependencies.expo}, React Native ${packageJson.dependencies["react-native"]}, Expo Router ${packageJson.dependencies["expo-router"]}`,
    );
    const output = command("npm", ["audit", "--omit=dev", "--json"]);
    try {
      const audit = JSON.parse(output);
      const counts = audit.metadata?.vulnerabilities || {};
      const status = counts.critical
        ? STATUS.fail
        : counts.high || counts.moderate
          ? STATUS.warning
          : STATUS.pass;
      add(
        "Dependency advisory audit",
        status,
        `${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.moderate || 0} moderate. Review reachability and upstream fixes; never force-downgrade Expo.`,
      );
    } catch {
      add(
        "Dependency advisory audit",
        STATUS.warning,
        "npm audit could not return machine-readable results.",
      );
    }
    add(
      "Third-party SDK release audit",
      STATUS.manual,
      "Reconcile every native dependency and embedded privacy manifest/signature against Apple’s current SDK list using the maintained inventory.",
    );
  });
}

function checkIosEntitlements() {
  once("ios-entitlements", () => {
    const path = join(mobileRoot, "ios/Shongre/Shongre.entitlements");
    const source = existsSync(path) ? readFileSync(path, "utf8") : "";
    const keys = [...source.matchAll(/<key>([^<]+)<\/key>/g)].map(
      (match) => match[1],
    );
    const allowed = new Set([
      "aps-environment",
      "com.apple.developer.associated-domains",
    ]);
    const unexpected = keys.filter((key) => !allowed.has(key));
    const required = [...allowed].filter((key) => !keys.includes(key));
    add(
      "iOS entitlements",
      source && unexpected.length === 0 && required.length === 0
        ? STATUS.pass
        : STATUS.fail,
      !source
        ? "Generated entitlements missing."
        : unexpected.length
          ? `Unexpected entitlements: ${unexpected.join(", ")}`
          : required.length
            ? `Missing entitlements: ${required.join(", ")}`
            : "Only Associated Domains and APNs capabilities are configured.",
    );
  });
}

function checkGoogleDataSafety() {
  once("data-safety", () => {
    const path = join(root, "mobile/store/google/data-safety-map.md");
    add(
      "Google Data Safety map",
      existsSync(path) ? STATUS.pass : STATUS.fail,
      existsSync(path)
        ? "Repository mapping is present."
        : "Mapping is missing.",
    );
    add(
      "Play Console Data Safety answers",
      STATUS.manual,
      "A human must reconcile the form with production data flows, SDK behavior, encryption, sharing, and deletion.",
    );
  });
}

function runIos() {
  checkIosSdk();
  checkIosPrivacy();
  checkPermissions();
  checkIosEntitlements();
  checkDeepLinks();
  checkIdentifiers();
  checkVersion();
  checkSigning();
}

function runAndroid() {
  checkAndroidSdk();
  checkAndroid16kb();
  checkPermissions();
  checkGoogleDataSafety();
  checkDeepLinks();
  checkIdentifiers();
  checkVersion();
  checkSigning();
}

function runStore() {
  checkProductionEnvironment();
  checkDependencies();
  checkDocumentation();
  checkAccountDeletionAndUgc();
  checkBilling();
  checkPush();
  checkReviewerAccess();
  checkContent();
  runIos();
  runAndroid();
}

const dispatch = {
  store: runStore,
  ios: runIos,
  android: runAndroid,
  version: checkVersion,
  privacy: () => {
    checkDocumentation();
    checkIosPrivacy();
    checkGoogleDataSafety();
  },
  permissions: checkPermissions,
  "sdk-audit": checkDependencies,
  "reviewer-access": checkReviewerAccess,
  "deep-links": checkDeepLinks,
  identifiers: checkIdentifiers,
  "production-env": checkProductionEnvironment,
  content: checkContent,
  "ios-sdk": checkIosSdk,
  "ios-privacy": checkIosPrivacy,
  "ios-permissions": checkPermissions,
  "ios-entitlements": checkIosEntitlements,
  "ios-signing": checkSigning,
  "android-sdk": checkAndroidSdk,
  "android-data-safety": checkGoogleDataSafety,
  "android-permissions": checkPermissions,
  "android-16kb": checkAndroid16kb,
  "android-signing": checkSigning,
};

if (!dispatch[mode]) {
  console.error(`Unknown release check "${mode}".`);
  process.exit(2);
}

dispatch[mode]();

console.log(`\nShongre release preflight: ${mode}\n`);
for (const result of results) {
  console.log(`${result.name.padEnd(38, ".")} ${result.status}`);
  console.log(`  ${result.detail}`);
}

const counts = Object.values(STATUS).map((status) => [
  status,
  results.filter((result) => result.status === status).length,
]);
console.log(
  `\n${counts.map(([status, count]) => `${status}: ${count}`).join(" | ")}`,
);
console.log(
  "This is evidence-based preflight output, not a guarantee of store approval.",
);

if (results.some((result) => result.status === STATUS.fail))
  process.exitCode = 1;
