import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";
import type {
  RealEstateCatalog,
  PropertyPublic,
} from "@shongre/contracts/real-estate";
import {
  formatProjectedMoney,
  type MoneyDisplayConverter,
} from "../../utilities/formatters";

export const formatImmoMoney = (
  money: { amountMinor: number; currency: string },
  locale: string,
  convertMoney?: MoneyDisplayConverter,
) => formatProjectedMoney(money, { locale, convertMoney });

export function immoOptions(
  catalog: RealEstateCatalog,
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

export function formatImmoField(
  property: PropertyPublic,
  code: string,
  locale: string,
) {
  return (
    localizeTaxonomyLabels(
      property.taxonomy?.detailCharacteristics?.find(
        (field) => field.code === code,
      )?.values,
      locale,
    ) || "—"
  );
}

export const pricePeriodSuffix: Record<
  PropertyPublic["financials"]["period"],
  string
> = {
  total: "",
  month: " / mois",
  week: " / semaine",
  night: " / nuit",
};
