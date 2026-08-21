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

export const notificationsService = {
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
