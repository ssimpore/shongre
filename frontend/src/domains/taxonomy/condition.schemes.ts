/**
 * SHONGRE MARKETPLACE CONDITION SCHEMES
 * Category-specific condition options and definitions.
 */

import { ConditionSchemeId, ConditionOption } from "./taxonomy.types";

export const CONDITION_SCHEMES: Record<ConditionSchemeId, ConditionOption[]> = {
  consumer_product: [
    {
      value: "new_with_tag",
      label: "Neuf avec étiquette / emballage",
      description:
        "Article jamais utilisé, dans son emballage d'origine non ouvert ou avec étiquette.",
      labels: { "fr-FR": "Neuf avec étiquette", "en-US": "New with tags" },
    },
    {
      value: "like_new",
      label: "Comme neuf",
      description:
        "Article en parfait état esthétique et de marche, sans trace d'usure apparente.",
      labels: { "fr-FR": "Comme neuf", "en-US": "Like new" },
    },
    {
      value: "very_good",
      label: "Très bon état",
      description:
        "Article fonctionnel présentant de très légères traces d'usage minimes.",
      labels: { "fr-FR": "Très bon état", "en-US": "Very good" },
    },
    {
      value: "good",
      label: "Bon état",
      description:
        "Article parfaitement fonctionnel avec des marques d'usure visibles mais normales.",
      labels: { "fr-FR": "Bon état", "en-US": "Good" },
    },
    {
      value: "fair",
      label: "État satisfaisant",
      description:
        "Article présentant des défauts ou usures prononcées mais reste utilisable.",
      labels: { "fr-FR": "État satisfaisant", "en-US": "Fair" },
    },
    {
      value: "for_parts",
      label: "Pour pièces / Non fonctionnel",
      description:
        "Article hors d'usage, incomplet ou nécessitant une réparation importante.",
      labels: { "fr-FR": "Pour pièces", "en-US": "For parts" },
    },
  ],

  vehicle: [
    {
      value: "vehicle_new",
      label: "Neuf (0 km)",
      description:
        "Véhicule neuf, première main jamais immatriculé ou kilométrage de livraison.",
      labels: { "fr-FR": "Neuf (0 km)", "en-US": "New (0 km)" },
    },
    {
      value: "vehicle_excellent",
      label: "Excellent état / Comme neuf",
      description:
        "Entretien à jour chez concessionnaire, carrosserie et mécanique impeccables.",
      labels: { "fr-FR": "Excellent état", "en-US": "Excellent condition" },
    },
    {
      value: "vehicle_very_good",
      label: "Très bon état",
      description:
        "Contrôle technique valide, carnet d'entretien complet, légères traces d'usage.",
      labels: { "fr-FR": "Très bon état", "en-US": "Very good" },
    },
    {
      value: "vehicle_good",
      label: "Bon état",
      description:
        "Roulant et sécuritaire, entretien régulier, quelques défauts d'usage ou carrosserie.",
      labels: { "fr-FR": "Bon état", "en-US": "Good" },
    },
    {
      value: "vehicle_to_repair",
      label: "Réparations à prévoir / Non roulant",
      description:
        "Nécessite des réparations mécaniques ou de carrosserie, ou vendu en l'état.",
      labels: { "fr-FR": "À réparer", "en-US": "Needs repair" },
    },
    {
      value: "vehicle_vintage",
      label: "Véhicule de collection",
      description:
        "Véhicule d'époque restauré ou d'origine, éligible carte grise collection.",
      labels: {
        "fr-FR": "Véhicule de collection",
        "en-US": "Classic / Vintage",
      },
    },
  ],

  real_estate: [
    {
      value: "re_new",
      label: "Neuf / VEFA",
      description:
        "Programme neuf, frais de notaire réduits, garanties décennales et biennales.",
      labels: { "fr-FR": "Neuf / VEFA", "en-US": "New construction" },
    },
    {
      value: "re_renovated",
      label: "Rénové / Aucun travaux",
      description:
        "Rénovation récente de qualité, prêt à habiter immédiatement.",
      labels: { "fr-FR": "Rénové / Impeccable", "en-US": "Recently renovated" },
    },
    {
      value: "re_good",
      label: "Bon état général",
      description:
        "Bien entretenu, habitable sans travaux obligatoires immédiats.",
      labels: { "fr-FR": "Bon état", "en-US": "Good condition" },
    },
    {
      value: "re_to_refresh",
      label: "Travaux de rafraîchissement à prévoir",
      description:
        "Décoration et équipements à moderniser (peinture, sols, cuisine).",
      labels: { "fr-FR": "À rafraîchir", "en-US": "Needs updating" },
    },
    {
      value: "re_to_renovate",
      label: "Rénovation complète requise",
      description:
        "Gros travaux de rénovation, isolation, plomberie ou électricité nécessaires.",
      labels: {
        "fr-FR": "À rénover entièrement",
        "en-US": "Full renovation needed",
      },
    },
  ],

  collectible: [
    {
      value: "mint",
      label: "Parfait état (Mint) / Sous blister",
      description:
        "Objet sous scellé, sous blister d'origine ou certificat d'authenticité.",
      labels: { "fr-FR": "Parfait état (Mint)", "en-US": "Mint in box" },
    },
    {
      value: "near_mint",
      label: "Pratiquement neuf (Near Mint)",
      description:
        "Objet de collection avec boîte d'origine en état exceptionnel.",
      labels: { "fr-FR": "Pratiquement neuf", "en-US": "Near mint" },
    },
    {
      value: "good_vintage",
      label: "Bon état d'usage / Patine d'époque",
      description: "Belle patine du temps, complet et authentique sans casse.",
      labels: { "fr-FR": "Bon état / Patine", "en-US": "Vintage with patina" },
    },
    {
      value: "restoration_needed",
      label: "Restauration à prévoir",
      description:
        "Objet nécessitant l'intervention d'un artisan ou restaurateur d'art.",
      labels: { "fr-FR": "À restaurer", "en-US": "Restoration needed" },
    },
  ],

  professional: [
    {
      value: "pro_new_warranty",
      label: "Neuf sous garantie fabricant",
      description:
        "Matériel professionnel neuf jamais mis en service, facture et garantie pro.",
      labels: { "fr-FR": "Neuf garanti", "en-US": "New under warranty" },
    },
    {
      value: "pro_refurbished",
      label: "Reconditionné usine / Certifié",
      description:
        "Matériel révisé, testé avec pièces d'usure remplacées par des techniciens qualifiés.",
      labels: { "fr-FR": "Reconditionné pro", "en-US": "Factory refurbished" },
    },
    {
      value: "pro_good_working",
      label: "Très bon état de fonctionnement",
      description:
        "Matériel en exploitation régulière, entretenu selon les préconisations du constructeur.",
      labels: {
        "fr-FR": "En parfait état de marche",
        "en-US": "Good working condition",
      },
    },
    {
      value: "pro_overhaul_needed",
      label: "Révision / Entretien à prévoir",
      description:
        "Matériel fonctionnel mais nécessitant un passage à l'atelier ou pièces d'usure.",
      labels: {
        "fr-FR": "Révision à prévoir",
        "en-US": "Service / overhaul required",
      },
    },
  ],

  job: [
    {
      value: "job_open",
      label: "Poste à pourvoir immédiatement",
      description: "Recrutement ouvert et actif.",
      labels: { "fr-FR": "Ouvert", "en-US": "Immediate start" },
    },
    {
      value: "job_future",
      label: "Prise de poste différée / Future",
      description: "Démarrage prévu sous quelques mois ou rentrée scolaire.",
      labels: { "fr-FR": "Différé", "en-US": "Future opening" },
    },
  ],

  service: [
    {
      value: "service_available",
      label: "Prestation disponible",
      description: "Prestataire disponible pour devis et interventions.",
      labels: { "fr-FR": "Disponible", "en-US": "Available" },
    },
    {
      value: "service_on_quote",
      label: "Sur devis uniquement",
      description: "Tarif et faisabilité étudiés sur mesure.",
      labels: { "fr-FR": "Sur devis", "en-US": "Quote required" },
    },
  ],
};
