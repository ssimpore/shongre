export interface TransactionConfig {
  sellerConfirmationTimeoutHours: number;
  buyerInspectionWindowHours: number;
  pickupSchedulingTimeoutDays: number;
  verificationCodeLength: number;
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
  verificationCodeLength: 6,
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
