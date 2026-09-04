import { Search } from "lucide-react";
import type { SolutionIconId } from "../../domains/solutions/solutions.types";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import { SolutionIcon } from "./SolutionIcon";

/**
 * Sample rows for the decorative product mock.
 *
 * Every label used to be a French literal — "Rechercher…", "Chiffre
 * d'affaires", "Émise" — on a surface whose every other string ships
 * translated, so the mockups stayed French on the English catalogue.
 *
 * A cell is either a message key or a literal, because both kinds genuinely
 * appear here: company names, invoice numbers, scores and cities are the same
 * in any language, while categories, statuses and listing titles are not.
 */
type Cell = { key: MessageKey } | { text: string };

interface PreviewRow {
  id: string;
  label: Cell;
  category: Cell;
  /** Rendered instead of `amountMinor` when the column is not money. */
  value?: Cell;
  amountMinor?: number;
  status: Cell;
}

const marketplaceRows: readonly PreviewRow[] = [
  {
    id: "listing-house",
    label: { key: "solutions.preview.listing.familyHome" },
    category: { key: "solutions.preview.category.realEstate" },
    value: { text: "Écully" },
    status: { key: "solutions.preview.status.featured" },
  },
  {
    id: "listing-bike",
    label: { key: "solutions.preview.listing.cargoBike" },
    category: { key: "solutions.preview.category.mobility" },
    value: { text: "Lyon" },
    status: { key: "solutions.preview.status.new" },
  },
];

const rows: Record<SolutionIconId, readonly PreviewRow[]> = {
  prospects: [
    {
      id: "prospect-atelier",
      label: { text: "Atelier Lumière" },
      category: { key: "solutions.preview.category.design" },
      value: { text: "82" },
      status: { key: "solutions.preview.status.new" },
    },
    {
      id: "prospect-greenov",
      label: { text: "Greenov" },
      category: { key: "solutions.preview.category.energy" },
      value: { text: "76" },
      status: { key: "solutions.preview.status.contacted" },
    },
    {
      id: "prospect-techmind",
      label: { text: "Techmind" },
      category: { key: "solutions.preview.category.software" },
      value: { text: "71" },
      status: { key: "solutions.preview.status.followUp" },
    },
  ],
  facturation: [
    {
      id: "invoice-0012",
      label: { text: "F-2026-0012" },
      category: { text: "Atelier Lumière" },
      amountMinor: 125000,
      status: { key: "solutions.preview.status.issued" },
    },
    {
      id: "invoice-0011",
      label: { text: "F-2026-0011" },
      category: { text: "Maison Sève" },
      amountMinor: 84000,
      status: { key: "solutions.preview.status.paid" },
    },
  ],
  marketplace: marketplaceRows,
  pilotage: [],
  apps: marketplaceRows,
};

const previewTitleKeys: Record<SolutionIconId, MessageKey> = {
  prospects: "solutions.preview.title.prospects",
  facturation: "solutions.preview.title.invoices",
  marketplace: "solutions.preview.title.marketplace",
  pilotage: "solutions.preview.title.dashboard",
  apps: "solutions.preview.title.application",
};

const metricKeys: readonly MessageKey[] = [
  "solutions.preview.metric.revenue",
  "solutions.preview.metric.dueDates",
  "solutions.preview.metric.newCustomers",
];

export function SolutionPreview({
  icon,
  variant = "catalog",
}: {
  icon: SolutionIconId;
  variant?: "catalog" | "detail";
}) {
  const { t, locale } = useTranslation();
  const detail = variant === "detail";
  const cell = (value: Cell) => ("key" in value ? t(value.key) : value.text);
  const money = (amountMinor: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amountMinor / 100);

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-border-base bg-white shadow-xs"
    >
      <div className={`flex ${detail ? "min-h-64" : "min-h-28"}`}>
        <div
          className={`flex shrink-0 flex-col items-center border-r border-border-subtle bg-bg-subtle text-text-muted ${detail ? "w-24 gap-5 py-6" : "w-9 gap-3 py-3"}`}
        >
          <SolutionIcon
            icon={icon}
            className={`h-3.5 w-3.5 ${icon === "pilotage" ? "text-text-muted" : "text-primary"}`}
          />
          <span className="h-3.5 w-3.5 rounded border border-border-base" />
          <span className="h-3.5 w-3.5 rounded border border-border-base" />
        </div>
        <div className={`min-w-0 flex-1 ${detail ? "p-6" : "p-3"}`}>
          <div className="flex items-center justify-between gap-2">
            <span
              className={`${detail ? "text-base" : "text-micro"} font-bold text-text-main`}
            >
              {t(previewTitleKeys[icon])}
            </span>
            {icon !== "pilotage" ? (
              <span className="rounded bg-primary px-2 py-1 text-micro font-bold text-white">
                + {t("solutions.preview.new")}
              </span>
            ) : null}
          </div>
          {icon === "pilotage" ? (
            <div
              className={`${detail ? "mt-6" : "mt-3"} grid grid-cols-3 gap-2`}
            >
              {metricKeys.map((key) => (
                <div
                  key={key}
                  className="rounded border border-border-subtle p-2"
                >
                  <p className="text-micro text-text-muted">{t(key)}</p>
                  <p
                    className={`${detail ? "mt-6 text-base" : "mt-2 text-micro"} font-bold text-text-muted`}
                  >
                    — —
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div
                className={`flex items-center gap-1 rounded border border-border-subtle px-2 text-micro text-text-muted ${detail ? "mt-4 h-9" : "mt-2 h-5"}`}
              >
                <Search className="h-2.5 w-2.5" />{" "}
                {t("solutions.preview.search")}
              </div>
              <div className="mt-2 divide-y divide-border-subtle">
                {rows[icon].map((row) => (
                  <div
                    key={row.id}
                    className={`grid grid-cols-4 gap-2 border-b border-border-subtle text-micro ${detail ? "py-4" : "py-1"}`}
                  >
                    <span className="truncate font-semibold text-text-main">
                      {cell(row.label)}
                    </span>
                    <span className="truncate text-text-muted">
                      {cell(row.category)}
                    </span>
                    <span className="text-right font-bold text-text-main">
                      {row.amountMinor !== undefined
                        ? money(row.amountMinor)
                        : row.value
                          ? cell(row.value)
                          : null}
                    </span>
                    <span className="text-right text-text-muted">
                      {cell(row.status)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
