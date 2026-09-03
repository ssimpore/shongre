import React, { useState } from "react";
import {
  Sparkles,
  MessageSquare,
  ShoppingBag,
  AlertCircle,
  Package,
  Star,
  DollarSign,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { NotificationType } from "../../../domains/notifications/notification.types";
import { useNotifications } from "../../../app/providers/NotificationProvider";
import { useTranslation } from "../../../i18n/I18nProvider";

export const NotificationDemoToolbar: React.FC = () => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const { simulateNotification } = useNotifications();

  const scenarios: {
    label: string;
    type: NotificationType;
    icon: React.ReactNode;
    context?: any;
  }[] = [
    {
      label: "Nouveau message",
      type: "message.received",
      icon: <MessageSquare className="w-icon-sm h-icon-sm text-info" />,
      context: {
        type: "conversation",
        conversationId: "conv-101",
        senderName: "Marie Dupont",
        previewText:
          "Bonjour, l'article est-il disponible pour un envoi rapide ?",
      },
    },
    {
      label: "Réservation acceptée",
      type: "reservation.accepted",
      icon: <ShoppingBag className="w-icon-sm h-icon-sm text-success" />,
      context: {
        type: "transaction",
        transactionId: "tx-201",
        listingTitle: "Table à manger en teck massif",
      },
    },
    {
      label: "Nouvelle commande",
      type: "order.created",
      icon: <ShoppingBag className="w-icon-sm h-icon-sm text-success" />,
      context: {
        type: "transaction",
        transactionId: "tx-301",
        listingTitle: "Vélo Gravel Canyon Grizl 7",
      },
    },
    {
      label: "Paiement échoué (Critique)",
      type: "payment.failed",
      icon: <AlertCircle className="w-icon-sm h-icon-sm text-danger" />,
      context: {
        type: "transaction",
        transactionId: "tx-401",
      },
    },
    {
      label: "Colis expédié",
      type: "fulfillment.shipped",
      icon: <Package className="w-icon-sm h-icon-sm text-indigo-600" />,
      context: {
        type: "transaction",
        transactionId: "tx-501",
        listingTitle: "iPhone 15 Pro Max 256Go",
      },
    },
    {
      label: "Avis 5 étoiles reçu",
      type: "review.received",
      icon: (
        <Star className="w-icon-sm h-icon-sm text-amber-500 fill-amber-400" />
      ),
      context: {
        type: "account",
        reviewerName: "Julien M.",
        rating: 5,
      },
    },
    {
      label: "Abonnement Pro activé",
      type: "subscription.started",
      icon: <DollarSign className="w-icon-sm h-icon-sm text-warning" />,
      context: {
        type: "subscription",
        planId: "plan_pro_premium",
        planName: "Forfait Pro Illimité",
      },
    },
    {
      label: "Signalement modérateur",
      type: "moderation.report_assigned",
      icon: <ShieldAlert className="w-icon-sm h-icon-sm text-stone-700" />,
      context: {
        type: "moderation",
        reportId: "9842",
      },
    },
  ];

  return (
    <div className="bg-stone-900 text-white rounded-2xl p-3.5 shadow-sm space-y-2.5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs font-semibold hover:text-primary-on-dark transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-icon-md h-icon-md text-amber-400" />
          <span>
            {t(
              "notifications.notificationDemoToolbar.simulateurDEvenementsTempsReel",
            )}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-icon-md h-icon-md" />
        ) : (
          <ChevronDown className="w-icon-md h-icon-md" />
        )}
      </button>

      {isExpanded && (
        <div className="pt-2 border-t border-stone-800 space-y-2">
          <p className="text-micro text-stone-500">
            {t(
              "notifications.notificationDemoToolbar.cliquezSurUnScenarioPour",
            )}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {scenarios.map((sc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => simulateNotification(sc.type, sc.context)}
                className="flex items-center gap-2 p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-semibold transition-all border border-stone-700 text-left"
              >
                {sc.icon}
                <span className="truncate">{sc.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
