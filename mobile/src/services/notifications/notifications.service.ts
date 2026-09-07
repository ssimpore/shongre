import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import type { operations } from "@shongre/contracts/openapi";
import { apiRequest } from "@/api/http-client";
import {
  permissionsService,
  type PermissionOutcome,
} from "@/services/permissions/permissions.service";
import { secureStorage } from "@/services/secure-storage/secure-storage";

const PUSH_TOKEN_KEY = "shongre.mobile.push-token.v1";

const NOTIFICATION_CATEGORIES = [
  "messages",
  "transactions",
  "listings",
  "delivery",
  "delivery_opportunities",
  "reviews",
  "promotions",
  "security",
  "marketing",
] as const;
export type NotificationPreferenceCategory =
  (typeof NOTIFICATION_CATEGORIES)[number];
interface NotificationChannelPreference {
  inApp: boolean;
  email: boolean;
  push: boolean;
  isMandatory?: boolean;
}
export type MobileNotificationPreferences = Record<
  NotificationPreferenceCategory,
  NotificationChannelPreference
> & {
  userId: string;
  updatedAt: string;
};

type PreferencesResponse =
  operations["getNotificationPreferences"]["responses"][200]["content"]["application/json"];
type PreferencesUpdateRequest =
  operations["putNotificationPreferences"]["requestBody"]["content"]["application/json"];
type PreferencesUpdateResponse =
  operations["putNotificationPreferences"]["responses"][200]["content"]["application/json"];
type DeviceRegistrationRequest =
  operations["postNotificationsDevices"]["requestBody"]["content"]["application/json"];
type DeviceRegistrationResponse =
  operations["postNotificationsDevices"]["responses"][200]["content"]["application/json"];
type DeviceUnregistrationRequest =
  operations["postNotificationsDevicesUnregister"]["requestBody"]["content"]["application/json"];
type DeviceUnregistrationResponse =
  operations["postNotificationsDevicesUnregister"]["responses"][200]["content"]["application/json"];

function mapPreferences(value: unknown): MobileNotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Les préférences reçues sont invalides.");
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.userId !== "string" ||
    typeof candidate.updatedAt !== "string"
  ) {
    throw new Error("Les préférences reçues sont invalides.");
  }
  const preferences = {
    userId: candidate.userId,
    updatedAt: candidate.updatedAt,
  } as MobileNotificationPreferences;
  for (const category of NOTIFICATION_CATEGORIES) {
    const raw = candidate[category];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Les préférences reçues sont invalides.");
    }
    const channel = raw as Record<string, unknown>;
    if (
      typeof channel.inApp !== "boolean" ||
      typeof channel.email !== "boolean" ||
      typeof channel.push !== "boolean" ||
      (channel.isMandatory !== undefined &&
        typeof channel.isMandatory !== "boolean")
    ) {
      throw new Error("Les préférences reçues sont invalides.");
    }
    preferences[category] = {
      inApp: channel.inApp,
      email: channel.email,
      push: channel.push,
      ...(channel.isMandatory === undefined
        ? {}
        : { isMandatory: channel.isMandatory }),
    };
  }
  return preferences;
}

export const notificationsService = {
  async getPreferences(
    _userId: string,
  ): Promise<MobileNotificationPreferences> {
    return mapPreferences(
      await apiRequest<PreferencesResponse>("/notifications/preferences"),
    );
  },

  async updatePreferences(
    _userId: string,
    preferences: MobileNotificationPreferences,
  ): Promise<MobileNotificationPreferences> {
    const payload: PreferencesUpdateRequest = { ...preferences };
    return mapPreferences(
      await apiRequest<PreferencesUpdateResponse>(
        "/notifications/preferences",
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      ),
    );
  },

  async enable(): Promise<PermissionOutcome> {
    const outcome = await permissionsService.requestNotifications();
    if (outcome !== "granted") return outcome;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as
      string | undefined;
    if (!projectId)
      throw new Error("Le projet de notifications n’est pas configuré.");
    if (Platform.OS !== "ios" && Platform.OS !== "android") return outcome;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    const payload: DeviceRegistrationRequest = {
      token,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
    };
    await apiRequest<DeviceRegistrationResponse>("/notifications/devices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await secureStorage.set(PUSH_TOKEN_KEY, token);
    return outcome;
  },

  async unregisterCurrentDevice(): Promise<void> {
    const token = await secureStorage.get(PUSH_TOKEN_KEY);
    if (!token) return;
    const payload: DeviceUnregistrationRequest = { token };
    await apiRequest<DeviceUnregistrationResponse>(
      "/notifications/devices/unregister",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    await secureStorage.remove(PUSH_TOKEN_KEY);
  },
};
