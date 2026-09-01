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
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}

export function formatListingPricePresentation(
  presentation: ListingPricePresentation | undefined,
  locale: string,
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
        );
  const maximum =
    presentation.maximumAmountMinor === undefined
      ? undefined
      : formatMinorAmount(
          presentation.maximumAmountMinor,
          presentation.currency,
          locale,
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

  return `${amount}${PERIOD_LABELS[presentation.period || "total"]}`;
}
