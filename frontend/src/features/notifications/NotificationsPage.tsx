import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Settings } from "lucide-react";
import {
  Notification,
  NotificationFilterTab,
} from "../../domains/notifications/notification.types";
import {
  notificationService,
  NotificationDateGroup,
} from "../../domains/notifications/notification.service";
import { notificationCatalogService } from "../../domains/notifications/notification.catalog";
import { notificationRepository } from "../../repositories/notification.repository";
import { useNotifications } from "../../app/providers/NotificationProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { Button } from "../../design-system/primitives/Button";
import { NotificationItemCard } from "./components/NotificationItemCard";
import { NotificationDemoToolbar } from "./components/NotificationDemoToolbar";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

export const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.notifications.title"),
    description: t("meta.notifications.description"),
    canonicalPath: "/compte/notifications",
    noIndex: true,
  });

  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const currentUserId = currentUser ? currentUser.id : "user-thomas";

  const { unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedFilter, setSelectedFilter] =
    useState<NotificationFilterTab>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load complete notification list
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await notificationRepository.getNotifications({
        recipientId: currentUserId,
        limit: 100,
      });
      setNotifications(res.notifications);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [currentUserId, unreadCount]);

  const handleSelectNotification = async (notif: Notification) => {
    await markAsRead(notif.id);
    const destination = notificationCatalogService.resolveDestination(notif);
    navigate(destination);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    await loadNotifications();
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notificationService.filterNotifications(
      notifications,
      selectedFilter,
    );
  }, [notifications, selectedFilter]);

  // Group by date
  const groupedNotifications: NotificationDateGroup[] = useMemo(() => {
    return notificationService.groupNotificationsByDate(filteredNotifications);
  }, [filteredNotifications]);

  const tabs: { id: NotificationFilterTab; label: string; count?: number }[] = [
    { id: "all", label: "Toutes" },
    { id: "unread", label: "Non lues", count: unreadCount },
    { id: "messages", label: "Messages" },
    { id: "transactions", label: "Commandes" },
    { id: "listings", label: "Annonces" },
    { id: "account", label: "Compte & Sécurité" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-primary" />
            <span>
              {t("notifications.notificationsPage.centreDeNotifications")}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {t("notifications.notificationsPage.misesAJourEnDirect")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              leftIcon={<Check className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {t("notifications.notificationsPage.toutMarquerCommeLu")}
            </Button>
          )}

          <Button
            to="/compte/notifications/preferences"
            variant="outline"
            size="sm"
            leftIcon={<Settings className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {t("notifications.notificationsPage.preferences")}
          </Button>
        </div>
      </div>

      {/* 2. Interactive Demo Toolbar */}
      <NotificationDemoToolbar />

      {/* 3. Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                isActive
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-micro font-extrabold ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Notification List Groups */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-border-base p-6 space-y-4 shadow-xs">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-stone-200 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 bg-stone-200 rounded w-1/3" />
                <div className="h-3 bg-stone-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : groupedNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-border-base p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-3xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-900">
              {selectedFilter === "unread"
                ? "Vous êtes à jour ! Aucune notification non lue."
                : "Aucune notification dans cette catégorie."}
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {t(
                "notifications.notificationsPage.vosAlertesConcernantLesBaisses",
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              {/* Date Group Heading */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                  {group.dateLabel}
                </span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>

              {/* Items Card Container */}
              <div className="bg-white rounded-3xl border border-border-base divide-y divide-border-subtle shadow-xs overflow-hidden">
                {group.items.map((notif) => (
                  <NotificationItemCard
                    key={notif.id}
                    notification={notif}
                    onSelect={handleSelectNotification}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
