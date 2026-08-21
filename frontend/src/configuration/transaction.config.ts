export interface TransactionConfig {
  sellerConfirmationTimeoutHours: number;
  buyerInspectionWindowHours: number;
  pickupSchedulingTimeoutDays: number;
  buyerProtectionRate: number; // e.g. 0.04 (4%)
  buyerProtectionFixedCents: number; // e.g. 70 (0.70 EUR)
  platformCommissionRate: number; // e.g. 0.03 (3% for pro sellers)
  instantPayoutFeeCents: number; // e.g. 90 (0.90 EUR)
  standardPayoutFeeCents: number; // 0 EUR
  minTransactionAmountCents: number; // 100 (1.00 EUR)
  maxTransactionAmountCents: number; // 1500000 (15,000.00 EUR)
  verificationCodeLength: number;
  deliveryMethods: {
    id: "hand_delivery" | "relay_point" | "home_delivery";
    name: string;
    description: string;
    defaultPriceCents: number;
    carriers: string[];
    requiresPinCode: boolean;
  }[];
  disputeReasons: {
    id: string;
    label: string;
    description: string;
    recommendedAction: "refund" | "investigate" | "payout";
  }[];
  cancellationReasons: {
    id: string;
    label: string;
  }[];
}

export const TRANSACTION_CONFIG: TransactionConfig = {
  sellerConfirmationTimeoutHours: 48,
  buyerInspectionWindowHours: 48,
  pickupSchedulingTimeoutDays: 7,
  buyerProtectionRate: 0.04, // 4%
  buyerProtectionFixedCents: 70, // 0.70 €
  platformCommissionRate: 0.03, // 3%
  instantPayoutFeeCents: 90, // 0.90 €
  standardPayoutFeeCents: 0,
  minTransactionAmountCents: 100, // 1.00 €
  maxTransactionAmountCents: 1500000, // 15 000.00 €
  verificationCodeLength: 6,
  deliveryMethods: [
    {
      id: "hand_delivery",
      name: "Remise en main propre",
      description:
        "Échange physique sécurisé avec validation par code secret à 6 chiffres.",
      defaultPriceCents: 0,
      carriers: ["Remise directe"],
      requiresPinCode: true,
    },
    {
      id: "relay_point",
      name: "Point Relais (Mondial Relay / Shop2Shop)",
      description:
        "Dépôt et retrait en point commerçant avec étiquette prépayée et suivi colis.",
      defaultPriceCents: 490, // 4.90 €
      carriers: ["Mondial Relay", "Shop2Shop by Chronopost", "Relais Colis"],
      requiresPinCode: false,
    },
    {
      id: "home_delivery",
      name: "Livraison à domicile (Colissimo)",
      description:
        "Livraison directement chez l'acheteur en 48h avec signature et assurance.",
      defaultPriceCents: 690, // 6.90 €
      carriers: ["Colissimo La Poste", "Chronopost Express"],
      requiresPinCode: false,
    },
  ],
  disputeReasons: [
    {
      id: "not_received",
      label: "Article non reçu",
      description:
        "Le colis n'a pas été livré ou le vendeur ne s'est pas présenté au rendez-vous.",
      recommendedAction: "investigate",
    },
    {
      id: "damaged",
      label: "Article endommagé ou détérioré",
      description:
        "L'objet est arrivé cassé ou présente des dommages matériels non mentionnés.",
      recommendedAction: "refund",
    },
    {
      id: "not_as_described",
      label: "Non conforme à la description",
      description:
        "L'article ne correspond pas aux photos, à la taille ou aux caractéristiques annoncées.",
      recommendedAction: "investigate",
    },
    {
      id: "counterfeit",
      label: "Suspicion de contrefaçon",
      description:
        "L'article semble être une contrefaçon ou n'est pas un produit authentique.",
      recommendedAction: "refund",
    },
    {
      id: "seller_no_show",
      label: "Absence du vendeur au rendez-vous",
      description:
        "Le vendeur ne s'est pas présenté au lieu convenu pour la remise.",
      recommendedAction: "refund",
    },
    {
      id: "buyer_no_show",
      label: "Absence de l'acheteur au rendez-vous",
      description:
        "L'acheteur ne s'est pas présenté au lieu convenu pour la remise.",
      recommendedAction: "investigate",
    },
    {
      id: "other",
      label: "Autre motif",
      description:
        "Autre motif spécifique nécessitant l'arbitrage du service client.",
      recommendedAction: "investigate",
    },
  ],
  cancellationReasons: [
    { id: "buyer_request", label: "Changement d'avis de l'acheteur" },
    {
      id: "seller_unavailable",
      label: "Indisponibilité du vendeur ou de l'objet",
    },
    {
      id: "schedule_conflict",
      label: "Impossibilité de trouver un créneau de remise",
    },
    {
      id: "mutual_agreement",
      label: "Accord mutuel entre acheteur et vendeur",
    },
    { id: "other", label: "Autre raison" },
  ],
};
