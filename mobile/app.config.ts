import type { ConfigContext, ExpoConfig } from "expo/config";
import { configColors } from "@shongre/design-tokens/config";
import { createEnvironmentConfig } from "@shongre/contracts/environment";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[Mobile Config] ${name} is required.`);
  return value;
}

function integer(name: string): number {
  const raw = process.env[name];
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`[Mobile Config] ${name} must be a positive integer.`);
  }
  return value;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const bundleIdentifier = required("IOS_BUNDLE_IDENTIFIER");
  const androidPackage = required("ANDROID_PACKAGE_NAME");
  const version = required("APP_VERSION");
  const environment = createEnvironmentConfig({
    appEnvironment: required("APP_ENV"),
    environmentId: required("ENVIRONMENT_ID"),
    publicFranceUrl: required("PUBLIC_FR_URL"),
    publicInternationalUrl: required("PUBLIC_INTL_URL"),
    apiUrl: required("API_URL"),
  });
  const webOrigins = [
    ...new Map(
      [environment.urls.franceApp, environment.urls.internationalApp].map(
        (url) => [url.host, url],
      ),
    ).values(),
  ];

  return {
    ...config,
    name: "Shongre",
    slug: "shongre",
    scheme: "shongre",
    version,
    orientation: "default",
    userInterfaceStyle: "automatic",
    icon: "./assets/icon.png",
    experiments: { typedRoutes: true },
    plugins: [
      "expo-router",
      "expo-font",
      ["expo-secure-store", { faceIDPermission: false }],
      "expo-notifications",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: configColors.surface,
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 24,
            buildToolsVersion: "36.0.0",
            useLegacyPackaging: false,
          },
          ios: {
            deploymentTarget: "16.4",
          },
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Shongre accède aux photos choisies pour illustrer vos annonces.",
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
    ],
    ios: {
      bundleIdentifier,
      buildNumber: required("IOS_BUILD_NUMBER"),
      supportsTablet: true,
      associatedDomains: webOrigins.map((url) => `applinks:${url.host}`),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
        ],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType:
              "NSPrivacyCollectedDataTypeEmailAddress",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType:
              "NSPrivacyCollectedDataTypePhotosorVideos",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType:
              "NSPrivacyCollectedDataTypeOtherUserContent",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
        ],
      },
    },
    android: {
      package: androidPackage,
      versionCode: integer("ANDROID_VERSION_CODE"),
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: configColors.brand,
      },
      allowBackup: false,
      permissions: ["POST_NOTIFICATIONS"],
      blockedPermissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.READ_CONTACTS",
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: webOrigins.map((url) => ({
            scheme: url.protocol.replace(":", ""),
            host: url.host,
            pathPrefix: "/",
          })),
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/favicon.png",
    },
    extra: {
      environment: environment.environment,
      environmentId: environment.environmentId,
      eas: process.env.EAS_PROJECT_ID
        ? { projectId: process.env.EAS_PROJECT_ID }
        : undefined,
    },
  };
};
