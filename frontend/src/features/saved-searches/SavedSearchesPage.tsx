import { routes } from "../../configuration/routes";
import React, { useEffect, useState } from "react";
import { Search, Bell, Trash2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SavedSearch } from "../../types";
import { storageService } from "../../services/storage.service";
import { Button } from "../../design-system/primitives/Button";
import { EmptyState } from "../../design-system";
import { formatRelativeDate, plural } from "../../utilities/formatters";
import { useToast } from "../../app/providers/ToastProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { services } from "../../api/client/service-registry";
import type { WatchSubscription } from "@shongre/contracts/watch-subscriptions";
import { TaxonomyMigration } from "../../domains/taxonomy/taxonomy.migration";
import { majorToMinorAmount } from "@shongre/shared/money";

export const SavedSearchesPage: React.FC = () => {
  const { t, locale } = useTranslation();
  usePageMeta({
    title: t("meta.savedSearches.title"),
    description: t("meta.savedSearches.description"),
    canonicalPath: "/compte/recherches",
    noIndex: true,
  });

  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  // Browser persistence is restored after mount so SSR and hydration agree.
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [watches, setWatches] = useState<WatchSubscription[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setSearches([]);
      setWatches([]);
      return;
    }
    let active = true;
    const saved = storageService.getSavedSearches(
      currentUser.id,
      activeMarket.code,
    );
    setSearches(saved);
    void services.watchSubscriptions
      .list(currentUser.id, activeMarket.code)
      .then((alerts) => {
        if (!active) return;
        const activeTargetIds = new Set(
          alerts
            .filter((alert) => alert.targetType === "saved_search")
            .map((alert) => alert.targetId),
        );
        setWatches(alerts);
        setSearches(
          saved.map((search) => ({
            ...search,
            hasNotifications: activeTargetIds.has(search.id),
          })),
        );
      })
      .catch(() => {
        if (active) setWatches([]);
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, currentUser]);

  const handleAlertAction = async (search: SavedSearch) => {
    if (!currentUser) return;
    const existing = watches.find(
      (watch) =>
        watch.targetType === "saved_search" && watch.targetId === search.id,
    );
    if (existing) {
      navigate(routes.workspace.watchSubscriptions());
      return;
    }
    const categoryId = TaxonomyMigration.resolveCanonicalNode(
      search.filters.subCategorySlug || search.filters.categorySlug,
    )?.id;
    if (
      !search.filters.query &&
      !categoryId &&
      !search.filters.city &&
      search.filters.minPrice === undefined &&
      search.filters.maxPrice === undefined
    ) {
      toast.info(t("watch.save.criteriaRequired"));
      return;
    }
    try {
      const created = await services.watchSubscriptions.createOrReplace(
        currentUser.id,
        {
          marketCode: activeMarket.code,
          targetType: "saved_search",
          targetId: search.id,
          title: search.title,
          frequency: "daily",
          channels: { inApp: true, email: false, push: true },
          searchFilter: {
            ...(search.filters.query ? { query: search.filters.query } : {}),
            ...(categoryId ? { categoryId } : {}),
            ...(search.filters.city ? { city: search.filters.city } : {}),
            ...(search.filters.minPrice !== undefined
              ? {
                  minPriceMinor: majorToMinorAmount(
                    search.filters.minPrice,
                    activeMarket.currency,
                  ),
                }
              : {}),
            ...(search.filters.maxPrice !== undefined
              ? {
                  maxPriceMinor: majorToMinorAmount(
                    search.filters.maxPrice,
                    activeMarket.currency,
                  ),
                }
              : {}),
          },
        },
      );
      setWatches((current) => [created, ...current]);
      storageService.setSavedSearchNotifications(
        search.id,
        true,
        currentUser.id,
        activeMarket.code,
      );
      setSearches((current) =>
        current.map((item) =>
          item.id === search.id ? { ...item, hasNotifications: true } : item,
        ),
      );
      toast.success(t("watch.save.success"), t("watch.save.title"));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : t("watch.save.error"),
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    try {
      const alerts = await services.watchSubscriptions.list(
        currentUser.id,
        activeMarket.code,
      );
      const matchingAlert = alerts.find(
        (item) => item.targetType === "saved_search" && item.targetId === id,
      );
      if (matchingAlert) {
        await services.watchSubscriptions.remove(
          currentUser.id,
          activeMarket.code,
          matchingAlert.id,
        );
      }
      storageService.removeSavedSearch(id, currentUser.id, activeMarket.code);
      setSearches(
        storageService.getSavedSearches(currentUser.id, activeMarket.code),
      );
      toast.info(t("watch.savedSearch.removed"));
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : t("watch.savedSearch.removeError"),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900">
          Mes recherches sauvegardées ({searches.length})
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          {t(
            "savedsearches.savedSearchesPage.recevezDesAlertesInstantaneesDes",
          )}
        </p>
      </div>

      {searches.length > 0 ? (
        <div className="space-y-3">
          {searches.map((search) => (
            <div
              key={search.id}
              className="bg-white p-4 rounded-xl border border-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                  <Search className="w-icon-lg h-icon-lg" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-stone-900 truncate">
                    {search.title}
                  </h2>
                  <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                    <span>
                      {t("watch.savedSearch.created", {
                        date: formatRelativeDate(search.createdAt, locale),
                      })}
                    </span>
                    {search.matchCount !== undefined && (
                      <span>
                        •{" "}
                        {plural(
                          search.matchCount,
                          "annonce trouvée",
                          "annonces trouvées",
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                <button
                  type="button"
                  onClick={() => void handleAlertAction(search)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    search.hasNotifications
                      ? "bg-success-surface text-success border-success-border"
                      : "bg-stone-50 text-stone-600 border-stone-200"
                  }`}
                >
                  <Bell className="w-icon-sm h-icon-sm" />
                  <span>
                    {search.hasNotifications
                      ? t("watch.savedSearch.manage")
                      : t("watch.savedSearch.activate")}
                  </span>
                </button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    navigate(
                      routes.search({
                        query: search.filters.query,
                        category: search.filters.categorySlug,
                        subCategory: search.filters.subCategorySlug,
                        city: search.filters.city,
                        radius: search.filters.radiusKm,
                        minPrice: search.filters.minPrice,
                        maxPrice: search.filters.maxPrice,
                        sellerType: search.filters.sellerType,
                        delivery: search.filters.deliveryAvailable,
                        onlinePayment: search.filters.onlinePaymentAvailable,
                        onlyDeals: search.filters.onlyDeals,
                        condition: search.filters.conditions,
                        sortBy: search.filters.sortBy,
                        market: search.filters.marketCode,
                        attributes: search.filters.attributes,
                      }),
                    );
                  }}
                  rightIcon={<ArrowRight className="w-icon-sm h-icon-sm" />}
                >
                  {t("savedsearches.savedSearchesPage.voirLesAnnonces")}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleDelete(search.id)}
                  aria-label={`Supprimer la recherche « ${search.title} »`}
                  className="text-stone-500 hover:text-danger"
                >
                  <Trash2 className="w-icon-md h-icon-md" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search className="w-10 h-10 text-stone-400" />}
          title={t(
            "savedsearches.savedSearchesPage.aucuneRechercheSauvegardee",
          )}
          description={t(
            "savedsearches.savedSearchesPage.lancezUneRecherchePuisCliquez",
          )}
          action={
            <Button to={routes.search()} variant="primary">
              {t("savedsearches.savedSearchesPage.lancerUneRecherche")}
            </Button>
          }
        />
      )}
    </div>
  );
};
