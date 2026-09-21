import { PAGE_SIZES } from "../../configuration/pagination.config";
import { IMAGE_SIZES } from "@shongre/shared";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bell, CarFront, GitCompareArrows, X } from "lucide-react";
import type {
  AutoCatalog,
  VehiclePublic,
  VehicleSearchQuery,
} from "@shongre/contracts/auto";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Button,
  Container,
  DropdownMenu,
  FilterChip,
  FilterPanel,
  LocationSelector,
  ListingCardSkeleton,
  ListingGrid,
  SearchActiveFiltersBar,
  SearchMapResultsLayout,
  SearchResultsToolbar,
  SearchFilterDrawer,
  SearchSortControl,
  Skeleton,
  StatePanel,
  Image,
  ViewModeToggle,
  countActiveSearchParams,
  useSearchFilterDisclosure,
} from "../../design-system";
import type { LocationSelectorValue } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { AutoVehicleCard } from "./components/AutoVehicleCard";
import { formatAutoMoney, autoOptions } from "./auto-format";
import { formatCurrencySymbol } from "../../utilities/formatters";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { CANONICAL_TAXONOMY_IDS } from "@shongre/contracts/taxonomy-domain-ids";
import { routes } from "../../configuration/routes";
import { useAutoVehicleFavorites } from "./useAutoVehicleFavorites";
import { resolvePublicMapCoordinates } from "../../configuration/geoCoordinates";
import type { SearchMapItem } from "../search/SearchResultsMap";

const SearchResultsMap = React.lazy(() =>
  import("../search/SearchResultsMap").then((module) => ({
    default: module.SearchResultsMap,
  })),
);

const split = (value: string | null) =>
  (value || "").split(",").filter(Boolean);

interface FiltersProps {
  panelId: string;
  catalog: AutoCatalog;
  params: URLSearchParams;
  update: (key: string, value?: string) => void;
  updateLocation: (value: LocationSelectorValue) => void;
  locationSelectorId: string;
  onReset: () => void;
  onApply?: () => void;
  activeSectionId?: string;
}

const AUTO_FILTER_KEYS = [
  "type",
  "make",
  "model",
  "minPrice",
  "maxPrice",
  "minYear",
  "maxYear",
  "maxMileage",
  "body",
  "minPower",
  "maxPower",
  "minBattery",
  "minRange",
  "city",
  "radius",
  "fuel",
  "transmission",
  "seller",
  "warranty",
  "financing",
] as const;

const AUTO_SUMMARY_FILTER_KEYS = AUTO_FILTER_KEYS.filter(
  (key) => key !== "city" && key !== "radius",
);

const AutoFilters: React.FC<FiltersProps> = ({
  panelId,
  catalog,
  params,
  update,
  updateLocation,
  locationSelectorId,
  onReset,
  onApply,
  activeSectionId,
}) => {
  const { currentLocale } = useMarketLocation();
  const currencySymbol = formatCurrencySymbol(
    catalog.config.currency,
    currentLocale,
  );
  const fuels = split(params.get("fuel"));
  const bodyTypeOptions =
    catalog.attributes.find((attribute) => attribute.id === "bodyType")
      ?.options || [];
  const toggleFuel = (fuel: string) => {
    const next = fuels.includes(fuel)
      ? fuels.filter((value) => value !== fuel)
      : [...fuels, fuel];
    update("fuel", next.length ? next.join(",") : undefined);
  };
  return (
    <FilterPanel
      id={panelId}
      activeSectionId={activeSectionId}
      onReset={onReset}
      footer={
        onApply ? (
          <Button fullWidth onClick={onApply}>
            Voir les véhicules
          </Button>
        ) : undefined
      }
    >
      <div
        data-filter-section="auto-type"
        className="text-xs font-bold text-text-main"
      >
        <span className="block">Type de véhicule</span>
        <DropdownMenu
          className="mt-2"
          ariaLabel="Type de véhicule"
          headerTitle="Type de véhicule"
          fullWidth
          value={params.get("type") || "car"}
          onChange={(value) => update("type", value)}
          options={catalog.vehicleTypes.map((type) => ({
            value: type.type,
            label: type.label,
          }))}
        />
      </div>
      <div className="text-xs font-bold text-text-main">
        <span className="block">Carrosserie</span>
        <DropdownMenu
          className="mt-2"
          ariaLabel="Carrosserie"
          headerTitle="Carrosserie"
          fullWidth
          value={params.get("body") || ""}
          onChange={(value) => update("body", value || undefined)}
          options={[
            { value: "", label: "Toutes" },
            ...bodyTypeOptions.map((option) => ({
              value: option.value,
              label: option.label,
            })),
          ]}
        />
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Puissance
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="Puissance minimum"
            inputMode="numeric"
            value={params.get("minPower") || ""}
            onChange={(event) =>
              update("minPower", event.target.value || undefined)
            }
            placeholder="Min. ch"
            className="h-control-touch min-w-0 rounded-control border border-border-base px-3 text-xs"
          />
          <input
            aria-label="Puissance maximum"
            inputMode="numeric"
            value={params.get("maxPower") || ""}
            onChange={(event) =>
              update("maxPower", event.target.value || undefined)
            }
            placeholder="Max. ch"
            className="h-control-touch min-w-0 rounded-control border border-border-base px-3 text-xs"
          />
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Électrique & hybride rechargeable
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="Capacité de batterie minimum"
            inputMode="decimal"
            value={params.get("minBattery") || ""}
            onChange={(event) =>
              update("minBattery", event.target.value || undefined)
            }
            placeholder="Min. kWh"
            className="h-control-touch min-w-0 rounded-control border border-border-base px-3 text-xs"
          />
          <input
            aria-label="Autonomie électrique minimum"
            inputMode="numeric"
            value={params.get("minRange") || ""}
            onChange={(event) =>
              update("minRange", event.target.value || undefined)
            }
            placeholder="Min. km"
            className="h-control-touch min-w-0 rounded-control border border-border-base px-3 text-xs"
          />
        </div>
      </fieldset>
      <fieldset data-filter-section="auto-location">
        <legend className="mb-2 text-xs font-bold text-text-main">
          Localisation
        </legend>
        <LocationSelector
          id={locationSelectorId}
          city={params.get("city") || ""}
          radiusKm={
            params.get("radius") ? Number(params.get("radius")) : undefined
          }
          onChange={updateLocation}
        />
      </fieldset>
      <div
        data-filter-section="auto-make"
        className="text-xs font-bold text-text-main"
      >
        <span className="block">Marque</span>
        <DropdownMenu
          className="mt-2"
          ariaLabel="Marque"
          headerTitle="Marque"
          fullWidth
          searchable
          searchPlaceholder="Rechercher une marque"
          value={params.get("make") || ""}
          onChange={(value) => update("make", value || undefined)}
          options={[
            { value: "", label: "Toutes les marques" },
            ...catalog.vehicleCatalog
              .filter((entry) => entry.kind === "make")
              .map((entry) => ({ value: entry.id, label: entry.label })),
          ]}
        />
      </div>
      <div className="text-xs font-bold text-text-main">
        <span className="block">Modèle</span>
        <DropdownMenu
          className="mt-2"
          ariaLabel="Modèle"
          headerTitle="Modèle"
          fullWidth
          searchable
          searchPlaceholder="Rechercher un modèle"
          value={params.get("model") || ""}
          onChange={(value) => update("model", value || undefined)}
          options={[
            { value: "", label: "Tous les modèles" },
            ...catalog.vehicleCatalog
              .filter(
                (entry) =>
                  entry.kind === "model" &&
                  (!params.get("make") ||
                    entry.parentId === params.get("make")),
              )
              .map((entry) => ({ value: entry.id, label: entry.label })),
          ]}
        />
      </div>
      <fieldset data-filter-section="auto-price">
        <legend className="mb-2 text-xs font-bold text-text-main">Prix</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="Prix minimum"
            inputMode="numeric"
            value={params.get("minPrice") || ""}
            onChange={(event) =>
              update("minPrice", event.target.value || undefined)
            }
            placeholder={`Min. ${currencySymbol}`}
            className="h-control-touch min-w-0 rounded-control border border-border-base px-3 text-xs"
          />
          <input
            aria-label="Prix maximum"
            inputMode="numeric"
            value={params.get("maxPrice") || ""}
            onChange={(event) =>
              update("maxPrice", event.target.value || undefined)
            }
            placeholder={`Max. ${currencySymbol}`}
            className="h-control-touch min-w-0 rounded-control border border-border-base px-3 text-xs"
          />
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">Année</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="Année minimum"
            inputMode="numeric"
            value={params.get("minYear") || ""}
            onChange={(event) =>
              update("minYear", event.target.value || undefined)
            }
            placeholder="2015"
            className="h-control-touch min-w-0 rounded-control border border-border-base px-3 text-xs"
          />
          <input
            aria-label="Année maximum"
            inputMode="numeric"
            value={params.get("maxYear") || ""}
            onChange={(event) =>
              update("maxYear", event.target.value || undefined)
            }
            placeholder="2026"
            className="h-control-touch min-w-0 rounded-control border border-border-base px-3 text-xs"
          />
        </div>
      </fieldset>
      <div className="text-xs font-bold text-text-main">
        <span className="block">Kilométrage maximum</span>
        <DropdownMenu
          className="mt-2"
          ariaLabel="Kilométrage maximum"
          headerTitle="Kilométrage maximum"
          fullWidth
          value={params.get("maxMileage") || ""}
          onChange={(value) => update("maxMileage", value || undefined)}
          options={[
            { value: "", label: "Sans maximum" },
            { value: "30000", label: "30 000 km" },
            { value: "60000", label: "60 000 km" },
            { value: "100000", label: "100 000 km" },
            { value: "150000", label: "150 000 km" },
          ]}
        />
      </div>
      <fieldset data-filter-section="auto-energy">
        <legend className="mb-2 text-xs font-bold text-text-main">
          Énergie
        </legend>
        <div className="space-y-1">
          {autoOptions(catalog, "fuel_type", currentLocale).map((fuel) => (
            <label
              key={fuel.value}
              className="flex min-h-control-target cursor-pointer items-center gap-2 text-xs text-text-secondary"
            >
              <input
                type="checkbox"
                checked={fuels.includes(fuel.value)}
                onChange={() => toggleFuel(fuel.value)}
              />{" "}
              {fuel.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="text-xs font-bold text-text-main">
        <span className="block">Boîte de vitesses</span>
        <DropdownMenu
          className="mt-2"
          ariaLabel="Boîte de vitesses"
          headerTitle="Boîte de vitesses"
          fullWidth
          value={params.get("transmission") || ""}
          onChange={(value) => update("transmission", value || undefined)}
          options={[
            { value: "", label: "Toutes" },
            ...autoOptions(catalog, "transmission", currentLocale),
          ]}
        />
      </div>
      <div className="text-xs font-bold text-text-main">
        <span className="block">Vendeur</span>
        <DropdownMenu
          className="mt-2"
          ariaLabel="Vendeur"
          headerTitle="Vendeur"
          fullWidth
          value={params.get("seller") || ""}
          onChange={(value) => update("seller", value || undefined)}
          options={[
            { value: "", label: "Tous" },
            { value: "individual", label: "Particulier" },
            { value: "dealer", label: "Professionnel" },
          ]}
        />
      </div>
      <fieldset className="space-y-1 border-t border-border-subtle pt-4">
        <legend className="sr-only">Services</legend>
        <label className="flex min-h-control-target items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={params.get("warranty") === "true"}
            onChange={(event) =>
              update("warranty", event.target.checked ? "true" : undefined)
            }
          />{" "}
          Avec garantie uniquement
        </label>
        <label className="flex min-h-control-target items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={params.get("financing") === "true"}
            onChange={(event) =>
              update("financing", event.target.checked ? "true" : undefined)
            }
          />{" "}
          Estimation mensuelle disponible
        </label>
      </fieldset>
    </FilterPanel>
  );
};

export const AutoSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const toast = useToast();
  const [catalog, setCatalog] = useState<AutoCatalog | null>(null);
  const [vehicles, setVehicles] = useState<VehiclePublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const {
    filtersExpanded: filterOpen,
    activeFilterSection,
    openFilters,
    closeFilters,
  } = useSearchFilterDisclosure();
  const requestedView = params.get("view");
  const viewMode =
    requestedView === "list" || requestedView === "map"
      ? requestedView
      : "grid";
  const [compared, setCompared] = useState<VehiclePublic[]>([]);
  const currentUserId = currentUser?.id;
  const {
    favoriteIds: favoriteVehicleIds,
    loadState: favoriteLoadState,
    refresh: loadFavoriteVehicleIds,
    toggleFavorite: toggleFavoriteVehicle,
  } = useAutoVehicleFavorites(currentUserId, activeMarket.code);

  const update = (key: string, value?: string) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const updateLocation = (value: LocationSelectorValue) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value.city) next.set("city", value.city);
        else next.delete("city");
        if (value.radiusKm) next.set("radius", String(value.radiusKm));
        else next.delete("radius");
        return next;
      },
      { replace: true },
    );
  };

  const resetFilters = () => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        AUTO_FILTER_KEYS.forEach((key) => next.delete(key));
        return next;
      },
      { replace: true },
    );
  };

  const clearAllSearch = () => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("query");
        AUTO_FILTER_KEYS.forEach((key) => next.delete(key));
        return next;
      },
      { replace: true },
    );
  };

  const activeFacetCount = countActiveSearchParams(
    params,
    AUTO_SUMMARY_FILTER_KEYS,
  );
  const activeLocation = params.get("city");
  const activeRadius = params.get("radius");
  const activeFilterCount =
    (params.get("query") ? 1 : 0) +
    (activeLocation || activeRadius ? 1 : 0) +
    activeFacetCount;
  const mapItems = useMemo<SearchMapItem[]>(
    () =>
      vehicles.flatMap((vehicle) => {
        const coordinates = resolvePublicMapCoordinates({
          id: vehicle.id,
          city: vehicle.locationLabel,
          marketCode: activeMarket.code,
        });
        if (!coordinates) return [];
        return [
          {
            id: vehicle.id,
            title: vehicle.title,
            href: routes.auto.vehicle(vehicle.slug),
            locationLabel: vehicle.locationLabel,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            eyebrow: `${vehicle.makeLabel} · ${vehicle.modelLabel}`,
            detail: formatAutoMoney(vehicle.price, currentLocale, convertMoney),
          },
        ];
      }),
    [activeMarket.code, convertMoney, currentLocale, vehicles],
  );
  const mappedVehicleIds = useMemo(
    () => new Set(mapItems.map(({ id }) => id)),
    [mapItems],
  );

  const query = useMemo<VehicleSearchQuery>(
    () => ({
      marketCode: activeMarket.code,
      query: params.get("query") || undefined,
      vehicleTypes: (split(params.get("type")).length
        ? split(params.get("type"))
        : ["car"]) as VehicleSearchQuery["vehicleTypes"],
      makeIds: split(params.get("make")),
      modelIds: split(params.get("model")),
      bodyTypes: split(params.get("body")),
      fuelTypes: split(params.get("fuel")) as VehicleSearchQuery["fuelTypes"],
      transmissions: split(
        params.get("transmission"),
      ) as VehicleSearchQuery["transmissions"],
      sellerTypes: split(
        params.get("seller"),
      ) as VehicleSearchQuery["sellerTypes"],
      minPriceMinor: params.get("minPrice")
        ? Number(params.get("minPrice")) * 100
        : undefined,
      maxPriceMinor: params.get("maxPrice")
        ? Number(params.get("maxPrice")) * 100
        : undefined,
      minYear: params.get("minYear")
        ? Number(params.get("minYear"))
        : undefined,
      maxYear: params.get("maxYear")
        ? Number(params.get("maxYear"))
        : undefined,
      maxMileage: params.get("maxMileage")
        ? Number(params.get("maxMileage"))
        : undefined,
      minPowerHp: params.get("minPower")
        ? Number(params.get("minPower"))
        : undefined,
      maxPowerHp: params.get("maxPower")
        ? Number(params.get("maxPower"))
        : undefined,
      minBatteryCapacityKwh: params.get("minBattery")
        ? Number(params.get("minBattery"))
        : undefined,
      minElectricRangeKm: params.get("minRange")
        ? Number(params.get("minRange"))
        : undefined,
      city: params.get("city") || undefined,
      radiusKm:
        params.get("city") && params.get("radius")
          ? Number(params.get("radius"))
          : undefined,
      warrantyOnly: params.get("warranty") === "true" || undefined,
      financingAvailable: params.get("financing") === "true" || undefined,
      sort: (params.get("sort") || "relevance") as VehicleSearchQuery["sort"],
      limit: PAGE_SIZES.verticalSearch,
    }),
    [activeMarket.code, params],
  );

  usePageMeta({
    title: query.query
      ? `Véhicules pour « ${query.query} »`
      : "Voitures d’occasion",
    description:
      "Recherchez et comparez des véhicules avec leurs caractéristiques, leur historique déclaré et des informations de confiance lisibles.",
    canonicalPath: "/auto",
    noIndex: Boolean(query.query),
  });

  useEffect(() => {
    services.auto
      .getCatalog(activeMarket.code)
      .then(setCatalog)
      .catch(() => setError(true));
  }, [activeMarket.code]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    services.auto
      .searchVehicles(query)
      .then((result) => {
        if (cancelled) return;
        setVehicles(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const toggleCompare = (vehicle: VehiclePublic) => {
    setCompared((current) => {
      if (current.some((row) => row.id === vehicle.id))
        return current.filter((row) => row.id !== vehicle.id);
      if (current.length >= (catalog?.config.comparisonLimit || 4)) {
        toast.info(
          `Vous pouvez comparer jusqu’à ${catalog?.config.comparisonLimit || 4} véhicules.`,
        );
        return current;
      }
      return [...current, vehicle];
    });
  };
  const favorite = async (vehicle: VehiclePublic) => {
    if (!currentUserId) {
      navigate(
        routes.auth.login(
          `${window.location.pathname}${window.location.search}`,
        ),
      );
      return;
    }
    if (favoriteLoadState !== "ready") {
      await loadFavoriteVehicleIds();
      return;
    }
    const active = await toggleFavoriteVehicle(vehicle.id);
    toast.success(
      active ? "Véhicule ajouté aux favoris." : "Véhicule retiré des favoris.",
    );
  };
  const saveAlert = async () => {
    if (!currentUser) {
      toast.info(t("watch.auto.loginRequired"));
      return;
    }
    const id = `auto-search-${Date.now()}`;
    const title = query.query
      ? t("watch.auto.queryTitle", { query: query.query })
      : t("watch.auto.makeTitle", {
          make: params.get("make") || t("watch.auto.allVehicles"),
        });
    try {
      await services.watchSubscriptions.createOrReplace({
        marketCode: query.marketCode,
        targetType: "saved_search",
        targetId: id,
        title,
        frequency: "immediate",
        channels: { inApp: true, email: false, push: true },
        searchFilter: {
          categoryId: CANONICAL_TAXONOMY_IDS.vehicles,
          ...(query.query ? { query: query.query } : {}),
          ...(query.city ? { city: query.city } : {}),
          ...(query.minPriceMinor !== undefined
            ? { minPriceMinor: query.minPriceMinor }
            : {}),
          ...(query.maxPriceMinor !== undefined
            ? { maxPriceMinor: query.maxPriceMinor }
            : {}),
        },
      });
      toast.success(t("watch.auto.success"));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : t("watch.auto.error"),
      );
    }
  };

  return (
    <Container width="listingResults" className="py-4 sm:py-6">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-bold text-primary">
            <CarFront className="h-icon-sm w-icon-sm" aria-hidden="true" />{" "}
            Shongre Auto
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl">
            Voitures d’occasion
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            data-marketplace-action="listing.publish"
            to="/deposer/auto"
            size="compact"
          >
            Vendre un véhicule
          </Button>
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <SearchActiveFiltersBar onClear={clearAllSearch}>
          {params.get("query") ? (
            <FilterChip
              tone="query"
              label={params.get("query") || undefined}
              onRemove={() => update("query", undefined)}
            >
              “{params.get("query")}”
            </FilterChip>
          ) : null}
          {activeLocation || activeRadius ? (
            <FilterChip onRemove={() => updateLocation({})}>
              {activeLocation || t("ui.searchControls.zoneSelected")}
              {activeRadius ? ` (+${activeRadius} km)` : ""}
            </FilterChip>
          ) : null}
          {activeFacetCount > 0 ? (
            <FilterChip
              label={t(
                activeFacetCount === 1
                  ? "ui.searchControls.criterion"
                  : "ui.searchControls.criteria",
                { count: activeFacetCount },
              )}
              onRemove={() =>
                setParams(
                  (current) => {
                    const next = new URLSearchParams(current);
                    AUTO_SUMMARY_FILTER_KEYS.forEach((key) => next.delete(key));
                    return next;
                  },
                  { replace: true },
                )
              }
            >
              {t(
                activeFacetCount === 1
                  ? "ui.searchControls.criterion"
                  : "ui.searchControls.criteria",
                { count: activeFacetCount },
              )}
            </FilterChip>
          ) : null}
        </SearchActiveFiltersBar>
      ) : null}

      <div
        className={`grid min-w-0 gap-6 ${
          compared.length ? "xl:grid-cols-content-aside-xs" : "lg:grid-cols-1"
        }`}
      >
        <div className="min-w-0">
          <SearchResultsToolbar
            resultLabel={
              loading
                ? "Recherche…"
                : `${new Intl.NumberFormat(currentLocale).format(total)} véhicule${total > 1 ? "s" : ""}`
            }
            filterPanelId="auto-filter-panel"
            filtersExpanded={filterOpen}
            activeFilterSection={activeFilterSection}
            filterTriggers={[
              {
                sectionId: "auto-type",
                label: t("ui.filterPanel.quick.vehicleType"),
                active: Boolean(params.get("type")),
              },
              {
                sectionId: "auto-location",
                label: t("ui.filterPanel.quick.location"),
                active: Boolean(params.get("city")),
              },
              {
                sectionId: "auto-make",
                label: t("ui.filterPanel.quick.makeModel"),
                active: Boolean(params.get("make") || params.get("model")),
              },
              {
                sectionId: "auto-energy",
                label: t("ui.filterPanel.quick.energy"),
                active: Boolean(params.get("fuel")),
              },
              {
                sectionId: "auto-price",
                label: t("ui.filterPanel.quick.price"),
                active: Boolean(
                  params.get("minPrice") || params.get("maxPrice"),
                ),
              },
            ]}
            activeFilterCount={activeFilterCount}
            onOpenFilters={openFilters}
            actions={
              <Button
                data-marketplace-action="saved-search.create"
                aria-label="Créer une alerte"
                variant="outline"
                size="md"
                leftIcon={<Bell className="h-icon-sm w-icon-sm" />}
                onClick={saveAlert}
              >
                <span className="hidden sm:inline">Créer une alerte</span>
              </Button>
            }
            viewControls={
              <ViewModeToggle
                viewMode={viewMode}
                onChange={(mode) =>
                  update("view", mode === "grid" ? undefined : mode)
                }
                showMap
                size="md"
              />
            }
            sortControl={
              <SearchSortControl>
                <DropdownMenu
                  ariaLabel="Trier les véhicules"
                  headerTitle="Trier par"
                  placement="bottom-right"
                  size="md"
                  value={query.sort}
                  onChange={(value) => update("sort", value)}
                  options={[
                    { value: "relevance", label: "Pertinence" },
                    { value: "price_asc", label: "Prix croissant" },
                    { value: "price_desc", label: "Prix décroissant" },
                    { value: "year_desc", label: "Année récente" },
                    { value: "mileage_asc", label: "Kilométrage" },
                    { value: "newest", label: "Plus récentes" },
                  ]}
                />
              </SearchSortControl>
            }
          />
          <h2 className="sr-only">{t("search.resultsHeading")}</h2>
          {loading && viewMode === "map" ? (
            <div
              role="status"
              aria-label={t("common.loadingMap")}
              className="h-search-map rounded-card border border-border-base bg-bg-surface p-3"
            >
              <Skeleton className="h-full w-full rounded-card" />
            </div>
          ) : loading ? (
            <ListingGrid variant={viewMode === "list" ? "list" : "grid"}>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="flex min-w-0 flex-col gap-2">
                  <ListingCardSkeleton />
                  <Skeleton shape="control" className="w-full" />
                </div>
              ))}
            </ListingGrid>
          ) : error ? (
            <StatePanel
              variant="error"
              title="Recherche Auto indisponible"
              description="Réessayez dans quelques instants."
              action={
                <Button onClick={() => setParams(params)}>Réessayer</Button>
              }
            />
          ) : vehicles.length === 0 ? (
            <StatePanel
              variant="notFound"
              title="Aucun véhicule pour ces critères"
              description="Élargissez le prix, l’année ou l’énergie pour voir davantage de résultats."
            />
          ) : viewMode === "map" ? (
            mapItems.length ? (
              <SearchMapResultsLayout
                resultsLabel="Véhicules sur la carte"
                results={
                  <ListingGrid variant="list">
                    {vehicles
                      .filter((vehicle) => mappedVehicleIds.has(vehicle.id))
                      .map((vehicle) => {
                        const isCompared = compared.some(
                          (row) => row.id === vehicle.id,
                        );
                        return (
                          <div
                            key={vehicle.id}
                            data-search-map-result-card="true"
                            className="flex min-w-0 flex-col gap-2"
                          >
                            <AutoVehicleCard
                              vehicle={vehicle}
                              displayVariant="list"
                              isFavorite={favoriteVehicleIds.has(vehicle.id)}
                              favoriteLoadState={favoriteLoadState}
                              onFavorite={favorite}
                              onFavoriteRetry={loadFavoriteVehicleIds}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant={isCompared ? "primary" : "secondary"}
                              fullWidth
                              aria-pressed={isCompared}
                              aria-label={`${isCompared ? "Retirer" : "Ajouter"} ${
                                vehicle.title
                              } ${isCompared ? "de" : "à"} la comparaison`}
                              leftIcon={
                                <GitCompareArrows
                                  className="h-icon-sm w-icon-sm"
                                  aria-hidden="true"
                                />
                              }
                              onClick={() => toggleCompare(vehicle)}
                            >
                              {isCompared
                                ? "Retirer du comparateur"
                                : "Comparer"}
                            </Button>
                          </div>
                        );
                      })}
                  </ListingGrid>
                }
                map={
                  <React.Suspense
                    fallback={
                      <div
                        role="status"
                        aria-label={t("common.loadingMap")}
                        className="h-full rounded-card border border-border-base bg-bg-surface p-3"
                      >
                        <Skeleton className="h-full w-full rounded-card" />
                      </div>
                    }
                  >
                    <SearchResultsMap items={mapItems} layout="split" />
                  </React.Suspense>
                }
              />
            ) : (
              <StatePanel
                variant="notFound"
                title={t("ui.searchResultsMap.emptyTitle")}
                description={t("ui.searchResultsMap.emptyDescription")}
              />
            )
          ) : (
            <ListingGrid variant={viewMode === "list" ? "list" : "grid"}>
              {vehicles.map((vehicle, index) => {
                const isCompared = compared.some(
                  (row) => row.id === vehicle.id,
                );
                return (
                  <div key={vehicle.id} className="flex min-w-0 flex-col gap-2">
                    <AutoVehicleCard
                      vehicle={vehicle}
                      /* The first result is above the fold on every viewport,
                         and it is the page's LCP candidate. Lazy-loading it put
                         its cover behind every other request on the page. */
                      imagePriority={index === 0}
                      displayVariant={viewMode === "list" ? "list" : "grid"}
                      isFavorite={favoriteVehicleIds.has(vehicle.id)}
                      favoriteLoadState={favoriteLoadState}
                      onFavorite={favorite}
                      onFavoriteRetry={loadFavoriteVehicleIds}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={isCompared ? "primary" : "secondary"}
                      fullWidth
                      aria-pressed={isCompared}
                      aria-label={`${isCompared ? "Retirer" : "Ajouter"} ${
                        vehicle.title
                      } ${isCompared ? "de" : "à"} la comparaison`}
                      leftIcon={
                        <GitCompareArrows
                          className="h-icon-sm w-icon-sm"
                          aria-hidden="true"
                        />
                      }
                      onClick={() => toggleCompare(vehicle)}
                    >
                      {isCompared ? "Retirer du comparateur" : "Comparer"}
                    </Button>
                  </div>
                );
              })}
            </ListingGrid>
          )}
        </div>
        {compared.length > 0 && (
          <aside className="hidden self-start rounded-card border border-border-base bg-bg-surface shadow-xs xl:block">
            <div className="flex items-center justify-between border-b border-border-subtle p-4">
              <h2 className="text-sm font-bold">
                Comparer {compared.length} véhicule
                {compared.length > 1 ? "s" : ""}
              </h2>
              <button
                type="button"
                onClick={() => setCompared([])}
                aria-label="Vider la comparaison"
              >
                <X className="h-icon-sm w-icon-sm" />
              </button>
            </div>
            <div className="divide-y divide-border-subtle">
              {compared.map((vehicle) => (
                <div key={vehicle.id} className="flex gap-3 p-3">
                  <Image
                    src={vehicle.mediaUrls[0]}
                    alt=""
                    sizes={IMAGE_SIZES.compact}
                    className="h-16 w-20 rounded-control object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-bold">
                      {vehicle.title}
                    </p>
                    <p className="mt-1 text-xs font-bold text-primary">
                      {formatAutoMoney(
                        vehicle.price,
                        currentLocale,
                        convertMoney,
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCompare(vehicle)}
                    aria-label={`Retirer ${vehicle.title}`}
                  >
                    <X className="h-icon-xs w-icon-xs" />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4">
              {compared.length >= 2 ? (
                <Button
                  to={`/auto/comparer?ids=${compared.map((row) => row.id).join(",")}`}
                  fullWidth
                  size="compact"
                >
                  Voir la comparaison
                </Button>
              ) : (
                <Button fullWidth size="compact" disabled>
                  Sélectionnez encore un véhicule
                </Button>
              )}
            </div>
          </aside>
        )}
      </div>

      {catalog && (
        <SearchFilterDrawer
          isOpen={filterOpen}
          onClose={closeFilters}
          title="Filtrer les véhicules"
        >
          <AutoFilters
            panelId="auto-filter-panel"
            catalog={catalog}
            params={params}
            update={update}
            updateLocation={updateLocation}
            locationSelectorId="auto-location-selector"
            onReset={resetFilters}
            onApply={closeFilters}
            activeSectionId={activeFilterSection}
          />
        </SearchFilterDrawer>
      )}
      {compared.length > 0 && (
        <div className="fixed inset-x-3 bottom-mobile-nav-clearance-gutter z-sticky rounded-card border border-border-base bg-bg-surface p-3 shadow-overlay xl:hidden md:bottom-4 md:left-auto md:right-4 md:w-80">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold">
                {compared.length} véhicule{compared.length > 1 ? "s" : ""}{" "}
                sélectionné{compared.length > 1 ? "s" : ""}
              </p>
              <p className="text-micro text-text-muted">
                2 minimum, {catalog?.config.comparisonLimit || 4} maximum
              </p>
            </div>
            {compared.length >= 2 ? (
              <Button
                to={`/auto/comparer?ids=${compared.map((row) => row.id).join(",")}`}
                size="sm"
                leftIcon={<GitCompareArrows className="h-icon-sm w-icon-sm" />}
              >
                Comparer
              </Button>
            ) : (
              <Button size="sm" disabled>
                +1 véhicule
              </Button>
            )}
          </div>
        </div>
      )}
    </Container>
  );
};
