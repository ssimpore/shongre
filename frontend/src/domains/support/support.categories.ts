/**
 * SHONGRE SUPPORT CATEGORIES & REASONS REGISTRY
 * Authoritative registry defining topics, hierarchical reasons, self-service tips,
 * and canonical handoffs for disputes, reports, and messaging.
 */

import { SupportCategory, SupportPriority } from "./support.types";

export interface SupportReasonDefinition {
  id: string;
  label: string;
  helpTip?: string;
  defaultPriority?: SupportPriority;
  isDisputeHandoff?: boolean;
  isReportHandoff?: boolean;
  isMessagingHandoff?: boolean;
}

export interface SupportCategoryDefinition {
  id: SupportCategory;
  label: string;
  description: string;
  iconName: string;
  reasons: SupportReasonDefinition[];
}

export const SUPPORT_CATEGORIES: SupportCategoryDefinition[] = [
  {
    id: "account",
    label: "Mon compte & Connexion",
    description:
      "Difficultés de connexion, mot de passe, vérification d'email ou profil.",
    iconName: "User",
    reasons: [
      {
        id: "account_login_issue",
        label: "Impossible de me connecter à mon compte",
        helpTip:
          "Vous pouvez utiliser la procédure de réinitialisation de mot de passe par email.",
        defaultPriority: "normal",
      },
      {
        id: "account_verification_issue",
        label: "Problème avec la vérification d'email ou de téléphone",
        defaultPriority: "normal",
      },
      {
        id: "account_modify_details",
        label: "Modifier mes coordonnées ou mon statut",
        defaultPriority: "low",
      },
      {
        id: "account_deletion_request",
        label: "Demande de suppression de compte (RGPD)",
        defaultPriority: "normal",
      },
      {
        id: "account_other",
        label: "Autre question sur mon compte",
        defaultPriority: "normal",
      },
    ],
  },

  {
    id: "listing",
    label: "Mes annonces & Publication",
    description:
      "Aide à la publication, modification, rejet ou expiration d'annonce.",
    iconName: "Tag",
    reasons: [
      {
        id: "listing_cannot_publish",
        label: "Impossible de publier une annonce (erreur formulaire)",
        helpTip:
          "Vérifiez que tous les champs obligatoires et au moins une photo sont renseignés.",
        defaultPriority: "normal",
      },
      {
        id: "listing_rejected_appeal",
        label: "Mon annonce a été refusée ou suspendue",
        helpTip:
          "Consultez le motif de refus dans vos notifications avant de solliciter le support.",
        defaultPriority: "normal",
      },
      {
        id: "listing_category_taxonomy",
        label: "Je ne trouve pas la bonne catégorie pour mon objet",
        defaultPriority: "low",
      },
      {
        id: "listing_boost_issue",
        label: "Problème avec une mise en avant / boost payé",
        defaultPriority: "high",
      },
      {
        id: "listing_other",
        label: "Autre question sur une annonce",
        defaultPriority: "normal",
      },
    ],
  },

  {
    id: "purchase",
    label: "Un achat ou une commande",
    description:
      "Suivi de commande, confirmation d'achat direct ou question acheteur.",
    iconName: "ShoppingBag",
    reasons: [
      {
        id: "purchase_status_inquiry",
        label: "Où en est ma commande ?",
        helpTip:
          "Vous pouvez suivre l'état d'expédition directement depuis « Mes achats ».",
        defaultPriority: "normal",
      },
      {
        id: "purchase_contact_seller",
        label: "Contacter le vendeur de l'article",
        helpTip:
          "Pour échanger avec le vendeur, utilisez directement la messagerie intégrée.",
        isMessagingHandoff: true,
      },
      {
        id: "purchase_item_not_received",
        label: "Article non reçu ou non conforme (Litige)",
        helpTip:
          "Pour bloquer les fonds sous séquestre, ouvrez un litige formel depuis la commande.",
        isDisputeHandoff: true,
        defaultPriority: "high",
      },
      {
        id: "purchase_cancel_request",
        label: "Annuler ma commande",
        defaultPriority: "normal",
      },
      {
        id: "purchase_other",
        label: "Autre question sur un achat",
        defaultPriority: "normal",
      },
    ],
  },

  {
    id: "sale",
    label: "Une vente ou réservation reçue",
    description:
      "Gestion d'une commande reçue, remise en main propre ou libération des fonds.",
    iconName: "DollarSign",
    reasons: [
      {
        id: "sale_funds_not_released",
        label: "Quand mes fonds seront-ils versés ?",
        helpTip:
          "Les fonds sont débloqués dès confirmation de réception conforme ou validation du code PIN.",
        defaultPriority: "normal",
      },
      {
        id: "sale_buyer_absent",
        label: "L'acheteur ne s'est pas présenté au rendez-vous",
        defaultPriority: "high",
      },
      {
        id: "sale_shipping_label_issue",
        label: "Problème pour générer ou imprimer le bordereau",
        defaultPriority: "high",
      },
      {
        id: "sale_other",
        label: "Autre question sur une vente",
        defaultPriority: "normal",
      },
    ],
  },

  {
    id: "payment",
    label: "Paiement & Remboursement",
    description:
      "Paiement refusé, carte bancaire, séquestre ou remboursement en attente.",
    iconName: "CreditCard",
    reasons: [
      {
        id: "payment_refused",
        label: "Mon paiement par carte est refusé",
        helpTip:
          "Vérifiez la validation 3D Secure sur votre application bancaire.",
        defaultPriority: "normal",
      },
      {
        id: "payment_debited_unconfirmed",
        label: "Paiement débité mais commande non validée",
        defaultPriority: "high",
      },
      {
        id: "payment_refund_delay",
        label: "Délai d'un remboursement sous séquestre",
        helpTip:
          "Les remboursements bancaires prennent généralement 2 à 4 jours ouvrés.",
        defaultPriority: "normal",
      },
      {
        id: "payment_other",
        label: "Autre question paiement",
        defaultPriority: "normal",
      },
    ],
  },

  {
    id: "delivery",
    label: "Livraison & Expédition",
    description: "Suivi de colis, Mondial Relay, Colissimo ou colis endommagé.",
    iconName: "Truck",
    reasons: [
      {
        id: "delivery_tracking_stuck",
        label: "Le suivi du colis ne s'actualise plus",
        defaultPriority: "normal",
      },
      {
        id: "delivery_relay_closed",
        label: "Le point relais de destination est indisponible",
        defaultPriority: "normal",
      },
      {
        id: "delivery_damaged_package",
        label: "Colis reçu endommagé ou détérioré",
        defaultPriority: "high",
      },
      {
        id: "delivery_other",
        label: "Autre question livraison",
        defaultPriority: "normal",
      },
    ],
  },

  {
    id: "pro_account",
    label: "Compte Pro & Facturation",
    description:
      "Vérification SIRET, forfait Pro, factures ou outils boutique.",
    iconName: "Briefcase",
    reasons: [
      {
        id: "pro_siret_verification",
        label: "Vérification de mon entreprise / SIRET en attente",
        defaultPriority: "normal",
      },
      {
        id: "pro_billing_invoice",
        label: "Question sur une facture ou prélèvement d'abonnement",
        defaultPriority: "normal",
      },
      {
        id: "pro_storefront_setup",
        label: "Assistance personnalisation de ma vitrine Pro",
        defaultPriority: "low",
      },
      {
        id: "pro_other",
        label: "Autre demande professionnelle",
        defaultPriority: "normal",
      },
    ],
  },

  {
    id: "safety",
    label: "Sécurité, Fraude & Signalement",
    description: "Tentative d'escroquerie, phishing ou comportement abusif.",
    iconName: "ShieldAlert",
    reasons: [
      {
        id: "safety_phishing_report",
        label: "J'ai reçu un message ou lien suspect (Phishing)",
        helpTip:
          "Ne communiquez jamais vos coordonnées bancaires ou codes SMS.",
        defaultPriority: "urgent",
      },
      {
        id: "safety_report_user",
        label: "Signaler une annonce illégale ou un utilisateur abusif",
        helpTip:
          "Vous pouvez utiliser le bouton « Signaler » directement sur l'annonce ou la conversation.",
        isReportHandoff: true,
        defaultPriority: "high",
      },
      {
        id: "safety_account_compromised",
        label: "Mon compte a peut-être été piraté",
        defaultPriority: "urgent",
      },
      {
        id: "safety_other",
        label: "Autre problème de sécurité",
        defaultPriority: "high",
      },
    ],
  },

  {
    id: "other",
    label: "Autre demande ou suggestion",
    description:
      "Partenariat, presse, question générale ou retour d'expérience.",
    iconName: "HelpCircle",
    reasons: [
      {
        id: "general_question",
        label: "Question générale sur le fonctionnement de Shongre",
        defaultPriority: "normal",
      },
      {
        id: "partnership_press",
        label: "Contact Presse, Partenariat ou Commercial",
        defaultPriority: "low",
      },
      {
        id: "feedback_suggestion",
        label: "Suggestion d'amélioration ou retour produit",
        defaultPriority: "low",
      },
    ],
  },
];

export class SupportCategoriesService {
  getCategory(
    categoryId: SupportCategory,
  ): SupportCategoryDefinition | undefined {
    return SUPPORT_CATEGORIES.find((c) => c.id === categoryId);
  }

  getReason(
    categoryId: SupportCategory,
    reasonId: string,
  ): SupportReasonDefinition | undefined {
    const category = this.getCategory(categoryId);
    return category?.reasons.find((r) => r.id === reasonId);
  }

  getAllCategories(): SupportCategoryDefinition[] {
    return SUPPORT_CATEGORIES;
  }
}

export const supportCategoriesService = new SupportCategoriesService();
