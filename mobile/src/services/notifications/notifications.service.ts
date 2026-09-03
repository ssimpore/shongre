import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";
import {
  permissionsService,
  type PermissionOutcome,
} from "@/services/permissions/permissions.service";
import { secureStorage } from "@/services/secure-storage/secure-storage";

const PUSH_TOKEN_KEY = "shongre.mobile.push-token.v1";

export type NotificationPreferenceCategory =
  | "messages"
  | "transactions"
  | "listings"
  | "delivery"
  | "reviews"
  | "promotions"
  | "security"
  | "marketing";
export interface NotificationChannelPreference {
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

const DEFAULT_PREFERENCES: Omit<
  MobileNotificationPreferences,
  "userId" | "updatedAt"
> = {
  messages: { inApp: true, email: false, push: true },
  transactions: { inApp: true, email: true, push: true, isMandatory: true },
  listings: { inApp: true, email: true, push: false },
  delivery: { inApp: true, email: true, push: true, isMandatory: true },
  reviews: { inApp: true, email: false, push: true },
  promotions: { inApp: true, email: false, push: false },
  security: { inApp: true, email: true, push: true, isMandatory: true },
  marketing: { inApp: false, email: false, push: false },
};
const demoPreferences = new Map<string, MobileNotificationPreferences>();

export const notificationsService = {
  async getPreferences(userId: string): Promise<MobileNotificationPreferences> {
    if (mobileEnvironment.dataMode === "api") {
      return apiRequest<MobileNotificationPreferences>(
        "/notifications/preferences",
      );
    }
    return (
      demoPreferences.get(userId) || {
        ...structuredClone(DEFAULT_PREFERENCES),
        userId,
        updatedAt: "2026-09-03T08:00:00.000Z",
      }
    );
  },

  async updatePreferences(
    userId: string,
    preferences: MobileNotificationPreferences,
  ): Promise<MobileNotificationPreferences> {
    if (mobileEnvironment.dataMode === "api") {
      return apiRequest<MobileNotificationPreferences>(
        "/notifications/preferences",
        {
          method: "PUT",
          body: JSON.stringify(preferences),
        },
      );
    }
    const next = {
      ...structuredClone(preferences),
      userId,
      updatedAt: "2026-09-03T08:01:00.000Z",
    };
    demoPreferences.set(userId, next);
    return next;
  },

  async enable(): Promise<PermissionOutcome> {
    const outcome = await permissionsService.requestNotifications();
    if (outcome !== "granted" || mobileEnvironment.dataMode === "demo")
      return outcome;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as
      string | undefined;
    if (!projectId)
      throw new Error("Le projet de notifications n’est pas configuré.");
    if (Platform.OS !== "ios" && Platform.OS !== "android") return outcome;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    await apiRequest("/notifications/devices", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version,
      }),
    });
    await secureStorage.set(PUSH_TOKEN_KEY, token);
    return outcome;
  },

  async unregisterCurrentDevice(): Promise<void> {
    const token = await secureStorage.get(PUSH_TOKEN_KEY);
    if (!token) return;
    if (mobileEnvironment.dataMode === "api") {
      await apiRequest("/notifications/devices/unregister", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    }
    await secureStorage.remove(PUSH_TOKEN_KEY);
  },
};
