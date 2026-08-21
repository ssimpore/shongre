import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../../../app/providers/NotificationProvider";
import { NotificationPanel } from "./NotificationPanel";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    unreadCount,
    recentNotifications,
    markAsRead,
    markAllAsRead,
    isLoading,
  } = useNotifications();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
            : "Notifications"
        }
        className="relative flex h-control-md w-control-md items-center justify-center rounded-control text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950 cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-4.5 px-1 rounded-full bg-primary text-white text-micro font-black flex items-center justify-center ring-2 ring-white animate-fade-in shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={recentNotifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        isLoading={isLoading}
      />
    </div>
  );
};
