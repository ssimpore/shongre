import type { PropertyPublic } from "@shongre/contracts/real-estate";

export const formatImmoMoney = (
  money: { amountMinor: number; currency: string },
  locale = "fr-FR",
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amountMinor / 100);

export const propertyTypeLabels: Record<PropertyPublic["propertyType"], string> = {
  apartment: "Appartement",
  house: "Maison",
  land: "Terrain",
  parking_garage: "Parking ou garage",
  commercial: "Local commercial",
  office: "Bureau",
  building: "Immeuble",
  new_development: "Programme neuf",
  holiday_rental: "Location saisonnière",
  room_shared: "Chambre ou colocation",
  other: "Autre bien",
};

export const transactionLabels: Record<
  PropertyPublic["transactionType"],
  string
> = {
  sale: "Vente",
  long_term_rental: "Location",
  seasonal_rental: "Location saisonnière",
  shared_accommodation: "Colocation",
  life_annuity: "Viager",
  other: "Autre projet",
};

export const pricePeriodSuffix: Record<
  PropertyPublic["financials"]["period"],
  string
> = {
  total: "",
  month: " / mois",
  week: " / semaine",
  night: " / nuit",
};

