/**
 * SHONGRE NOTIFICATION CATALOG & TEMPLATE REGISTRY
 * Authoritative registry mapping domain events to user-facing notification titles,
 * dynamic descriptions, icons, priorities, and deep-link destinations.
 */

import {
  Notification,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationContext,
  NotificationAction,
} from "./notification.types";
import { formatPrice } from "../../utilities/formatters";

export interface NotificationTemplateDefinition {
  type: NotificationType;
  category: NotificationCategory;
  defaultPriority: NotificationPriority;
  isMandatory?: boolean;
  getTitle: (ctx?: any) => string;
  getBody: (ctx?: any) => string;
  getDestination: (ctx?: any) => string;
  getActions?: (ctx?: any) => NotificationAction[];
}

export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  NotificationTemplateDefinition
> = {
  // 1. Messaging
  "message.received": {
    type: "message.received",
    category: "messages",
    defaultPriority: "normal",
    getTitle: (ctx) =>
      `${ctx?.senderName || "Un utilisateur"} vous a envoyé un message`,
    getBody: (ctx) =>
      ctx?.previewText || "Nouveau message reçu concernant votre annonce.",
    getDestination: (ctx) =>
      ctx?.conversationId
        ? `/compte/messages?convId=${ctx.conversationId}`
        : "/compte/messages",
    getActions: (ctx) => [
      {
        id: "reply",
        label: "Voir la conversation",
        destination: ctx?.conversationId
          ? `/compte/messages?convId=${ctx.conversationId}`
          : "/compte/messages",
        variant: "primary",
      },
    ],
  },

  // 2. Listing Lifecycle
  "listing.published": {
    type: "listing.published",
    category: "listings",
    defaultPriority: "normal",
    getTitle: () => "Votre annonce est en ligne !",
    getBody: (ctx) =>
      `Votre annonce "${ctx?.listingTitle || "Annonce"}" a été validée et est visible par les acheteurs.`,
    getDestination: (ctx) =>
      ctx?.listingId ? `/annonce/${ctx.listingId}` : "/compte/annonces",
    getActions: (ctx) => [
      {
        id: "view_listing",
        label: "Voir mon annonce",
        destination: ctx?.listingId
          ? `/annonce/${ctx.listingId}`
          : "/compte/annonces",
        variant: "primary",
      },
    ],
  },

  "listing.requires_changes": {
    type: "listing.requires_changes",
    category: "listings",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Modification requise sur votre annonce",
    getBody: (ctx) =>
      `Votre annonce "${ctx?.listingTitle || "Annonce"}" nécessite quelques ajustements pour être validée.`,
    getDestination: (ctx) =>
      ctx?.listingId ? `/compte/annonces` : "/compte/annonces",
    getActions: (ctx) => [
      {
        id: "edit_listing",
        label: "Modifier l'annonce",
        destination: "/compte/annonces",
        variant: "primary",
      },
    ],
  },

  "listing.rejected": {
    type: "listing.rejected",
    category: "listings",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Annonce non validée",
    getBody: (ctx) =>
      `Votre annonce "${ctx?.listingTitle || "Annonce"}" ne respecte pas nos règles de diffusion.`,
    getDestination: () => "/compte/annonces",
  },

  "listing.expiring": {
    type: "listing.expiring",
    category: "listings",
    defaultPriority: "low",
    getTitle: () => "Votre annonce expire bientôt",
    getBody: (ctx) =>
      `L'annonce "${ctx?.listingTitle || "Annonce"}" expire dans 3 jours. Renouvelez-la gratuitement.`,
    getDestination: () => "/compte/annonces",
    getActions: () => [
      {
        id: "renew",
        label: "Prolonger l'annonce",
        destination: "/compte/annonces",
        variant: "primary",
      },
    ],
  },

  "listing.expired": {
    type: "listing.expired",
    category: "listings",
    defaultPriority: "low",
    getTitle: () => "Votre annonce a expiré",
    getBody: (ctx) =>
      `L'annonce "${ctx?.listingTitle || "Annonce"}" n'est plus visible. Vous pouvez la republier en 1 clic.`,
    getDestination: () => "/compte/annonces",
  },

  "listing.sold": {
    type: "listing.sold",
    category: "listings",
    defaultPriority: "normal",
    getTitle: () => "Félicitations pour votre vente !",
    getBody: (ctx) =>
      `Votre article "${ctx?.listingTitle || "Annonce"}" a été vendu avec succès.`,
    getDestination: () => "/compte/achats",
  },

  "favorite.price_dropped": {
    type: "favorite.price_dropped",
    category: "listings",
    defaultPriority: "normal",
    getTitle: () => "Baisse de prix sur un favori !",
    getBody: (ctx) =>
      `Le prix de "${ctx?.listingTitle || "Article"}" a baissé${ctx?.price ? ` à ${formatPrice(ctx.price)}` : ""}.`,
    getDestination: (ctx) =>
      ctx?.listingId ? `/annonce/${ctx.listingId}` : "/compte/favoris",
    getActions: (ctx) => [
      {
        id: "view_deal",
        label: "Voir l'offre",
        destination: ctx?.listingId
          ? `/annonce/${ctx.listingId}`
          : "/compte/favoris",
        variant: "primary",
      },
    ],
  },

  "saved_search.match": {
    type: "saved_search.match",
    category: "listings",
    defaultPriority: "normal",
    getTitle: () => "Nouvelle annonce pour votre recherche",
    getBody: (ctx) =>
      `Une nouvelle annonce correspond à votre recherche "${ctx?.searchTitle || "enregistrée"}".`,
    getDestination: (ctx) => ctx?.queryUrl || "/compte/recherches",
  },

  // 3. Reservation Lifecycle
  "reservation.requested": {
    type: "reservation.requested",
    category: "transactions",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Nouvelle demande de réservation !",
    getBody: (ctx) =>
      `Un acheteur a demandé à réserver "${ctx?.listingTitle || "votre article"}" avec acompte sécurisé.`,
    getDestination: (ctx) =>
      ctx?.transactionId ? `/compte/achats` : "/compte/achats",
    getActions: () => [
      {
        id: "view_res",
        label: "Gérer la réservation",
        destination: "/compte/achats",
        variant: "primary",
      },
    ],
  },

  "reservation.accepted": {
    type: "reservation.accepted",
    category: "transactions",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Votre réservation est acceptée !",
    getBody: (ctx) =>
      `Le vendeur a accepté votre réservation pour "${ctx?.listingTitle || "l'article"}". Les fonds sont sécurisés.`,
    getDestination: () => "/compte/achats",
    getActions: () => [
      {
        id: "view_res_buyer",
        label: "Voir les détails & planifier",
        destination: "/compte/achats",
        variant: "primary",
      },
    ],
  },

  "reservation.rejected": {
    type: "reservation.rejected",
    category: "transactions",
    defaultPriority: "normal",
    isMandatory: true,
    getTitle: () => "Demande de réservation refusée",
    getBody: (ctx) =>
      `Le vendeur n'a pas pu donner suite à votre réservation pour "${ctx?.listingTitle || "l'article"}". L'acompte a été libéré.`,
    getDestination: () => "/compte/achats",
  },

  "reservation.expiring": {
    type: "reservation.expiring",
    category: "transactions",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Rendez-vous de réservation imminent",
    getBody: (ctx) =>
      `N'oubliez pas votre rendez-vous pour "${ctx?.listingTitle || "votre réservation"}".`,
    getDestination: () => "/compte/achats",
  },

  "reservation.cancelled": {
    type: "reservation.cancelled",
    category: "transactions",
    defaultPriority: "normal",
    isMandatory: true,
    getTitle: () => "Réservation annulée",
    getBody: (ctx) =>
      `La réservation pour "${ctx?.listingTitle || "l'article"}" a été annulée.`,
    getDestination: () => "/compte/achats",
  },

  // 4. Direct Purchase & Orders
  "order.created": {
    type: "order.created",
    category: "transactions",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Nouvelle commande reçue !",
    getBody: (ctx) =>
      `Vous avez reçu une commande pour "${ctx?.listingTitle || "votre article"}". Paiement total sécurisé par Shongre.`,
    getDestination: () => "/compte/achats",
    getActions: () => [
      {
        id: "prepare_order",
        label: "Préparer la commande",
        destination: "/compte/achats",
        variant: "primary",
      },
    ],
  },

  "order.confirmed": {
    type: "order.confirmed",
    category: "transactions",
    defaultPriority: "normal",
    isMandatory: true,
    getTitle: () => "Votre commande est confirmée !",
    getBody: (ctx) =>
      `Votre paiement pour "${ctx?.listingTitle || "votre commande"}" a été placé sous séquestre sécurisé.`,
    getDestination: () => "/compte/achats",
    getActions: () => [
      {
        id: "track_order",
        label: "Suivre ma commande",
        destination: "/compte/achats",
        variant: "primary",
      },
    ],
  },

  "order.cancelled": {
    type: "order.cancelled",
    category: "transactions",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Commande annulée",
    getBody: (ctx) =>
      `La commande pour "${ctx?.listingTitle || "votre article"}" a été annulée.`,
    getDestination: () => "/compte/achats",
  },

  "order.completed": {
    type: "order.completed",
    category: "transactions",
    defaultPriority: "normal",
    getTitle: () => "Transaction terminée avec succès",
    getBody: (ctx) =>
      `La transaction pour "${ctx?.listingTitle || "votre article"}" est finalisée. Merci pour votre confiance !`,
    getDestination: () => "/compte/achats",
  },

  // 5. Escrow & Payments
  "payment.secured": {
    type: "payment.secured",
    category: "transactions",
    defaultPriority: "normal",
    isMandatory: true,
    getTitle: () => "Paiement sous séquestre validé",
    getBody: (ctx) =>
      `Les fonds (${ctx?.amount ? `${formatPrice(ctx.amount)}` : "sécurisés"}) sont protégés sur le compte de séquestre Shongre.`,
    getDestination: () => "/compte/achats",
  },

  "payment.failed": {
    type: "payment.failed",
    category: "transactions",
    defaultPriority: "critical",
    isMandatory: true,
    getTitle: () => "Échec du paiement",
    getBody: () =>
      "Une tentative de paiement a échoué. Veuillez vérifier votre carte ou moyen de paiement.",
    getDestination: () => "/compte/achats",
    getActions: () => [
      {
        id: "retry_payment",
        label: "Mettre à jour le paiement",
        destination: "/compte/achats",
        variant: "primary",
      },
    ],
  },

  "payment.released": {
    type: "payment.released",
    category: "transactions",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Fonds débloqués vers votre compte !",
    getBody: (ctx) =>
      `Le virement de ${ctx?.amount ? formatPrice(ctx.amount) : "votre vente"} a été ordonné vers votre compte bancaire.`,
    getDestination: () => "/compte/achats",
  },

  "payment.refunded": {
    type: "payment.refunded",
    category: "transactions",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Remboursement effectué",
    getBody: (ctx) =>
      `Le remboursement de ${ctx?.amount ? formatPrice(ctx.amount) : "votre achat"} a été crédité sur votre moyen de paiement initial.`,
    getDestination: () => "/compte/achats",
  },

  // 6. Fulfillment
  "fulfillment.pickup_scheduled": {
    type: "fulfillment.pickup_scheduled",
    category: "delivery",
    defaultPriority: "normal",
    getTitle: () => "Rendez-vous de remise fixé",
    getBody: (ctx) =>
      `Un créneau de remise en main propre a été convenu pour "${ctx?.listingTitle || "l'article"}".`,
    getDestination: () => "/compte/achats",
  },

  "fulfillment.shipped": {
    type: "fulfillment.shipped",
    category: "delivery",
    defaultPriority: "normal",
    getTitle: () => "Votre colis a été expédié !",
    getBody: (ctx) =>
      `Le vendeur a expédié votre colis pour "${ctx?.listingTitle || "votre commande"}".`,
    getDestination: () => "/compte/achats",
    getActions: () => [
      {
        id: "track_pkg",
        label: "Suivre le colis",
        destination: "/compte/achats",
        variant: "primary",
      },
    ],
  },

  "fulfillment.delivered": {
    type: "fulfillment.delivered",
    category: "delivery",
    defaultPriority: "high",
    getTitle: () => "Colis livré !",
    getBody: (ctx) =>
      `Votre colis pour "${ctx?.listingTitle || "votre commande"}" a été livré. Veuillez confirmer la réception.`,
    getDestination: () => "/compte/achats",
    getActions: () => [
      {
        id: "confirm_rcpt",
        label: "Confirmer la réception",
        destination: "/compte/achats",
        variant: "primary",
      },
    ],
  },

  "fulfillment.receipt_required": {
    type: "fulfillment.receipt_required",
    category: "delivery",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Confirmation requise pour libérer les fonds",
    getBody: () =>
      "Veuillez confirmer que vous avez bien reçu votre article ou déclarer un problème sous 48h.",
    getDestination: () => "/compte/achats",
  },

  // 7. Reviews
  "review.available": {
    type: "review.available",
    category: "reviews",
    defaultPriority: "normal",
    getTitle: () => "Donnez votre avis sur votre expérience",
    getBody: (ctx) =>
      `Votre avis sur la transaction "${ctx?.listingTitle || ""}" aide toute la communauté Shongre !`,
    getDestination: () => "/compte/achats",
    getActions: () => [
      {
        id: "leave_review",
        label: "Laisser une évaluation",
        destination: "/compte/achats",
        variant: "primary",
      },
    ],
  },

  "review.received": {
    type: "review.received",
    category: "reviews",
    defaultPriority: "normal",
    getTitle: () => "Vous avez reçu une nouvelle évaluation !",
    getBody: (ctx) =>
      `${ctx?.reviewerName || "Un membre"} vous a attribué une note de ${ctx?.rating || 5}/5 étoiles.`,
    getDestination: () => "/compte/profil",
  },

  // 8. Seller Verification & Pro Plans
  "seller.verification_required": {
    type: "seller.verification_required",
    category: "account",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Vérification d'identité requise",
    getBody: () =>
      "Pour débloquer vos plafonds de vente et sécuriser vos virements, vérifiez votre profil.",
    getDestination: () => "/compte/profil",
    getActions: () => [
      {
        id: "verify_id",
        label: "Vérifier mon identité",
        destination: "/compte/profil",
        variant: "primary",
      },
    ],
  },

  "seller.verified": {
    type: "seller.verified",
    category: "account",
    defaultPriority: "normal",
    getTitle: () => "Votre profil est vérifié !",
    getBody: () =>
      "Félicitations, votre badge vérifié est maintenant visible sur toutes vos annonces.",
    getDestination: () => "/compte/profil",
  },

  "subscription.started": {
    type: "subscription.started",
    category: "monetization",
    defaultPriority: "normal",
    getTitle: () => "Forfait Pro activé !",
    getBody: (ctx) =>
      `Votre abonnement ${ctx?.planName || "Pro"} est actif. Profitez de votre vitrine et de vos outils avancés.`,
    getDestination: () => "/compte/pro/tableau-de-bord",
  },

  "subscription.renewal_upcoming": {
    type: "subscription.renewal_upcoming",
    category: "monetization",
    defaultPriority: "low",
    getTitle: () => "Renouvellement de votre forfait Pro",
    getBody: (ctx) =>
      `Votre abonnement sera renouvelé le ${ctx?.renewalDate || "prochainement"}.`,
    getDestination: () => "/compte/pro/abonnements",
  },

  "subscription.payment_failed": {
    type: "subscription.payment_failed",
    category: "monetization",
    defaultPriority: "critical",
    isMandatory: true,
    getTitle: () => "Échec du prélèvement Pro",
    getBody: () =>
      "Le prélèvement de votre abonnement Pro a échoué. Mettez à jour vos coordonnées bancaires pour éviter la suspension de votre vitrine.",
    getDestination: () => "/compte/pro/abonnements",
    getActions: () => [
      {
        id: "fix_billing",
        label: "Mettre à jour la facturation",
        destination: "/compte/pro/abonnements",
        variant: "primary",
      },
    ],
  },

  "subscription.cancelled": {
    type: "subscription.cancelled",
    category: "monetization",
    defaultPriority: "normal",
    getTitle: () => "Abonnement Pro résilié",
    getBody: () =>
      "Votre forfait Pro prendra fin à la date d'échéance en cours.",
    getDestination: () => "/compte/pro/abonnements",
  },

  // 9. Promotions
  "promotion.started": {
    type: "promotion.started",
    category: "monetization",
    defaultPriority: "low",
    getTitle: () => "Votre boost d'annonce est actif !",
    getBody: (ctx) =>
      `Votre annonce "${ctx?.listingTitle || ""}" bénéficie de sa mise en avant prioritaire.`,
    getDestination: () => "/compte/annonces",
  },

  "promotion.expiring": {
    type: "promotion.expiring",
    category: "monetization",
    defaultPriority: "low",
    getTitle: () => "Votre mise en avant se termine bientôt",
    getBody: (ctx) =>
      `Le boost pour "${ctx?.listingTitle || ""}" expire dans 24 heures.`,
    getDestination: () => "/compte/annonces",
  },

  "promotion.ended": {
    type: "promotion.ended",
    category: "monetization",
    defaultPriority: "low",
    getTitle: () => "Fin de la mise en avant",
    getBody: (ctx) =>
      `Le boost pour "${ctx?.listingTitle || ""}" est arrivé à son terme.`,
    getDestination: () => "/compte/annonces",
  },

  // 10. Security
  "security.password_changed": {
    type: "security.password_changed",
    category: "security",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Mot de passe modifié",
    getBody: () =>
      "Le mot de passe de votre compte Shongre a été modifié avec succès. Si vous n'êtes pas à l'origine de cette action, contactez le support.",
    getDestination: () => "/compte/profil",
  },

  "security.new_login": {
    type: "security.new_login",
    category: "security",
    defaultPriority: "normal",
    isMandatory: true,
    getTitle: () => "Nouvelle connexion détectée",
    getBody: () =>
      "Une connexion à votre compte a été effectuée depuis un nouvel appareil.",
    getDestination: () => "/compte/profil",
  },

  // 11. Moderation
  "moderation.report_assigned": {
    type: "moderation.report_assigned",
    category: "moderation",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Nouveau signalement assigné",
    getBody: (ctx) =>
      `Un signalement (#${ctx?.reportId || "N/A"}) requiert votre examen de modération.`,
    getDestination: () => "/admin/moderation",
    getActions: () => [
      {
        id: "mod_action",
        label: "Accéder à la modération",
        destination: "/admin/moderation",
        variant: "primary",
      },
    ],
  },

  "moderation.listing_flagged": {
    type: "moderation.listing_flagged",
    category: "moderation",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Annonce signalée en attente de vérification",
    getBody: (ctx) =>
      `L'annonce "${ctx?.listingTitle || ""}" a été temporairement masquée suite à un signalement.`,
    getDestination: () => "/compte/annonces",
  },

  "moderation.action_required": {
    type: "moderation.action_required",
    category: "moderation",
    defaultPriority: "high",
    isMandatory: true,
    getTitle: () => "Action de modération requise",
    getBody: () =>
      "Une action est requise concernant votre compte ou une de vos annonces.",
    getDestination: () => "/compte/profil",
  },
};

export class NotificationCatalogService {
  /**
   * Constructs a canonical Notification object from a domain event.
   */
  createNotificationFromEvent(params: {
    type: NotificationType;
    recipientId: string;
    context?: NotificationContext;
    overrides?: Partial<Notification>;
  }): Notification {
    const { type, recipientId, context, overrides } = params;
    const template = NOTIFICATION_TEMPLATES[type];

    if (!template) {
      return {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type,
        category: "system",
        recipientId,
        title: "Information Shongre",
        body: "Vous avez reçu une nouvelle mise à jour.",
        createdAt: new Date().toISOString(),
        priority: "normal",
        context,
        status: "unread",
        isRead: false,
        ...overrides,
      };
    }

    const title = overrides?.title || template.getTitle(context);
    const body = overrides?.body || template.getBody(context);
    const priority = overrides?.priority || template.defaultPriority;
    const actions =
      overrides?.actions ||
      (template.getActions ? template.getActions(context) : undefined);

    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      category: template.category,
      recipientId,
      title,
      body,
      createdAt: new Date().toISOString(),
      priority,
      context,
      actions,
      status: "unread",
      isRead: false,
      ...overrides,
    };
  }

  /**
   * Resolves the deep-link destination for a given notification.
   */
  resolveDestination(notification: Notification): string {
    if (
      notification.actions &&
      notification.actions.length > 0 &&
      notification.actions[0].destination
    ) {
      return notification.actions[0].destination;
    }

    const template = NOTIFICATION_TEMPLATES[notification.type];
    if (template) {
      return template.getDestination(notification.context);
    }

    return "/compte/notifications";
  }
}

export const notificationCatalogService = new NotificationCatalogService();
