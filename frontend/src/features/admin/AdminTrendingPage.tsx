import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  EyeOff,
  Flame,
  Pin,
  RefreshCw,
  Save,
  Settings2,
  TrendingUp,
} from "lucide-react";
import { services } from "../../api/client/service-registry";
import type {
  TrendingAdminConfig,
  TrendingSectionResponse,
} from "../../domains/trending/trending.types";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { usePageMeta } from "../../hooks/usePageMeta";

const inputClass =
  "mt-1 h-control-touch w-full rounded-control border border-stone-200 bg-white px-3 text-sm text-stone-900 shadow-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

export const AdminTrendingPage: React.FC = () => {
  usePageMeta({
    title: "Tendances de la page d’accueil",
    description: "Piloter la section En ce moment sur Shongre.",
    canonicalPath: "/admin/tendances",
    noIndex: true,
  });

  const { activeMarket } = useMarketLocation();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState<TrendingAdminConfig | null>(null);
  const [preview, setPreview] = useState<TrendingSectionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const marketCode =
    currentUser?.marketScope?.countries?.[0] || activeMarket.code;

  const load = async () => {
    setIsLoading(true);
    try {
      const [nextConfig, nextPreview] = await Promise.all([
        services.admin.getTrendingConfig(marketCode),
        services.trending.getTrending({ marketCode }),
      ]);
      setConfig(nextConfig);
      setPreview(nextPreview);
    } catch {
      toast.error("Impossible de charger la configuration des tendances.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [marketCode]);

  const pinned = useMemo(
    () =>
      new Set(
        config?.overrides
          .filter((override) => override.isPinned)
          .map((override) => override.topicKey) || [],
      ),
    [config],
  );
  const hidden = useMemo(
    () =>
      new Set(
        config?.overrides
          .filter((override) => override.isHidden)
          .map((override) => override.topicKey) || [],
      ),
    [config],
  );

  const save = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const saved = await services.admin.updateTrendingConfig(
        config,
        marketCode,
      );
      setConfig(saved);
      toast.success("Configuration des tendances enregistrée.");
      setPreview(
        await services.trending.getTrending({
          marketCode,
          limit: saved.maxTopics,
        }),
      );
    } catch {
      toast.error("La configuration n’a pas pu être enregistrée.");
    } finally {
      setIsSaving(false);
    }
  };

  const update = <K extends keyof TrendingAdminConfig>(
    key: K,
    value: TrendingAdminConfig[K],
  ) => {
    setConfig((current) => (current ? { ...current, [key]: value } : current));
  };

  const toggleOverride = async (topicKey: string, action: "pin" | "hide") => {
    const current =
      action === "pin" ? pinned.has(topicKey) : hidden.has(topicKey);
    const next = await services.admin.upsertTrendingOverride({
      topicKey,
      marketCode,
      isPinned: action === "pin" ? !current : pinned.has(topicKey),
      isHidden: action === "hide" ? !current : hidden.has(topicKey),
    });
    setConfig(next);
    setPreview(
      await services.trending.getTrending({
        marketCode,
        limit: next.maxTopics,
      }),
    );
  };

  if (isLoading || !config) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm font-medium text-stone-500">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Chargement de la configuration…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-xs sm:flex-row sm:items-end sm:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Flame className="h-4 w-4" /> Découverte éditoriale
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900">
            En ce moment sur Shongre
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">
            Les thèmes sont calculés à partir de l’activité du marché puis
            ajustés ici. Les données de classement restent internes à la
            console.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            disabled={isSaving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs"
          aria-labelledby="trending-settings-title"
        >
          <div className="mb-5 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <h2
              id="trending-settings-title"
              className="text-sm font-bold text-stone-900"
            >
              Règles d’affichage
            </h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-control border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-semibold">
              <span>Section active</span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(event) => update("enabled", event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-stone-600">
                Maximum de sous-sections
                <input
                  aria-label="Maximum de sous-sections"
                  className={inputClass}
                  type="number"
                  min={Math.max(1, config.minTopics)}
                  max={12}
                  value={config.maxTopics}
                  onChange={(event) =>
                    update(
                      "maxTopics",
                      Math.max(config.minTopics, Number(event.target.value)),
                    )
                  }
                />
              </label>
              <label className="text-xs font-bold text-stone-600">
                Minimum d’activité
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={config.minimumActivity}
                  onChange={(event) =>
                    update("minimumActivity", Number(event.target.value))
                  }
                />
              </label>
              <label className="text-xs font-bold text-stone-600">
                Période (jours)
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={30}
                  value={config.displayPeriodDays}
                  onChange={(event) =>
                    update("displayPeriodDays", Number(event.target.value))
                  }
                />
              </label>
              <label className="text-xs font-bold text-stone-600">
                TTL cache (minutes)
                <input
                  className={inputClass}
                  type="number"
                  min={5}
                  max={120}
                  value={config.cacheTtlMinutes}
                  onChange={(event) =>
                    update("cacheTtlMinutes", Number(event.target.value))
                  }
                />
              </label>
            </div>
            <label className="text-xs font-bold text-stone-600">
              Titre public
              <input
                className={inputClass}
                value={config.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-stone-600">
              Sous-titre public
              <textarea
                className={`${inputClass} h-auto min-h-20 py-2`}
                value={config.subtitle}
                onChange={(event) => update("subtitle", event.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                <input
                  type="checkbox"
                  checked={config.mobileVisible}
                  onChange={(event) =>
                    update("mobileVisible", event.target.checked)
                  }
                  className="h-4 w-4 accent-primary"
                />{" "}
                Mobile visible
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                <input
                  type="checkbox"
                  checked={config.desktopVisible}
                  onChange={(event) =>
                    update("desktopVisible", event.target.checked)
                  }
                  className="h-4 w-4 accent-primary"
                />{" "}
                Desktop visible
              </label>
            </div>
            <label className="text-xs font-bold text-stone-600">
              Catégories exclues (slugs séparés par des virgules)
              <input
                className={inputClass}
                value={config.excludedCategories.join(", ")}
                onChange={(event) =>
                  update(
                    "excludedCategories",
                    event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  )
                }
              />
            </label>
          </div>
        </section>

        <section
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs"
          aria-labelledby="trending-preview-title"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <h2
                id="trending-preview-title"
                className="text-sm font-bold text-stone-900"
              >
                Aperçu du marché {marketCode}
              </h2>
            </div>
            <span className="text-xs font-medium text-stone-500">
              {preview?.topics.length || 0} sous-sections affichées
            </span>
          </div>
          <div className="space-y-2">
            {preview?.topics.map((topic, position) => {
              const topicKey = topic.id.replace("category:", "");
              return (
                <div
                  key={topic.id}
                  className="flex items-center gap-3 rounded-control border border-stone-200 bg-stone-50 p-3"
                >
                  <span className="w-5 text-center text-xs font-black text-stone-400">
                    {position + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-stone-900">
                      {topic.title}
                    </div>
                    <div className="text-xs text-stone-500">
                      {topic.listings.length} annonces · score interne{" "}
                      {topic.trend.score.toFixed(2)}
                    </div>
                  </div>
                  {pinned.has(topicKey) ? (
                    <span className="rounded-full bg-success-surface px-2 py-1 text-micro font-bold text-success">
                      Épinglé
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void toggleOverride(topicKey, "pin")}
                    aria-label={`${pinned.has(topicKey) ? "Désépingler" : "Épingler"} ${topic.title}`}
                    className="inline-flex h-control-sm w-control-sm items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 hover:border-primary-border hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Pin
                      className={`h-4 w-4 ${pinned.has(topicKey) ? "fill-current text-primary" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleOverride(topicKey, "hide")}
                    aria-label={`${hidden.has(topicKey) ? "Afficher" : "Masquer"} ${topic.title}`}
                    className="inline-flex h-control-sm w-control-sm items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 hover:border-primary-border hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <EyeOff
                      className={`h-4 w-4 ${hidden.has(topicKey) ? "text-danger" : ""}`}
                    />
                  </button>
                </div>
              );
            })}
            {!preview?.topics.length && (
              <div className="rounded-control border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                Aucun thème ne remplit les critères actuels.
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-success" /> scoring dynamique
            </span>
            <span className="inline-flex items-center gap-1">
              <Pin className="h-3.5 w-3.5 text-primary" /> overrides sans code
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
