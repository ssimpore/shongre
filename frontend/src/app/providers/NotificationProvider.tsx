import { PAGE_SIZES } from "../../configuration/pagination.config";
import React, { useState, useEffect, useCallback } from "react";
import { Notification } from "../../domains/notifications/notification.types";
import { services } from "../../api/client/service-registry";
import { useAuth } from "./AuthProvider";
import { isStaffSeparatedSubject } from "@shongre/contracts/access-control";
import { NotificationContext } from "./NotificationContext";

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, isRestoring } = useAuth();
  const currentUserId = currentUser?.id ?? null;
  const isStaffIdentity = isStaffSeparatedSubject(currentUser);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<
    Notification[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load recent notifications & unread count
  const refresh = useCallback(async () => {
    if (isRestoring) return;
    if (!currentUserId || isStaffIdentity) {
      setRecentNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [items, count] = await Promise.all([
        services.notifications.getUserNotifications(),
        services.notifications.getUnreadCount(),
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
  }, [currentUserId, isRestoring, isStaffIdentity]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    await services.notifications.markAllAsRead();
    setRecentNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, status: "read" })),
    );
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount: isStaffIdentity ? 0 : unreadCount,
        recentNotifications: isStaffIdentity ? [] : recentNotifications,
        isLoading: isStaffIdentity ? false : isLoading,
        markAsRead,
        markAllAsRead,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
