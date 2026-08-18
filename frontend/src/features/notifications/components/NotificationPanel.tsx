import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, ExternalLink, Settings } from 'lucide-react';
import { Notification } from '../../../domains/notifications/notification.types';
import { notificationCatalogService } from '../../../domains/notifications/notification.catalog';
import { NotificationItemCard } from './NotificationItemCard';
import { Button } from '../../../design-system/primitives/Button';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  isLoading?: boolean;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  isLoading = false,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Escape key & Click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectNotification = async (notif: Notification) => {
    await onMarkAsRead(notif.id);
    onClose();
    const destination = notificationCatalogService.resolveDestination(notif);
    navigate(destination);
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-border-base z-50 overflow-hidden flex flex-col max-h-[500px] animate-in fade-in slide-in-from-top-2 duration-fast"
      role="region"
      aria-label="Panneau des notifications"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-border-base flex items-center justify-between gap-2 bg-stone-50/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-stone-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-micro font-extrabold bg-primary text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-micro font-bold text-stone-600 hover:text-stone-900 p-1 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-primary" />
              <span>Tout lire</span>
            </button>
          )}

          <Link
            to="/compte/notifications/preferences"
            onClick={onClose}
            className="p-1 text-stone-500 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            title="Préférences de notifications"
            aria-label="Préférences de notifications"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto divide-y divide-border-subtle flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-stone-200 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-stone-200 rounded w-1/2" />
                  <div className="h-2.5 bg-stone-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
              <Bell className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-stone-800">Aucune notification pour le moment</p>
            <p className="text-micro text-stone-500">
              Vos alertes, messages et transactions apparaîtront ici.
            </p>
          </div>
        ) : (
          notifications.slice(0, 6).map((notif) => (
            <NotificationItemCard
              key={notif.id}
              notification={notif}
              onSelect={handleSelectNotification}
              isCompact
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-border-base bg-stone-50 text-center">
        <Link
          to="/compte/notifications"
          onClick={onClose}
          className="text-xs font-bold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1.5"
        >
          <span>Voir toutes les notifications</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
