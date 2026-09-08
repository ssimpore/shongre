import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";
import type { AutoCatalog, VehiclePublic } from "@shongre/contracts/auto";
import type { Money } from "@shongre/contracts";
import {
  formatProjectedMoney,
  type MoneyDisplayConverter,
} from "../../utilities/formatters";

export function formatAutoMoney(
  money: Money,
  locale: string,
  convertMoney?: MoneyDisplayConverter,
) {
  return formatProjectedMoney(money, { locale, convertMoney });
}

export function formatAutoMileage(vehicle: VehiclePublic, locale: string) {
  return `${new Intl.NumberFormat(locale).format(vehicle.technical.mileage)} ${vehicle.technical.mileageUnit}`;
}

export function formatAutoField(
  vehicle: VehiclePublic,
  code: string,
  locale: string,
) {
  const field = vehicle.taxonomy?.detailCharacteristics?.find(
    (row) => row.code === code,
  );
  return localizeTaxonomyLabels(field?.values, locale) || "—";
}

export function autoOptions(
  catalog: AutoCatalog,
  optionSetId: string,
  locale: string,
) {
  return (catalog.taxonomyOptions.optionSets[optionSetId] ?? []).map(
    (option) => ({
      value: option.key,
      label: localizeTaxonomyLabels(option.labels, locale),
    }),
  );
}
