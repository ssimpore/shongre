import { PAGE_SIZES } from "../../configuration/pagination.config";
import { IMAGE_SIZES } from "../../design-system/primitives/responsiveImage";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bell,
  CarFront,
  Filter,
  GitCompareArrows,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
  Drawer,
  DropdownMenu,
  FilterPanel,
  LocationSelector,
  Skeleton,
  StatePanel,
  Image,
} from "../../design-system";
import type {
  FilterPanelPresentation,
  LocationSelectorValue,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { storageService } from "../../services/storage.service";
import { AutoVehicleCard } from "./components/AutoVehicleCard";
import { formatAutoMoney, fuelLabels } from "./auto-format";
import { formatCurrencySymbol } from "../../utilities/formatters";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

const split = (value: string | null) =>
  (value || "").split(",").filter(Boolean);

interface FiltersProps {
  catalog: AutoCatalog;
  params: URLSearchParams;
  update: (key: string, value?: string) => void;
  updateLocation: (value: LocationSelectorValue) => void;
  locationSelectorId: string;
  onReset: () => void;
  onApply?: () => void;
  presentation?: FilterPanelPresentation;
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

const AutoFilters: React.FC<FiltersProps> = ({
  catalog,
  params,
  update,
  updateLocation,
  locationSelectorId,
  onReset,
  onApply,
  presentation = "surface",
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
      title="Filtres"
      presentation={presentation}
      onReset={onReset}
      footer={
        onApply ? (
          <Button fullWidth onClick={onApply}>
            Voir les véhicules
          </Button>
        ) : undefined
      }
    >
      <div className="text-xs font-bold text-text-main">
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
      <fieldset>
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
      <div className="text-xs font-bold text-text-main">
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
      <fieldset>
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
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Énergie
        </legend>
        <div className="space-y-1">
          {(
            [
              "petrol",
              "diesel",
              "electric",
              "hybrid",
              "plug_in_hybrid",
            ] as VehiclePublic["technical"]["fuelType"][]
          ).map((fuel) => (
            <label
              key={fuel}
              className="flex min-h-control-target cursor-pointer items-center gap-2 text-xs text-text-secondary"
            >
              <input
                type="checkbox"
                checked={fuels.includes(fuel)}
                onChange={() => toggleFuel(fuel)}
              />{" "}
              {fuelLabels[fuel]}
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
            { value: "manual", label: "Manuelle" },
            { value: "automatic", label: "Automatique" },
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
  const [params, setParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { activeMarket, currentLocale } = useMarketLocation();
  const toast = useToast();
  const [catalog, setCatalog] = useState<AutoCatalog | null>(null);
  const [vehicles, setVehicles] = useState<VehiclePublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [compared, setCompared] = useState<VehiclePublic[]>([]);

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
    setLoading(true);
    setError(false);
    services.auto
      .searchVehicles(query)
      .then((result) => {
        setVehicles(result.items);
        setTotal(result.total);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
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
    const active = await services.auto.toggleFavoriteVehicle(
      currentUser?.id || "guest",
      vehicle.id,
    );
    setVehicles((rows) =>
      rows.map((row) =>
        row.id === vehicle.id ? { ...row, isFavorite: active } : row,
      ),
    );
    toast.success(
      active ? "Véhicule ajouté aux favoris." : "Véhicule retiré des favoris.",
    );
  };
  const saveAlert = () => {
    if (!currentUser) {
      toast.info("Connectez-vous pour enregistrer cette alerte Auto.");
      return;
    }
    storageService.saveSearch({
      id: `auto-search-${Date.now()}`,
      title: query.query
        ? `Auto · ${query.query}`
        : `Auto · ${params.get("make") || "Tous les véhicules"}`,
      filters: {
        query: query.query,
        categorySlug: "auto",
        city: query.city,
        radiusKm: query.radiusKm,
        minPrice: query.minPriceMinor
          ? Math.round(query.minPriceMinor / 100)
          : undefined,
        maxPrice: query.maxPriceMinor
          ? Math.round(query.maxPriceMinor / 100)
          : undefined,
        marketCode: query.marketCode,
        attributes: Object.fromEntries(params.entries()),
      },
      createdAt: new Date().toISOString(),
      hasNotifications: true,
      matchCount: total,
    });
    toast.success("Alerte Auto enregistrée pour ces critères.");
  };

  return (
    <Container className="py-5 sm:py-7">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-bold text-primary">
            <CarFront className="h-icon-sm w-icon-sm" aria-hidden="true" />{" "}
            Shongre Auto
          </p>
          <h1 className="text-2xl font-black tracking-tight text-text-main sm:text-3xl">
            Voitures d’occasion
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {loading ? "…" : new Intl.NumberFormat(currentLocale).format(total)}{" "}
            véhicules
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            data-marketplace-action="saved-search.create"
            variant="outline"
            size="compact"
            leftIcon={<Bell className="h-icon-sm w-icon-sm" />}
            onClick={saveAlert}
          >
            Créer une alerte
          </Button>
          <Button
            data-marketplace-action="listing.publish"
            to="/deposer/auto"
            size="compact"
          >
            Vendre un véhicule
          </Button>
        </div>
      </div>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="mb-4 flex gap-2 rounded-card border border-border-base bg-bg-surface p-2 shadow-xs"
      >
        <label className="relative flex-1">
          <span className="sr-only">Rechercher un véhicule</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            value={params.get("query") || ""}
            onChange={(event) =>
              update("query", event.target.value || undefined)
            }
            placeholder="Marque, modèle, finition…"
            className="h-control-touch w-full rounded-control border-0 bg-bg-subtle pl-9 pr-3 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="inline-flex min-h-control-target items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold lg:hidden"
        >
          <Filter className="h-icon-sm w-icon-sm" aria-hidden="true" /> Filtres
        </button>
      </form>

      <div
        className={`grid min-w-0 gap-6 lg:grid-cols-sidebar ${compared.length ? "xl:grid-cols-search-compare-auto" : ""}`}
      >
        {catalog && (
          <aside
            className="hidden self-start lg:sticky lg:top-24 lg:block"
            aria-label="Filtres Auto"
          >
            <AutoFilters
              catalog={catalog}
              params={params}
              update={update}
              updateLocation={updateLocation}
              locationSelectorId="auto-location-selector-desktop"
              onReset={resetFilters}
            />
          </aside>
        )}
        <main className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-text-main lg:hidden"
            >
              <SlidersHorizontal
                className="h-icon-sm w-icon-sm"
                aria-hidden="true"
              />{" "}
              Affiner
            </button>
            <div className="ml-auto flex items-center gap-2 text-xs text-text-secondary">
              <span>Trier par</span>
              <DropdownMenu
                ariaLabel="Trier les véhicules"
                headerTitle="Trier par"
                placement="bottom-right"
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
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-64 rounded-card" />
              ))}
            </div>
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
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <AutoVehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  compared={compared.some((row) => row.id === vehicle.id)}
                  onCompare={toggleCompare}
                  onFavorite={favorite}
                />
              ))}
            </div>
          )}
        </main>
        {compared.length > 0 && (
          <aside className="hidden self-start rounded-card border border-border-base bg-bg-surface shadow-xs xl:block">
            <div className="flex items-center justify-between border-b border-border-subtle p-4">
              <h2 className="text-sm font-black">
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
                    <p className="mt-1 text-xs font-black text-primary">
                      {formatAutoMoney(vehicle.price, currentLocale)}
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
        <Drawer
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="Filtrer les véhicules"
        >
          <AutoFilters
            catalog={catalog}
            params={params}
            update={update}
            updateLocation={updateLocation}
            locationSelectorId="auto-location-selector-mobile"
            onReset={resetFilters}
            onApply={() => setFilterOpen(false)}
            presentation="drawer"
          />
        </Drawer>
      )}
      {compared.length > 0 && (
        <div className="fixed inset-x-3 bottom-mobile-nav-clearance-gutter z-sticky rounded-card border border-border-base bg-bg-surface p-3 shadow-overlay xl:hidden md:bottom-4 md:left-auto md:right-4 md:w-80">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black">
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
