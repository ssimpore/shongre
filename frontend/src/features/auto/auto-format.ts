import type { VehiclePublic } from "@shongre/contracts/auto";
import type { Money } from "@shongre/contracts";

export function formatAutoMoney(money: Money, locale = "fr-FR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: money.amountMinor % 100 === 0 ? 0 : 2,
  }).format(money.amountMinor / 100);
}

export function formatAutoMileage(vehicle: VehiclePublic) {
  return `${new Intl.NumberFormat("fr-FR").format(vehicle.technical.mileage)} ${vehicle.technical.mileageUnit}`;
}

export const fuelLabels: Record<
  VehiclePublic["technical"]["fuelType"],
  string
> = {
  petrol: "Essence",
  diesel: "Diesel",
  electric: "Électrique",
  hybrid: "Hybride",
  plug_in_hybrid: "Hybride rechargeable",
  lpg: "GPL",
  hydrogen: "Hydrogène",
  other: "Autre",
};

export const transmissionLabels: Record<
  VehiclePublic["technical"]["transmission"],
  string
> = {
  manual: "Manuelle",
  automatic: "Automatique",
  semi_automatic: "Semi-automatique",
  other: "Autre",
};
