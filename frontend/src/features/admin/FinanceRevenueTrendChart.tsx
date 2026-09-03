import type { PlatformFinanceDashboard } from "@shongre/contracts/finance";
import { useCallback, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { useTranslation } from "../../i18n/I18nProvider";

type RevenueTimeSeries = PlatformFinanceDashboard["timeSeries"];

interface FinanceRevenueTrendChartProps {
  currency: string;
  timeSeries: RevenueTimeSeries;
}

interface RevenueChartDatum {
  date: string;
  netRevenueMinor: number;
  platformRevenueMinor: number;
}

const SERIES = {
  platformRevenueMinor: {
    dotClass: "bg-primary",
    label: "Revenus plateforme",
    stroke: "var(--color-primary)",
  },
  netRevenueMinor: {
    dotClass: "bg-stone-500",
    label: "Revenus nets",
    stroke: "var(--color-stone-500)",
  },
} as const;

type RevenueSeriesKey = keyof typeof SERIES;

interface RevenueTooltipExtras {
  currency: string;
  formatDateLabel: (value: string) => string;
  formatMoneyMinor: (amountMinor: number, currency?: string) => string;
}

function RevenueTooltip({
  active,
  currency,
  formatDateLabel,
  formatMoneyMinor,
  label,
  payload,
}: TooltipContentProps<number, string> & RevenueTooltipExtras) {
  if (!active || !payload.length || label === undefined) return null;

  return (
    <div className="min-w-44 rounded-control border border-border-base bg-bg-surface p-3 shadow-lg">
      <p className="text-micro font-bold text-text-main">
        {formatDateLabel(String(label))}
      </p>
      <dl className="mt-2 space-y-2">
        {payload.map((entry) => {
          const key = String(entry.dataKey) as RevenueSeriesKey;
          const series = SERIES[key];
          if (!series || typeof entry.value !== "number") return null;

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <dt className="flex items-center gap-2 text-text-secondary">
                <span
                  className={`h-2 w-2 rounded-pill ${series.dotClass}`}
                  aria-hidden="true"
                />
                {series.label}
              </dt>
              <dd className="font-bold tabular-nums text-text-main">
                {formatMoneyMinor(entry.value, currency)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/**
 * Interactive, data-driven finance plot. Amounts stay in integer minor units
 * through the chart pipeline and are localized only at the presentation edge.
 */
export function FinanceRevenueTrendChart({
  currency,
  timeSeries,
}: FinanceRevenueTrendChartProps) {
  const { t } = useTranslation();
  const { currentLocale, formatDate, formatMoneyMinor } =
    useRegionalFormatters();

  const chartData = useMemo<RevenueChartDatum[]>(
    () =>
      timeSeries.map((point) => ({
        date: point.date,
        netRevenueMinor: point.netRevenue.amountMinor,
        platformRevenueMinor: point.platformRevenue.amountMinor,
      })),
    [timeSeries],
  );

  const formatDateLabel = useCallback(
    (date: string) =>
      formatDate(`${date}T12:00:00`, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [formatDate],
  );

  const formatAxisDate = useCallback(
    (date: string) =>
      formatDate(`${date}T12:00:00`, {
        day: "numeric",
        month: "short",
      }),
    [formatDate],
  );

  const compactMoneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currentLocale, {
        compactDisplay: "short",
        currency,
        maximumFractionDigits: 1,
        notation: "compact",
        style: "currency",
      }),
    [currency, currentLocale],
  );

  const formatAxisMoney = useCallback(
    (amountMinor: number) => compactMoneyFormatter.format(amountMinor / 100),
    [compactMoneyFormatter],
  );

  return (
    <section
      className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs lg:col-span-2"
      aria-labelledby="finance-revenue-chart-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="finance-revenue-chart-title"
            className="text-sm font-bold text-text-main"
          >
            {t("admin.financeRevenueTrendChart.evolutionDesRevenus")}
          </h2>
          <p className="text-micro text-text-muted">
            {t(
              "admin.financeRevenueTrendChart.revenusReconnusHorsTvaEtFondsVendeurs",
            )}
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-text-secondary"
          aria-label={t("admin.financeRevenueTrendChart.legendeDuGraphique")}
        >
          <span className="flex items-center gap-1.5">
            <i className="h-0.5 w-4 bg-primary" aria-hidden="true" />
            {SERIES.platformRevenueMinor.label}
          </span>
          <span className="flex items-center gap-1.5">
            <i
              className="h-0.5 w-4 border-t border-dashed border-stone-500"
              aria-hidden="true"
            />
            {SERIES.netRevenueMinor.label}
          </span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div
          className="mt-4 flex h-56 items-center justify-center rounded-control bg-bg-subtle px-4 text-center text-xs text-text-muted"
          role="status"
        >
          {t(
            "admin.financeRevenueTrendChart.aucuneDonneeDeRevenusDisponiblePourCettePeriode",
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 h-56 min-w-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                accessibilityLayer={false}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border-subtle)"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--color-text-muted)",
                    fontSize: "var(--text-micro)",
                  }}
                  tickFormatter={formatAxisDate}
                  minTickGap={28}
                  interval="preserveStartEnd"
                  padding={{ left: 4, right: 4 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--color-text-muted)",
                    fontSize: "var(--text-micro)",
                  }}
                  tickFormatter={formatAxisMoney}
                  width={58}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  cursor={{
                    stroke: "var(--color-border-hover)",
                    strokeDasharray: "3 3",
                  }}
                  content={(props) => (
                    <RevenueTooltip
                      {...(props as TooltipContentProps<number, string>)}
                      currency={currency}
                      formatDateLabel={formatDateLabel}
                      formatMoneyMinor={formatMoneyMinor}
                    />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="platformRevenueMinor"
                  name={SERIES.platformRevenueMinor.label}
                  stroke={SERIES.platformRevenueMinor.stroke}
                  strokeWidth={2.5}
                  dot={{
                    fill: "var(--color-bg-surface)",
                    r: 3,
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="netRevenueMinor"
                  name={SERIES.netRevenueMinor.label}
                  stroke={SERIES.netRevenueMinor.stroke}
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  dot={{
                    fill: "var(--color-bg-surface)",
                    r: 2.5,
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 4.5, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="sr-only">
            <table>
              <caption>
                {t(
                  "admin.financeRevenueTrendChart.donneesDuGraphiqueDEvolutionDesRevenus",
                )}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Revenus plateforme</th>
                  <th scope="col">Revenus nets</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((point) => (
                  <tr key={point.date}>
                    <th scope="row">{formatDateLabel(point.date)}</th>
                    <td>
                      {formatMoneyMinor(point.platformRevenueMinor, currency)}
                    </td>
                    <td>{formatMoneyMinor(point.netRevenueMinor, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
