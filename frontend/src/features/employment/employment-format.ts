import type {
  EmploymentCatalog,
  SalaryRange,
} from "@shongre/contracts/employment";
import {
  formatProjectedMoney,
  type MoneyDisplayConverter,
} from "../../utilities/formatters";

export function dictionaryLabel(
  catalog: EmploymentCatalog | null | undefined,
  id: string | undefined,
  fallback = "",
) {
  return (
    catalog?.dictionaries.find((entry) => entry.id === id)?.label || fallback
  );
}

export function formatEmploymentMoney(
  amountMinor: number,
  currency: string,
  locale: string,
  convertMoney?: MoneyDisplayConverter,
) {
  return formatProjectedMoney(
    { amountMinor, currency },
    { locale, convertMoney },
  );
}

export function formatSalary(
  salary: SalaryRange | undefined,
  catalog: EmploymentCatalog | null | undefined,
  locale: string,
  convertMoney?: MoneyDisplayConverter,
) {
  if (!salary?.isPublic) return "Rémunération non communiquée";
  const minimum = salary.minimum
    ? formatEmploymentMoney(
        salary.minimum.amountMinor,
        salary.minimum.currency,
        locale,
        convertMoney,
      )
    : undefined;
  const maximum = salary.maximum
    ? formatEmploymentMoney(
        salary.maximum.amountMinor,
        salary.maximum.currency,
        locale,
        convertMoney,
      )
    : undefined;
  const frequency = dictionaryLabel(catalog, salary.frequencyId);
  const range =
    minimum && maximum ? `${minimum} – ${maximum}` : minimum || maximum;
  return `${range || "Rémunération communiquée"}${frequency ? ` · ${frequency.toLocaleLowerCase(locale)}` : ""}`;
}

export function formatEmploymentDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function relativeEmploymentDate(value: string, locale: string) {
  const days = Math.max(
    0,
    Math.round((Date.now() - Date.parse(value)) / 86_400_000),
  );
  if (days === 0) return "Aujourd’hui";
  if (days === 1) return "Hier";
  return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(
    -days,
    "day",
  );
}
