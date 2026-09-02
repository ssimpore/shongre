import type { Money, MoneyConversionProjection } from "@shongre/contracts";
import type { ListingPricePresentation } from "../../types";

const PERIOD_LABELS: Record<
  NonNullable<ListingPricePresentation["period"]>,
  string
> = {
  hour: " / h",
  day: " / jour",
  week: " / semaine",
  month: " / mois",
  year: " / an",
  total: "",
};

function formatMinorAmount(
  amountMinor: number,
  currency: string,
  locale: string,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): string {
  const projection = convertMoney?.({ amountMinor, currency });
  const displayMoney = projection?.display || { amountMinor, currency };
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: displayMoney.currency,
    maximumFractionDigits: displayMoney.amountMinor % 100 === 0 ? 0 : 2,
  }).format(displayMoney.amountMinor / 100);
}

export function formatListingPricePresentation(
  presentation: ListingPricePresentation | undefined,
  locale: string,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): string | undefined {
  if (!presentation) return undefined;
  if (presentation.visibility === "undisclosed") {
    return presentation.kind === "salary"
      ? "Rémunération non communiquée"
      : "Tarif sur demande";
  }

  const minimum =
    presentation.minimumAmountMinor === undefined
      ? undefined
      : formatMinorAmount(
          presentation.minimumAmountMinor,
          presentation.currency,
          locale,
          convertMoney,
        );
  const maximum =
    presentation.maximumAmountMinor === undefined
      ? undefined
      : formatMinorAmount(
          presentation.maximumAmountMinor,
          presentation.currency,
          locale,
          convertMoney,
        );
  const amount =
    minimum && maximum && minimum !== maximum
      ? `${minimum} – ${maximum}`
      : minimum || maximum;

  if (!amount) {
    return presentation.kind === "salary"
      ? "Rémunération communiquée"
      : undefined;
  }

  const estimated =
    convertMoney?.({
      amountMinor:
        presentation.minimumAmountMinor ?? presentation.maximumAmountMinor ?? 0,
      currency: presentation.currency,
    }).estimated === true;
  return `${estimated ? "≈ " : ""}${amount}${PERIOD_LABELS[presentation.period || "total"]}`;
}
