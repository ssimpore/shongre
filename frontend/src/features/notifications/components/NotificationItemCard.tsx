import React from 'react';
import {
  MessageSquare,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  DollarSign,
  Package,
  Star,
  Tag,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Notification, NotificationCategory } from '../../../domains/notifications/notification.types';
import { formatRelativeDate } from '../../../utilities/formatters';

interface NotificationItemCardProps {
  notification: Notification;
  onSelect: (notif: Notification) => void;
  isCompact?: boolean;
}

export const NotificationItemCard: React.FC<NotificationItemCardProps> = ({
  notification,
  onSelect,
  isCompact = false,
}) => {
  const getCategoryIcon = (category: NotificationCategory, priority: string) => {
    if (priority === 'critical') {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }

    switch (category) {
      case 'messages':
        return <MessageSquare className="w-4 h-4 text-sky-600" />;
      case 'transactions':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'listings':
        return <Tag className="w-4 h-4 text-primary" />;
      case 'delivery':
        return <Package className="w-4 h-4 text-indigo-600" />;
      case 'reviews':
        return <Star className="w-4 h-4 text-amber-500 fill-amber-400" />;
      case 'monetization':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'account':
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'moderation':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'system':
      default:
        return <Sparkles className="w-4 h-4 text-stone-600" />;
    }
  };

  const isUnread = !notification.isRead;

  return (
    <div
      onClick={() => onSelect(notification)}
      className={`flex items-start gap-3 transition-colors cursor-pointer group ${
        isCompact ? 'p-3 hover:bg-stone-50' : 'p-4 hover:bg-stone-50/80'
      } ${isUnread ? 'bg-primary/5' : 'bg-white'}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(notification);
        }
      }}
    >
      {/* Category Icon Badge */}
      <div
        className={`rounded-xl flex items-center justify-center shrink-0 border border-border-base bg-white shadow-2xs ${
          isCompact ? 'w-8 h-8' : 'w-10 h-10'
        }`}
      >
        {getCategoryIcon(notification.category, notification.priority)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h2
            className={`text-xs truncate ${
              isUnread ? 'font-black text-stone-950' : 'font-bold text-stone-800'
            }`}
          >
            {notification.title}
          </h2>
          <span className="text-micro text-stone-500 font-medium shrink-0">
            {formatRelativeDate(notification.createdAt)}
          </span>
        </div>

        <p className={`text-xs leading-relaxed line-clamp-2 ${isUnread ? 'text-stone-700 font-medium' : 'text-stone-500'}`}>
          {notification.body}
        </p>

        {/* Action Button Link (if not compact) */}
        {!isCompact && notification.actions && notification.actions.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-primary group-hover:underline">
            <span>{notification.actions[0].label}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>

      {/* Unread Pill Indicator */}
      {isUnread && (
        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2 ring-4 ring-primary/10" />
      )}
    </div>
  );
};
