import { translate } from "../../i18n/i18n.service";
import type { MessageKey } from "../../i18n/messages.fr";
import { activeDataLocale } from "../../i18n/localized";

const FIELD_LABEL_KEYS: Readonly<Record<string, MessageKey>> = {
  brand: "listing.field.brand",
  model: "listing.field.model",
  year: "listing.field.year",
  model_year: "listing.field.year",
  mileage: "listing.field.mileage",
  fuel: "listing.field.fuel",
  fuel_type: "listing.field.fuel",
  gearbox: "listing.field.gearbox",
  transmission: "listing.field.gearbox",
  critair: "listing.field.critair",
  critair_class: "listing.field.critair",
};

export function normalizeListingFieldKey(key: string): string {
  return key
    .replace(
      /^(product|vehicle|real_estate|electronics|home|fashion|service|job)\./,
      "",
    )
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export function getListingFieldLabel(key: string): string | undefined {
  const messageKey = FIELD_LABEL_KEYS[normalizeListingFieldKey(key)];
  return messageKey ? translate(messageKey, activeDataLocale()) : undefined;
}
