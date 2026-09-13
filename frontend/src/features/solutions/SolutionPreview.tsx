import { Search } from "lucide-react";
import type { SolutionIconId } from "../../domains/solutions/solutions.types";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import { SolutionIcon } from "./SolutionIcon";

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
  const { t } = useTranslation();
  const detail = variant === "detail";

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-border-base bg-bg-surface shadow-xs"
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
              <span className="rounded bg-primary px-2 py-1 text-micro font-bold text-on-primary">
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
                {[0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className={`grid grid-cols-4 gap-2 border-b border-border-subtle text-micro ${detail ? "py-4" : "py-1"}`}
                  >
                    <span className="h-2 rounded-full bg-border-base" />
                    <span className="h-2 rounded-full bg-bg-muted" />
                    <span className="ml-auto h-2 w-2/3 rounded-full bg-border-base" />
                    <span className="ml-auto h-2 w-1/2 rounded-full bg-bg-muted" />
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
