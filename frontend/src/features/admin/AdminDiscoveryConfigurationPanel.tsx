import React, { useEffect, useState } from "react";
import type {
  DiscoveryConfiguration,
  DiscoveryMetrics,
  RankingWeights,
} from "@shongre/contracts/discovery";
import { AlertTriangle, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { services } from "../../api";
import { Badge, Button, StatePanel } from "../../design-system";
import { useTranslation } from "../../i18n/I18nProvider";

const WEIGHT_LABELS: Record<
  keyof RankingWeights,
  Parameters<ReturnType<typeof useTranslation>["t"]>[0]
> = {
  relevance: "admin.discovery.weight.relevance",
  category: "admin.discovery.weight.category",
  location: "admin.discovery.weight.location",
  quality: "admin.discovery.weight.quality",
  freshness: "admin.discovery.weight.freshness",
  trust: "admin.discovery.weight.trust",
  price: "admin.discovery.weight.price",
  personalization: "admin.discovery.weight.personalization",
};

const METRIC_LABELS: Array<
  [
    keyof DiscoveryMetrics,
    Parameters<ReturnType<typeof useTranslation>["t"]>[0],
  ]
> = [
  ["searchRequests", "admin.discovery.metric.searches"],
  ["noResultRequests", "admin.discovery.metric.noResults"],
  ["sponsoredResults", "admin.discovery.metric.sponsored"],
  ["duplicateSuppressions", "admin.discovery.metric.duplicates"],
  ["diversityReranks", "admin.discovery.metric.diversity"],
  ["averageLatencyMs", "admin.discovery.metric.latency"],
];

export const AdminDiscoveryConfigurationPanel: React.FC = () => {
  const { t, locale } = useTranslation();
  const [configuration, setConfiguration] =
    useState<DiscoveryConfiguration | null>(null);
  const [metrics, setMetrics] = useState<DiscoveryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextConfiguration, nextMetrics] = await Promise.all([
        services.admin.getDiscoveryConfiguration("FR"),
        services.admin.getDiscoveryMetrics("FR"),
      ]);
      setConfiguration(nextConfiguration);
      setMetrics(nextMetrics);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("admin.discovery.unavailable"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (activate: boolean) => {
    if (!configuration) return;
    const reason = window
      .prompt(
        t("admin.discovery.reasonPrompt"),
        activate
          ? t("admin.discovery.publishReason")
          : t("admin.discovery.draftReason"),
      )
      ?.trim();
    if (!reason || reason.length < 8) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await services.admin.saveDiscoveryConfiguration(
        configuration,
        reason,
        activate,
      );
      if (activate) setConfiguration(saved);
      setNotice(
        activate
          ? t("admin.discovery.publishedNotice", { version: saved.version })
          : t("admin.discovery.draftNotice", { version: saved.version }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("admin.discovery.saveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !configuration) {
    return (
      <div className="min-h-80 flex items-center justify-center" role="status">
        <LoaderCircle className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-xs font-semibold text-text-secondary">
          {t("admin.discovery.loading")}
        </span>
      </div>
    );
  }

  if (!configuration) {
    return (
      <StatePanel
        variant="error"
        title={t("admin.discovery.unavailableTitle")}
        description={error || t("admin.discovery.unavailable")}
        action={
          <Button onClick={() => void load()}>{t("common.retry")}</Button>
        }
      />
    );
  }

  const weightTotal = Object.values(configuration.weights).reduce(
    (sum, weight) => sum + weight,
    0,
  );

  return (
    <div className="p-4 sm:p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-black text-text-main">
              {t("admin.discovery.title")}
            </h2>
            <Badge variant="success">{configuration.version}</Badge>
          </div>
          <p className="mt-1 text-xs text-text-secondary max-w-3xl">
            {t("admin.discovery.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => void save(false)}
          >
            <Save className="w-4 h-4" /> {t("admin.discovery.saveDraft")}
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void save(true)}>
            {saving ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {t("admin.discovery.publish")}
          </Button>
        </div>
      </div>

      {(notice || error) && (
        <div
          role="status"
          className={`rounded-control border px-3 py-2 text-xs font-semibold flex items-start gap-2 ${
            error
              ? "border-danger-border bg-danger-surface text-danger"
              : "border-success-border bg-success-surface text-success"
          }`}
        >
          {error ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 shrink-0" />
          )}
          <span>{error || notice}</span>
        </div>
      )}

      {metrics && (
        <section aria-labelledby="discovery-metrics-heading">
          <h3
            id="discovery-metrics-heading"
            className="text-xs font-black text-text-main"
          >
            {t("admin.discovery.metricsTitle")}
          </h3>
          <div className="mt-2 grid grid-cols-2 lg:grid-cols-3 gap-2">
            {METRIC_LABELS.map(([key, label]) => (
              <div
                key={key}
                className="rounded-control border border-border-base bg-bg-subtle p-3"
              >
                <div className="text-micro text-text-muted">{t(label)}</div>
                <div className="mt-0.5 text-base font-black text-text-main">
                  {new Intl.NumberFormat(locale, {
                    maximumFractionDigits: 2,
                  }).format(metrics[key] as number)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="organic-weights-heading">
        <div className="flex items-center justify-between gap-3">
          <h3
            id="organic-weights-heading"
            className="text-xs font-black text-text-main"
          >
            {t("admin.discovery.weightsTitle")}
          </h3>
          <Badge
            variant={Math.abs(weightTotal - 1) < 0.001 ? "success" : "warning"}
          >
            {t("admin.discovery.total", { total: weightTotal.toFixed(2) })}
          </Badge>
        </div>
        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(
            Object.keys(configuration.weights) as Array<keyof RankingWeights>
          ).map((key) => (
            <label
              key={key}
              className="text-micro font-bold text-text-secondary"
            >
              {t(WEIGHT_LABELS[key])}
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={configuration.weights[key]}
                onChange={(event) =>
                  setConfiguration((current) =>
                    current
                      ? {
                          ...current,
                          weights: {
                            ...current.weights,
                            [key]: Number(event.target.value),
                          },
                        }
                      : current,
                  )
                }
                className="mt-1 w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-3 text-xs focus-visible:outline-2 focus-visible:outline-primary"
              />
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="sponsored-policy-heading">
        <h3
          id="sponsored-policy-heading"
          className="text-xs font-black text-text-main"
        >
          {t("admin.discovery.sponsoredTitle")}
        </h3>
        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <label className="text-micro font-bold text-text-secondary">
            {t("admin.discovery.positions")}
            <input
              value={configuration.sponsored.positions.join(", ")}
              onChange={(event) =>
                setConfiguration((current) =>
                  current
                    ? {
                        ...current,
                        sponsored: {
                          ...current.sponsored,
                          positions: event.target.value
                            .split(",")
                            .map((value) => Number(value.trim()))
                            .filter(
                              (value) => Number.isInteger(value) && value > 0,
                            ),
                        },
                      }
                    : current,
                )
              }
              className="mt-1 w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-3 text-xs focus-visible:outline-2 focus-visible:outline-primary"
            />
          </label>
          {(
            [
              ["maxPerPage", "admin.discovery.maxPerPage", 1],
              ["maxShare", "admin.discovery.maxShare", 0.05],
              ["minimumRelevance", "admin.discovery.minimumRelevance", 0.05],
            ] as const
          ).map(([key, label, step]) => (
            <label
              key={key}
              className="text-micro font-bold text-text-secondary"
            >
              {t(label)}
              <input
                type="number"
                min={0}
                max={key === "maxPerPage" ? 20 : 1}
                step={step}
                value={configuration.sponsored[key]}
                onChange={(event) =>
                  setConfiguration((current) =>
                    current
                      ? {
                          ...current,
                          sponsored: {
                            ...current.sponsored,
                            [key]: Number(event.target.value),
                          },
                        }
                      : current,
                  )
                }
                className="mt-1 w-full h-control-touch rounded-control border border-border-base bg-bg-surface px-3 text-xs focus-visible:outline-2 focus-visible:outline-primary"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};
