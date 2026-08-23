const PRESENTATION: Record<string, { label: string; unit: string }> = {
  maxActiveListings: { label: "Annonces actives", unit: "annonces" },
  maxActiveVehicles: { label: "Véhicules actifs", unit: "véhicules" },
  maxActiveJobs: { label: "Offres actives", unit: "offres" },
  maxActiveOffers: { label: "Cours actifs", unit: "cours" },
  maxMonthlyPublications: {
    label: "Publications ce mois",
    unit: "publications",
  },
  maxPhotosPerListing: { label: "Photos par annonce", unit: "photos" },
  maxPhotosPerVehicle: { label: "Photos par véhicule", unit: "photos" },
  maxPhotosPerCourse: { label: "Photos par cours", unit: "photos" },
  maxMedia: { label: "Médias par annonce", unit: "médias" },
  maxVideosPerListing: { label: "Vidéos par annonce", unit: "vidéos" },
  maxVideosPerVehicle: { label: "Vidéos par véhicule", unit: "vidéos" },
  maxVirtualToursPerListing: {
    label: "Visites virtuelles par annonce",
    unit: "visites",
  },
  teamMembers: { label: "Membres d’équipe", unit: "membres" },
  maxTeamMembers: { label: "Membres d’équipe", unit: "membres" },
  maxRecruiterSeats: { label: "Sièges recruteur", unit: "sièges" },
  locations: { label: "Établissements", unit: "établissements" },
  maxLocations: { label: "Établissements", unit: "établissements" },
  maxMonthlyLeads: { label: "Demandes ce mois", unit: "demandes" },
  monthlyBumpCredits: { label: "Crédits de remontée", unit: "crédits" },
  monthlyPromotionCredits: {
    label: "Crédits de visibilité",
    unit: "crédits",
  },
  includedPromotionCredits: {
    label: "Crédits de visibilité",
    unit: "crédits",
  },
  visibilityCreditsMonthly: {
    label: "Crédits de visibilité",
    unit: "crédits",
  },
};

/** Presentation metadata only; commercial limits remain catalog data. */
export function getBillingUsagePresentation(key: string) {
  return PRESENTATION[key];
}
