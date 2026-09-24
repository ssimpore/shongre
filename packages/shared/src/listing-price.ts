import type { Money } from "@shongre/contracts/primitives";
import type { MoneyConversionProjection } from "@shongre/contracts/currency";
import type { components } from "@shongre/contracts/openapi";
import { formatCompactMoney } from "./formatters/money";

type ListingPricePresentation =
  components["schemas"]["ListingPricePresentation"];

type ListingPeriod = NonNullable<ListingPricePresentation["period"]> | "night";

const PRICE_COPY = {
  fr: {
    salaryUndisclosed: "Rémunération non communiquée",
    priceOnRequest: "Tarif sur demande",
    salaryDisclosed: "Rémunération communiquée",
    periods: {
      hour: [" / h", "par heure"],
      day: [" / jour", "par jour"],
      night: [" / nuit", "par nuit"],
      week: [" / semaine", "par semaine"],
      month: [" / mois", "par mois"],
      year: [" / an", "par an"],
      total: ["", ""],
    },
  },
  en: {
    salaryUndisclosed: "Salary not disclosed",
    priceOnRequest: "Price on request",
    salaryDisclosed: "Salary disclosed",
    periods: {
      hour: [" / hour", "per hour"],
      day: [" / day", "per day"],
      night: [" / night", "per night"],
      week: [" / week", "per week"],
      month: [" / month", "per month"],
      year: [" / year", "per year"],
      total: ["", ""],
    },
  },
  nl: {
    salaryUndisclosed: "Salaris niet bekendgemaakt",
    priceOnRequest: "Prijs op aanvraag",
    salaryDisclosed: "Salaris bekendgemaakt",
    periods: {
      hour: [" / uur", "per uur"],
      day: [" / dag", "per dag"],
      night: [" / nacht", "per nacht"],
      week: [" / week", "per week"],
      month: [" / maand", "per maand"],
      year: [" / jaar", "per jaar"],
      total: ["", ""],
    },
  },
  de: {
    salaryUndisclosed: "Gehalt nicht angegeben",
    priceOnRequest: "Preis auf Anfrage",
    salaryDisclosed: "Gehalt angegeben",
    periods: {
      hour: [" / Std.", "pro Stunde"],
      day: [" / Tag", "pro Tag"],
      night: [" / Nacht", "pro Nacht"],
      week: [" / Woche", "pro Woche"],
      month: [" / Monat", "pro Monat"],
      year: [" / Jahr", "pro Jahr"],
      total: ["", ""],
    },
  },
  it: {
    salaryUndisclosed: "Retribuzione non comunicata",
    priceOnRequest: "Prezzo su richiesta",
    salaryDisclosed: "Retribuzione comunicata",
    periods: {
      hour: [" / ora", "all'ora"],
      day: [" / giorno", "al giorno"],
      night: [" / notte", "a notte"],
      week: [" / settimana", "a settimana"],
      month: [" / mese", "al mese"],
      year: [" / anno", "all'anno"],
      total: ["", ""],
    },
  },
} as const;

export function getListingPriceCopy(locale: string) {
  const language = locale.split("-")[0]?.toLowerCase();
  return PRICE_COPY[language as keyof typeof PRICE_COPY] || PRICE_COPY.fr;
}

export function getListingPeriodLabel(
  period: ListingPeriod,
  locale: string,
  mode: "suffix" | "frequency" = "suffix",
): string {
  return getListingPriceCopy(locale).periods[period][mode === "suffix" ? 0 : 1];
}

function formatMinorAmount(
  amountMinor: number,
  currency: string,
  locale: string,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): { label: string; estimated: boolean } {
  const source = { amountMinor, currency };
  const projection = convertMoney?.(source);
  return {
    label: formatCompactMoney(projection?.display || source, locale),
    estimated: projection?.estimated === true,
  };
}

export function formatListingPricePresentation(
  presentation: ListingPricePresentation | undefined,
  locale: string,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): string | undefined {
  if (!presentation) return undefined;
  const copy = getListingPriceCopy(locale);
  if (presentation.visibility === "undisclosed") {
    return presentation.kind === "salary"
      ? copy.salaryUndisclosed
      : copy.priceOnRequest;
  }

  const minimumProjection =
    presentation.minimumAmountMinor === undefined
      ? undefined
      : formatMinorAmount(
          presentation.minimumAmountMinor,
          presentation.currency,
          locale,
          convertMoney,
        );
  const maximumProjection =
    presentation.maximumAmountMinor === undefined
      ? undefined
      : formatMinorAmount(
          presentation.maximumAmountMinor,
          presentation.currency,
          locale,
          convertMoney,
        );
  const minimum = minimumProjection?.label;
  const maximum = maximumProjection?.label;
  const amount =
    minimum && maximum && minimum !== maximum
      ? `${minimum} – ${maximum}`
      : minimum || maximum;

  if (!amount) {
    return presentation.kind === "salary" ? copy.salaryDisclosed : undefined;
  }

  const estimated = Boolean(
    minimumProjection?.estimated || maximumProjection?.estimated,
  );
  return `${estimated ? "≈ " : ""}${amount}${getListingPeriodLabel(
    presentation.period || "total",
    locale,
  )}`;
}
