import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalyticsAcquisition,
  AnalyticsDashboardQuery,
  AnalyticsMonetization,
  AnalyticsOverview,
  AnalyticsProviderHealth,
  AnalyticsSearch,
  AnalyticsSeo,
  AnalyticsMetric,
} from "@shongre/contracts/analytics";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { services } from "../../api/client/service-registry";
import { Button, ScrollableRegion, StatePanel } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";

type TabId =
  "overview" | "acquisition" | "search" | "monetization" | "seo" | "providers";
type TabData =
  | AnalyticsOverview
  | AnalyticsAcquisition
  | AnalyticsSearch
  | AnalyticsMonetization
  | AnalyticsSeo
  | AnalyticsProviderHealth[];

const tabDefinitions: ReadonlyArray<{
  id: TabId;
  label: string;
  capability: Parameters<ReturnType<typeof useAuth>["can"]>[0];
}> = [
  { id: "overview", label: "Produit", capability: "analytics.platform.read" },
  {
    id: "acquisition",
    label: "Acquisition",
    capability: "analytics.marketing.read",
  },
  { id: "search", label: "Recherche", capability: "analytics.marketing.read" },
  {
    id: "monetization",
    label: "Monétisation",
    capability: "analytics.finance.read",
  },
  { id: "seo", label: "SEO", capability: "analytics.marketing.read" },
  {
    id: "providers",
    label: "Santé technique",
    capability: "analytics.technical.read",
  },
];

function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  const formatted =
    metric.unit === "percent"
      ? `${metric.value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`
      : metric.unit === "currency_minor"
        ? new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: metric.currency || "EUR",
          }).format(metric.value / 100)
        : metric.value.toLocaleString("fr-FR");
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-stone-500">{metric.label}</p>
        <TrendingUp
          className="h-icon-sm w-icon-sm text-primary"
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 text-2xl font-black tracking-tight text-stone-900">
        {formatted}
      </p>
      {metric.previousValue !== undefined && (
        <p className="mt-1 text-micro text-stone-500">
          Période précédente : {metric.previousValue.toLocaleString("fr-FR")}
        </p>
      )}
    </article>
  );
}

function Metrics({ items }: { items: AnalyticsMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

function TrendChart({
  data,
  title,
}: {
  data: Array<{ date: string; primary: number; secondary?: number }>;
  title: string;
}) {
  return (
    <section
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
      aria-labelledby="analytics-trend-title"
    >
      <h2
        id="analytics-trend-title"
        className="mb-4 text-sm font-bold text-stone-900"
      >
        {title}
      </h2>
      <div
        className="h-64 w-full"
        role="img"
        aria-label={`${title}, évolution sur la période`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-subtle)"
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              stroke="var(--color-text-muted)"
            />
            <YAxis
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              stroke="var(--color-text-muted)"
            />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="primary"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="secondary"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export const AdminAnalyticsPage: React.FC = () => {
  usePageMeta({
    title: "Analytics & Intelligence — Administration Shongre",
    description:
      "Pilotage produit, acquisition, SEO, recherche et monétisation.",
    canonicalPath: "/admin/analytics",
    noIndex: true,
  });
  const { can } = useAuth();
  const { availableMarkets, activeMarket } = useMarketLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabs = useMemo(
    () => tabDefinitions.filter((tab) => can(tab.capability)),
    [can],
  );
  const requestedTab = searchParams.get("tab") as TabId | null;
  const activeTab = tabs.some((tab) => tab.id === requestedTab)
    ? requestedTab!
    : tabs[0]?.id;
  const range = (searchParams.get("range") ||
    "30d") as AnalyticsDashboardQuery["range"];
  const marketCode = (
    searchParams.get("market") || activeMarket.code
  ).toUpperCase();
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const categoryId = searchParams.get("category") || undefined;
  const sellerType = (searchParams.get("sellerType") ||
    undefined) as AnalyticsDashboardQuery["sellerType"];
  const source = searchParams.get("source") || undefined;
  const campaign = searchParams.get("campaign") || undefined;
  const query = useMemo<AnalyticsDashboardQuery>(
    () => ({
      range,
      marketCode,
      from,
      to,
      categoryId,
      sellerType,
      source,
      campaign,
    }),
    [campaign, categoryId, from, marketCode, range, sellerType, source, to],
  );
  const [data, setData] = useState<TabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!activeTab) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const request =
      activeTab === "overview"
        ? services.analytics.getOverview(query)
        : activeTab === "acquisition"
          ? services.analytics.getAcquisition(query)
          : activeTab === "search"
            ? services.analytics.getSearch(query)
            : activeTab === "monetization"
              ? services.analytics.getMonetization(query)
              : activeTab === "seo"
                ? services.analytics.getSeo(query)
                : services.analytics.getProviderHealth();
    void request
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Les données n’ont pas pu être chargées.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, query, reloadKey]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (
      key === "range" &&
      value === "custom" &&
      (!next.get("from") || !next.get("to"))
    ) {
      const end = new Date();
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 29);
      next.set("from", start.toISOString().slice(0, 10));
      next.set("to", end.toISOString().slice(0, 10));
    }
    setSearchParams(next, { replace: true });
  };

  if (!activeTab)
    return (
      <StatePanel
        title="Accès limité"
        description="Aucun périmètre analytics n’est attribué à votre rôle."
        variant="restricted"
      />
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-xs lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <BarChart3 className="h-icon-sm w-icon-sm" aria-hidden="true" />{" "}
            Intelligence Shongre
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900">
            Analytics, SEO & observabilité
          </h1>
          <p className="mt-1 max-w-3xl text-xs text-stone-600">
            Indicateurs internes fiables, segmentés par marché. Les revenus sont
            rapprochés du grand livre financier.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold text-stone-600">
            Période
            <select
              className="mt-1 block h-control-md rounded-control border border-stone-300 bg-white px-3 text-xs"
              value={range}
              onChange={(event) => updateFilter("range", event.target.value)}
            >
              <option value="today">Aujourd’hui</option>
              <option value="yesterday">Hier</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
              <option value="month">Mois glissant</option>
              <option value="quarter">Trimestre</option>
              <option value="year">1 an</option>
              <option value="custom">Personnalisée</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-600">
            Marché
            <select
              className="mt-1 block h-control-md rounded-control border border-stone-300 bg-white px-3 text-xs"
              value={marketCode}
              onChange={(event) => updateFilter("market", event.target.value)}
            >
              <option value="ALL">Tous les marchés</option>
              {availableMarkets.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </label>
          {range === "custom" && (
            <>
              <label className="text-xs font-semibold text-stone-600">
                Du
                <input
                  type="date"
                  className="mt-1 block h-control-md rounded-control border border-stone-300 bg-white px-3 text-xs"
                  value={from || ""}
                  onChange={(event) => updateFilter("from", event.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-stone-600">
                Au
                <input
                  type="date"
                  className="mt-1 block h-control-md rounded-control border border-stone-300 bg-white px-3 text-xs"
                  value={to || ""}
                  onChange={(event) => updateFilter("to", event.target.value)}
                />
              </label>
            </>
          )}
        </div>
      </header>

      {(activeTab === "acquisition" || activeTab === "search") && (
        <details className="rounded-xl border border-stone-200 bg-white p-4">
          <summary className="cursor-pointer text-xs font-bold text-stone-700">
            Dimensions avancées
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeTab === "search" && (
              <label className="text-xs font-semibold text-stone-600">
                Catégorie
                <input
                  className="mt-1 block h-control-md w-full rounded-control border border-stone-300 px-3 text-xs"
                  value={categoryId || ""}
                  onChange={(event) =>
                    updateFilter("category", event.target.value)
                  }
                  placeholder="Identifiant catégorie"
                />
              </label>
            )}
            {activeTab === "acquisition" && (
              <>
                <label className="text-xs font-semibold text-stone-600">
                  Source
                  <input
                    className="mt-1 block h-control-md w-full rounded-control border border-stone-300 px-3 text-xs"
                    value={source || ""}
                    onChange={(event) =>
                      updateFilter("source", event.target.value)
                    }
                    placeholder="google, direct…"
                  />
                </label>
                <label className="text-xs font-semibold text-stone-600">
                  Campagne
                  <input
                    className="mt-1 block h-control-md w-full rounded-control border border-stone-300 px-3 text-xs"
                    value={campaign || ""}
                    onChange={(event) =>
                      updateFilter("campaign", event.target.value)
                    }
                  />
                </label>
              </>
            )}
          </div>
        </details>
      )}

      <div
        className="overflow-x-auto rounded-xl border border-stone-200 bg-white p-1"
        role="tablist"
        aria-label="Périmètres analytics"
      >
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeTab === tab.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
              onClick={() => updateFilter("tab", tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Chargement des indicateurs"
        >
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-stone-200"
            />
          ))}
        </div>
      ) : error ? (
        <StatePanel
          title="Données indisponibles"
          description={error}
          variant="error"
          action={
            <Button
              size="sm"
              onClick={() => setReloadKey((value) => value + 1)}
              leftIcon={<RefreshCw className="h-icon-sm w-icon-sm" />}
            >
              Réessayer
            </Button>
          }
        />
      ) : data && !Array.isArray(data) ? (
        <div className="space-y-4">
          {"metrics" in data && <Metrics items={data.metrics} />}
          {activeTab === "monetization" &&
            "reconciliationStatus" in data &&
            data.reconciliationStatus === "partial" && (
              <p className="rounded-control border border-warning/30 bg-warning/10 p-3 text-xs text-stone-700">
                Sélectionnez un marché pour un rapprochement complet dans sa
                devise. La vue « Tous les marchés » ne fusionne jamais des
                devises différentes.
              </p>
            )}
          {activeTab === "overview" && "activity" in data && (
            <>
              <TrendChart title="Activité produit" data={data.activity} />
              <section className="rounded-xl border border-stone-200 bg-white p-4">
                <h2 className="mb-3 text-sm font-bold">Entonnoir principal</h2>
                <div className="grid gap-2 sm:grid-cols-4">
                  {data.funnel.map((step) => (
                    <div key={step.step} className="rounded-lg bg-stone-50 p-3">
                      <div className="text-xs text-stone-500">{step.label}</div>
                      <div className="text-xl font-black">
                        {step.count.toLocaleString("fr-FR")}
                      </div>
                      <div className="text-micro text-stone-500">
                        {step.conversionFromPrevious === undefined
                          ? "Point d’entrée"
                          : `${step.conversionFromPrevious.toFixed(1)} % de l’étape précédente`}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          {activeTab === "acquisition" && "channels" in data && (
            <ScrollableRegion
              aria-label="Acquisition par canal"
              className="rounded-xl border border-stone-200 bg-white"
            >
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="p-3">Canal</th>
                    <th>Visiteurs</th>
                    <th>Inscriptions</th>
                    <th>Payants</th>
                    <th>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {(data as AnalyticsAcquisition).channels.map((row) => (
                    <tr
                      key={`${row.source}-${row.medium}`}
                      className="border-t border-stone-100"
                    >
                      <td className="p-3 font-semibold">
                        {row.source} / {row.medium}
                      </td>
                      <td>{row.visitors.toLocaleString("fr-FR")}</td>
                      <td>{row.registrations.toLocaleString("fr-FR")}</td>
                      <td>{row.payingUsers.toLocaleString("fr-FR")}</td>
                      <td>{row.conversionRate.toFixed(1)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableRegion>
          )}
          {activeTab === "search" && "opportunities" in data && (
            <ScrollableRegion
              aria-label="Demandes de recherche sous-servies"
              className="rounded-xl border border-stone-200 bg-white"
            >
              <div className="flex items-center gap-2 border-b border-stone-100 p-4">
                <Search className="h-icon-sm w-icon-sm" />
                <h2 className="text-sm font-bold">Demandes sous-servies</h2>
              </div>
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="p-3">Requête</th>
                    <th>Marché</th>
                    <th>Recherches</th>
                    <th>Offre</th>
                    <th>Sans résultat</th>
                    <th>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.opportunities.map((row) => (
                    <tr
                      key={`${row.marketCode}-${row.query}`}
                      className="border-t border-stone-100"
                    >
                      <td className="p-3 font-semibold">{row.query}</td>
                      <td>{row.marketCode}</td>
                      <td>{row.searches}</td>
                      <td>{row.resultSupply}</td>
                      <td>{row.zeroResultRate.toFixed(1)} %</td>
                      <td>{row.clickThroughRate.toFixed(1)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableRegion>
          )}
          {activeTab === "monetization" && "revenue" in data && (
            <TrendChart
              title={`Revenu reconnu (${data.currency})`}
              data={data.revenue}
            />
          )}
          {activeTab === "seo" && "queries" in data && (
            <>
              <TrendChart title="Visibilité organique" data={data.trend} />
              <ScrollableRegion
                aria-label="Requêtes organiques Search Console"
                className="rounded-xl border border-stone-200 bg-white"
              >
                <table className="w-full whitespace-nowrap text-left text-xs">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="p-3">Requête</th>
                      <th>Clics</th>
                      <th>Impressions</th>
                      <th>CTR</th>
                      <th>Position</th>
                      <th>Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queries.map((row) => (
                      <tr
                        key={`${row.query}-${row.page}`}
                        className="border-t border-stone-100"
                      >
                        <td className="p-3 font-semibold">{row.query}</td>
                        <td>{row.clicks}</td>
                        <td>{row.impressions}</td>
                        <td>{row.ctr.toFixed(1)} %</td>
                        <td>{row.position.toFixed(1)}</td>
                        <td className="max-w-48 truncate">{row.page}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableRegion>
            </>
          )}
        </div>
      ) : Array.isArray(data) ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((provider) => (
            <article
              key={provider.provider}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold capitalize">
                    {provider.provider.replace("_", " ")}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    {provider.message}
                  </p>
                </div>
                {provider.status === "connected" ? (
                  <CheckCircle2 className="h-icon-md w-icon-md text-success" />
                ) : provider.status === "degraded" ||
                  provider.status === "misconfigured" ? (
                  <AlertCircle className="h-icon-md w-icon-md text-warning" />
                ) : (
                  <Activity className="h-icon-md w-icon-md text-stone-400" />
                )}
              </div>
              <div className="mt-3 flex gap-4 text-micro text-stone-500">
                <span>Échecs : {provider.failedEvents}</span>
                <span>File : {provider.queueBacklog}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
};
