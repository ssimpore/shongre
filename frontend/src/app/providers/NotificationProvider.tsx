import { PAGE_SIZES } from "../../configuration/pagination.config";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  Notification,
  NotificationType,
} from "../../domains/notifications/notification.types";
import { services } from "../../api/client/service-registry";
import { notificationRealtimeClient } from "../../domains/notifications/notification.realtime";
import { notificationCatalogService } from "../../domains/notifications/notification.catalog";
import { useAuth } from "./AuthProvider";
import { useToast } from "./ToastProvider";

interface NotificationContextValue {
  unreadCount: number;
  recentNotifications: Notification[];
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  simulateNotification: (
    type: NotificationType,
    context?: any,
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, isRestoring } = useAuth();
  const toast = useToast();
  const currentUserId = currentUser?.id ?? null;

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<
    Notification[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load recent notifications & unread count
  const refresh = useCallback(async () => {
    if (isRestoring) return;
    if (!currentUserId) {
      setRecentNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [items, count] = await Promise.all([
        services.notifications.getUserNotifications(currentUserId),
        services.notifications.getUnreadCount(currentUserId),
      ]);
      setRecentNotifications(items.slice(0, PAGE_SIZES.notificationPreview));
      setUnreadCount(count);
    } catch {
      // Notification previews must never take down a public or expired-session
      // page. Authentication screens and explicit notification actions surface
      // their own errors; the shell safely presents an empty badge here.
      setRecentNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, isRestoring]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Subscribe to real-time events
  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = notificationRealtimeClient.subscribe(
      currentUserId,
      (event) => {
        if (event.type === "notification.created") {
          const notif = event.payload as Notification;
          setRecentNotifications((prev) => [
            notif,
            ...prev.filter((n) => n.id !== notif.id),
          ]);
          setUnreadCount((prev) => prev + 1);

          // Show non-intrusive toast for high/critical notifications
          if (notif.priority === "high" || notif.priority === "critical") {
            toast.info(notif.title);
          }
        } else if (event.type === "notification.read") {
          const { id } = event.payload;
          setRecentNotifications((prev) =>
            prev.map((n) =>
              n.id === id ? { ...n, isRead: true, status: "read" } : n,
            ),
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } else if (event.type === "notification.all_read") {
          setRecentNotifications((prev) =>
            prev.map((n) => ({ ...n, isRead: true, status: "read" })),
          );
          setUnreadCount(0);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [currentUserId, toast]);

  const markAsRead = async (id: string) => {
    if (!currentUserId) return;
    await services.notifications.markAsRead(id);
    setRecentNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, isRead: true, status: "read" } : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    await services.notifications.markAllAsRead(currentUserId);
    setRecentNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, status: "read" })),
    );
    setUnreadCount(0);
  };

  const simulateNotification = async (
    type: NotificationType,
    context?: any,
  ) => {
    if (!currentUserId) {
      toast.info("Connectez-vous pour accéder aux notifications.");
      return;
    }
    const notif = notificationCatalogService.createNotificationFromEvent({
      type,
      recipientId: currentUserId,
      context,
    });
    if (!services.notifications.simulateNotification) {
      toast.info(
        "Les scénarios de notification sont disponibles en mode démo.",
      );
      return;
    }
    await services.notifications.simulateNotification(notif);
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh,
        simulateNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return ctx;
};
