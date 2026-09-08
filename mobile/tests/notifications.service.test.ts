import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  storedToken: null as string | null,
  permission: "granted" as "granted" | "denied" | "blocked",
}));
const apiRequest = vi.hoisted(() => vi.fn());
const getExpoPushTokenAsync = vi.hoisted(() => vi.fn());

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      version: "1.0.0",
      extra: { eas: { projectId: "mobile-test-project" } },
    },
  },
}));
vi.mock("expo-notifications", () => ({ getExpoPushTokenAsync }));
vi.mock("@/api/http-client", () => ({ apiRequest }));
vi.mock("@/services/permissions/permissions.service", () => ({
  permissionsService: {
    requestNotifications: async () => state.permission,
  },
}));
vi.mock("@/services/secure-storage/secure-storage", () => ({
  secureStorage: {
    get: async () => state.storedToken,
    set: async (_key: string, value: string) => {
      state.storedToken = value;
    },
    remove: async () => {
      state.storedToken = null;
    },
  },
}));

import {
  notificationsService,
  type MobileNotificationPreferences,
} from "@/services/notifications/notifications.service";

const preferences = {
  userId: "account-a",
  updatedAt: "2026-09-07T00:00:00.000Z",
  messages: { inApp: true, email: true, push: true },
  transactions: { inApp: true, email: true, push: true },
  listings: { inApp: true, email: false, push: true },
  delivery: { inApp: true, email: false, push: true },
  delivery_opportunities: { inApp: true, email: false, push: false },
  reviews: { inApp: true, email: true, push: true },
  promotions: { inApp: true, email: false, push: false },
  security: { inApp: true, email: true, push: true, isMandatory: true },
  marketing: { inApp: false, email: false, push: false },
} satisfies MobileNotificationPreferences;

describe("API-only mobile notifications", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getExpoPushTokenAsync.mockReset();
    state.storedToken = null;
    state.permission = "granted";
  });

  it("loads and updates preferences only through the API", async () => {
    apiRequest.mockResolvedValue(preferences);

    await expect(
      notificationsService.getPreferences("account-a"),
    ).resolves.toEqual(preferences);
    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/notifications/preferences",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
      undefined,
    );

    await expect(
      notificationsService.updatePreferences("account-a", preferences),
    ).resolves.toEqual(preferences);
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/notifications/preferences",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(preferences),
        headers: expect.any(Headers),
      }),
      undefined,
    );
  });

  it("registers and persists the push token only after API confirmation", async () => {
    getExpoPushTokenAsync.mockResolvedValue({ data: "expo-push-token" });
    apiRequest.mockResolvedValue({ registered: true });

    await expect(notificationsService.enable()).resolves.toBe("granted");
    expect(getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "mobile-test-project",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/notifications/devices",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          token: "expo-push-token",
          platform: "ios",
          appVersion: "1.0.0",
        }),
        headers: expect.any(Headers),
      }),
      undefined,
    );
    expect(state.storedToken).toBe("expo-push-token");
  });

  it("does not create local registration state when the API fails", async () => {
    getExpoPushTokenAsync.mockResolvedValue({ data: "expo-push-token" });
    apiRequest.mockRejectedValue(new Error("offline"));

    await expect(notificationsService.enable()).rejects.toThrow("offline");
    expect(state.storedToken).toBeNull();
  });

  it("removes the stored device token only after API unregistration", async () => {
    state.storedToken = "expo-push-token";
    apiRequest.mockResolvedValue({ unregistered: true });

    await notificationsService.unregisterCurrentDevice();

    expect(apiRequest).toHaveBeenCalledWith(
      "/notifications/devices/unregister",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "expo-push-token" }),
        headers: expect.any(Headers),
      }),
      undefined,
    );
    expect(state.storedToken).toBeNull();
  });
});
