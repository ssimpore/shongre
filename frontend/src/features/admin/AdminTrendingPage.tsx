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
import { TRENDING_ADMIN_CONSTRAINTS } from "../../domains/trending/trending.types";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Textarea,
  Checkbox,
} from "../../design-system/primitives/FormField";
import { usePageMeta } from "../../hooks/usePageMeta";
import { HomepageConfigurationPanel } from "./HomepageConfigurationPanel";

export const AdminTrendingPage: React.FC = () => {
  usePageMeta({
    title: "Tendances de la page d’accueil",
    description: "Piloter la section En ce moment sur Shongre.",
    canonicalPath: "/admin/tendances",
    noIndex: true,
  });

  const { activeMarket, currentLocale } = useMarketLocation();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState<TrendingAdminConfig | null>(null);
  const [preview, setPreview] = useState<TrendingSectionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const firstScopedMarket = currentUser?.marketScope?.countries?.[0];
  // Global staff scopes use "*" for authorization, but "*" is not an
  // operational marketplace. Persist discovery settings against the active
  // market so the public homepage reads the same configuration the admin just
  // edited.
  const marketCode =
    firstScopedMarket && firstScopedMarket !== "*"
      ? firstScopedMarket
      : activeMarket.code;

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

  const patchOverride = async (
    topicKey: string,
    patch: Partial<TrendingAdminConfig["overrides"][number]>,
  ) => {
    const current = config?.overrides.find(
      (override) => override.topicKey === topicKey,
    );
    const next = await services.admin.upsertTrendingOverride({
      ...current,
      ...patch,
      topicKey,
      marketCode,
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
        <RefreshCw className="mr-2 h-icon-md w-icon-md animate-spin" />
        Chargement de la configuration…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HomepageConfigurationPanel
        marketCode={marketCode}
        locale={currentLocale}
      />

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-xs sm:flex-row sm:items-end sm:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Flame className="h-icon-md w-icon-md" /> Découverte éditoriale
          </div>
          <h2 className="text-2xl font-black tracking-tight text-stone-900">
            En ce moment sur Shongre
          </h2>
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
            leftIcon={<RefreshCw className="h-icon-md w-icon-md" />}
          >
            Actualiser
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            disabled={isSaving}
            leftIcon={<Save className="h-icon-md w-icon-md" />}
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-trending-columns">
        <section
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs"
          aria-labelledby="trending-settings-title"
        >
          <div className="mb-5 flex items-center gap-2">
            <Settings2 className="h-icon-md w-icon-md text-primary" />
            <h2
              id="trending-settings-title"
              className="text-sm font-bold text-stone-900"
            >
              Règles d’affichage
            </h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-control border border-border-base bg-bg-subtle px-3 py-3">
              <Checkbox
                label="Section active"
                checked={config.enabled}
                onChange={(event) => update("enabled", event.target.checked)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mode de sélection">
                <select
                  value={config.selectionMode}
                  onChange={(event) =>
                    update(
                      "selectionMode",
                      event.target.value as TrendingAdminConfig["selectionMode"],
                    )
                  }
                  className="h-control-md w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm text-text-main focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <option value="automatic">Automatique</option>
                  <option value="manual">Manuel</option>
                  <option value="hybrid">Hybride</option>
                </select>
              </FormField>
              <FormField label="Annonces par sous-section">
                <Input
                  type="number"
                  min={TRENDING_ADMIN_CONSTRAINTS.listingsPerTopic.min}
                  max={TRENDING_ADMIN_CONSTRAINTS.listingsPerTopic.max}
                  step={TRENDING_ADMIN_CONSTRAINTS.listingsPerTopic.step}
                  value={config.listingsPerTopic}
                  onChange={(event) =>
                    update("listingsPerTopic", Number(event.target.value))
                  }
                />
              </FormField>
              <FormField label="Maximum de sous-sections">
                <Input
                  type="number"
                  min={Math.max(
                    TRENDING_ADMIN_CONSTRAINTS.topicCount.min,
                    config.minTopics,
                  )}
                  max={TRENDING_ADMIN_CONSTRAINTS.topicCount.max}
                  step={TRENDING_ADMIN_CONSTRAINTS.topicCount.step}
                  value={config.maxTopics}
                  onChange={(event) =>
                    update(
                      "maxTopics",
                      Math.max(config.minTopics, Number(event.target.value)),
                    )
                  }
                />
              </FormField>
              <FormField label="Minimum d’activité">
                <Input
                  type="number"
                  min={TRENDING_ADMIN_CONSTRAINTS.minimumActivity.min}
                  max={TRENDING_ADMIN_CONSTRAINTS.minimumActivity.max}
                  step={TRENDING_ADMIN_CONSTRAINTS.minimumActivity.step}
                  value={config.minimumActivity}
                  onChange={(event) =>
                    update("minimumActivity", Number(event.target.value))
                  }
                />
              </FormField>
              <FormField label="Période (jours)">
                <Input
                  type="number"
                  min={TRENDING_ADMIN_CONSTRAINTS.displayPeriodDays.min}
                  max={TRENDING_ADMIN_CONSTRAINTS.displayPeriodDays.max}
                  step={TRENDING_ADMIN_CONSTRAINTS.displayPeriodDays.step}
                  value={config.displayPeriodDays}
                  onChange={(event) =>
                    update("displayPeriodDays", Number(event.target.value))
                  }
                />
              </FormField>
              <FormField label="TTL cache (minutes)">
                <Input
                  type="number"
                  min={TRENDING_ADMIN_CONSTRAINTS.cacheTtlMinutes.min}
                  max={TRENDING_ADMIN_CONSTRAINTS.cacheTtlMinutes.max}
                  step={TRENDING_ADMIN_CONSTRAINTS.cacheTtlMinutes.step}
                  value={config.cacheTtlMinutes}
                  onChange={(event) =>
                    update("cacheTtlMinutes", Number(event.target.value))
                  }
                />
              </FormField>
            </div>
            <FormField label="Titre public">
              <Input
                maxLength={TRENDING_ADMIN_CONSTRAINTS.publicTitle.maxLength}
                value={config.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </FormField>
            <FormField label="Sous-titre public">
              <Textarea
                maxLength={TRENDING_ADMIN_CONSTRAINTS.publicSubtitle.maxLength}
                value={config.subtitle}
                onChange={(event) => update("subtitle", event.target.value)}
              />
            </FormField>
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
            <FormField label="Catégories exclues (slugs séparés par des virgules)">
              <Input
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
            </FormField>
          </div>
        </section>

        <section
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs"
          aria-labelledby="trending-preview-title"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-icon-md w-icon-md text-success" />
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
              const override = config.overrides.find(
                (item) => item.topicKey === topicKey,
              );
              return (
                <div
                  key={topic.id}
                  className="rounded-control border border-stone-200 bg-stone-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-black text-stone-400">
                      {position + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-stone-900">
                        {topic.title}
                      </div>
                      <div className="text-xs text-stone-500">
                        {topic.listings.length} annonces · tendance{" "}
                        {topic.trend.direction === "up" ? "en hausse" : "stable"}
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
                        className={`h-icon-md w-icon-md ${pinned.has(topicKey) ? "fill-current text-primary" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleOverride(topicKey, "hide")}
                      aria-label={`${hidden.has(topicKey) ? "Afficher" : "Masquer"} ${topic.title}`}
                      className="inline-flex h-control-sm w-control-sm items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 hover:border-primary-border hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <EyeOff
                        className={`h-icon-md w-icon-md ${hidden.has(topicKey) ? "text-danger" : ""}`}
                      />
                    </button>
                  </div>
                  <details className="mt-3 border-t border-stone-200 pt-3">
                    <summary className="cursor-pointer text-xs font-bold text-primary focus-visible:outline-2 focus-visible:outline-primary">
                      Édition éditoriale avancée
                    </summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <FormField label="Titre personnalisé">
                        <Input
                          defaultValue={override?.customTitle || ""}
                          onBlur={(event) =>
                            void patchOverride(topicKey, {
                              customTitle: event.target.value || undefined,
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Score de boost (0–1)">
                        <Input
                          type="number"
                          min={TRENDING_ADMIN_CONSTRAINTS.editorialBoost.min}
                          max={TRENDING_ADMIN_CONSTRAINTS.editorialBoost.max}
                          step={TRENDING_ADMIN_CONSTRAINTS.editorialBoost.step}
                          defaultValue={override?.boostScore || 0}
                          onBlur={(event) =>
                            void patchOverride(topicKey, {
                              boostScore: Number(event.target.value),
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Sous-titre personnalisé" className="sm:col-span-2">
                        <Textarea
                          defaultValue={override?.customSubtitle || ""}
                          onBlur={(event) =>
                            void patchOverride(topicKey, {
                              customSubtitle: event.target.value || undefined,
                            })
                          }
                        />
                      </FormField>
                      <FormField label="URL de l’image">
                        <Input
                          type="url"
                          defaultValue={override?.customImage?.src || ""}
                          onBlur={(event) =>
                            void patchOverride(topicKey, {
                              customImage: event.target.value
                                ? {
                                    src: event.target.value,
                                    alt:
                                      override?.customImage?.alt || topic.title,
                                  }
                                : undefined,
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Ordre manuel">
                        <Input
                          type="number"
                          min={TRENDING_ADMIN_CONSTRAINTS.sortOrder.min}
                          max={TRENDING_ADMIN_CONSTRAINTS.sortOrder.max}
                          step={TRENDING_ADMIN_CONSTRAINTS.sortOrder.step}
                          defaultValue={override?.sortOrder ?? position}
                          onBlur={(event) =>
                            void patchOverride(topicKey, {
                              sortOrder: Number(event.target.value),
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Début programmé">
                        <Input
                          type="datetime-local"
                          defaultValue={override?.startsAt?.slice(0, 16) || ""}
                          onBlur={(event) =>
                            void patchOverride(topicKey, {
                              startsAt: event.target.value
                                ? new Date(event.target.value).toISOString()
                                : undefined,
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Fin programmée">
                        <Input
                          type="datetime-local"
                          defaultValue={override?.endsAt?.slice(0, 16) || ""}
                          onBlur={(event) =>
                            void patchOverride(topicKey, {
                              endsAt: event.target.value
                                ? new Date(event.target.value).toISOString()
                                : undefined,
                            })
                          }
                        />
                      </FormField>
                    </div>
                  </details>
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
              <Check className="h-icon-sm w-icon-sm text-success" /> scoring
              dynamique
            </span>
            <span className="inline-flex items-center gap-1">
              <Pin className="h-icon-sm w-icon-sm text-primary" /> overrides
              sans code
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
