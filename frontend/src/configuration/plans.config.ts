export interface ProPlan {
  id: "free" | "pro_starter" | "pro_business" | "pro_enterprise";
  name: string;
  tagline: string;
  monthlyPrice: number; // in EUR HT
  annualPriceMonthlyEquivalent: number;
  maxActiveListings: number;
  photosPerListing: number;
  storefrontCustomization: boolean;
  prioritySupport: boolean;
  analyticsLevel: "basic" | "standard" | "advanced" | "enterprise";
  verifiedBadge: boolean;
  automaticRelisting: boolean;
  bulkImportExport: boolean;
  isPopular?: boolean;
  features: string[];
}

export const PRO_PLANS: ProPlan[] = [
  {
    id: "free",
    name: "Particulier",
    tagline: "Pour vendre et acheter en toute simplicité",
    monthlyPrice: 0,
    annualPriceMonthlyEquivalent: 0,
    maxActiveListings: 15,
    photosPerListing: 8,
    storefrontCustomization: false,
    prioritySupport: false,
    analyticsLevel: "basic",
    verifiedBadge: false,
    automaticRelisting: false,
    bulkImportExport: false,
    features: [
      "Jusqu'à 15 annonces actives simultanément",
      "Paiement sécurisé et livraison intégrée",
      "Messagerie directe acheteur/vendeur",
      "Statistiques de vues et favoris",
      "Protection acheteurs Shongre",
    ],
  },
  {
    id: "pro_starter",
    name: "Pro Découverte",
    tagline: "Idéal pour les auto-entrepreneurs et artisans débutants",
    monthlyPrice: 29,
    annualPriceMonthlyEquivalent: 24,
    maxActiveListings: 50,
    photosPerListing: 15,
    storefrontCustomization: true,
    prioritySupport: false,
    analyticsLevel: "standard",
    verifiedBadge: true,
    automaticRelisting: true,
    bulkImportExport: false,
    features: [
      "Jusqu'à 50 annonces en ligne",
      "Badge Pro & Vérification SIRET/TVA",
      "Vitrine boutique personnalisable",
      "15 photos HD par annonce",
      "Statistiques de consultation détaillées",
      "Remontée automatique 1x / mois",
    ],
  },
  {
    id: "pro_business",
    name: "Pro Performance",
    tagline: "Pour les commerçants, concessions et professionnels actifs",
    monthlyPrice: 79,
    annualPriceMonthlyEquivalent: 65,
    maxActiveListings: 250,
    photosPerListing: 20,
    storefrontCustomization: true,
    prioritySupport: true,
    analyticsLevel: "advanced",
    verifiedBadge: true,
    automaticRelisting: true,
    bulkImportExport: true,
    isPopular: true,
    features: [
      "Jusqu'à 250 annonces actives",
      "Vitrine Pro enrichie avec logo, bannière, horaires",
      "Import/export catalogue CSV / XML",
      "Gestionnaire de leads & réponses rapides",
      "Tableau de bord de rentabilité avancé",
      "Support dédié prioritaire par téléphone/chat",
      "3 boosts offerts chaque mois",
    ],
  },
  {
    id: "pro_enterprise",
    name: "Pro Envergure",
    tagline: "Grands comptes, réseaux multi-boutiques et concessionnaires",
    monthlyPrice: 199,
    annualPriceMonthlyEquivalent: 169,
    maxActiveListings: 2000,
    photosPerListing: 25,
    storefrontCustomization: true,
    prioritySupport: true,
    analyticsLevel: "enterprise",
    verifiedBadge: true,
    automaticRelisting: true,
    bulkImportExport: true,
    features: [
      "Volume sur mesure (jusqu'à 2000+ annonces)",
      "Accès API passerelle de publication automatisée",
      "Comptes multi-utilisateurs & permissions d'équipe",
      "Bannière publicitaire sponsorisée régionale",
      "Account Manager dédié",
      "Remise sur les packs de visibilité et boosts",
    ],
  },
];

export interface ListingBoostOption {
  id: "urgent" | "highlight" | "top_of_list" | "gallery_boost";
  name: string;
  description: string;
  durationDays: number;
  priceEur: number;
  badgeLabel: string;
  multiplierEstimate: string;
}

export const LISTING_BOOSTS: ListingBoostOption[] = [
  {
    id: "urgent",
    name: "Badge Urgent",
    description:
      'Affiche un macaron "Urgent" attirant immédiatement l\'attention dans les résultats.',
    durationDays: 7,
    priceEur: 3.5,
    badgeLabel: "Urgent",
    multiplierEstimate: "x2 contacts",
  },
  {
    id: "top_of_list",
    name: "Remontée en tête de liste",
    description:
      "Remonte votre annonce tout en haut des résultats de recherche chaque jour pendant 7 jours.",
    durationDays: 7,
    priceEur: 6.9,
    badgeLabel: "À la une",
    multiplierEstimate: "x4 contacts",
  },
  {
    id: "highlight",
    name: "Cadre Terracotta Vedette",
    description:
      "Bordure terracotta distinctive et fond contrasté pour émerger des autres annonces.",
    durationDays: 14,
    priceEur: 8.5,
    badgeLabel: "En vedette",
    multiplierEstimate: "x3.5 contacts",
  },
  {
    id: "gallery_boost",
    name: "Pack Visibilité Intégrale",
    description:
      "Encart grand format sur la page d'accueil + remontée quotidienne + badge urgent.",
    durationDays: 14,
    priceEur: 14.9,
    badgeLabel: "Sponsorisé",
    multiplierEstimate: "x7 contacts",
  },
];
