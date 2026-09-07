import { createContext, useContext } from "react";
import type {
  Notification,
  NotificationContext as NotificationEventContext,
  NotificationType,
} from "../../domains/notifications/notification.types";

export interface NotificationContextValue {
  unreadCount: number;
  recentNotifications: Notification[];
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  simulateNotification: (
    type: NotificationType,
    context?: NotificationEventContext,
  ) => Promise<void>;
}

const noop = async () => {};

export const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  recentNotifications: [],
  isLoading: false,
  markAsRead: noop,
  markAllAsRead: noop,
  refresh: noop,
  simulateNotification: noop,
});

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext);
}
