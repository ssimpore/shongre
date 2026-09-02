import React, { useEffect, useState } from "react";
import { useTranslation } from "../../i18n/I18nProvider";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Minus, ShieldCheck, X } from "lucide-react";
import type { VehiclePublic } from "@shongre/contracts/auto";
import { services } from "../../api/client/service-registry";
import {
  Button,
  Container,
  Image,
  Skeleton,
  StatePanel,
  ScrollableRegion,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import {
  formatAutoMileage,
  formatAutoMoney,
  fuelLabels,
  transmissionLabels,
} from "./auto-format";

export const AutoComparePage: React.FC = () => {
  const { t } = useTranslation();
  const { currentLocale, convertMoney } = useMarketLocation();
  const [params, setParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<VehiclePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const ids = (params.get("ids") || "").split(",").filter(Boolean).slice(0, 4);

  usePageMeta({
    title: "Comparer des véhicules",
    description:
      "Comparez côte à côte les caractéristiques, prix, équipements et informations de confiance de 2 à 4 véhicules.",
    canonicalPath: "/auto/comparer",
    noIndex: true,
  });
  useEffect(() => {
    setLoading(true);
    Promise.all(ids.map((id) => services.auto.getVehicle(id)))
      .then(setVehicles)
      .finally(() => setLoading(false));
  }, [params.get("ids")]);
  const remove = (id: string) => {
    const next = ids.filter((value) => value !== id);
    setParams(next.length ? { ids: next.join(",") } : {});
  };
  if (loading)
    return (
      <Container className="py-7">
        <Skeleton className="h-140 rounded-card" />
      </Container>
    );
  if (vehicles.length < 2)
    return (
      <Container className="py-10">
        <StatePanel
          variant="notFound"
          title="Sélectionnez au moins 2 véhicules"
          description="Ajoutez des véhicules depuis les résultats Auto pour les comparer ici."
          action={<Button to="/auto">Voir les véhicules</Button>}
        />
      </Container>
    );

  const rows = [
    [
      "Prix",
      (vehicle: VehiclePublic) =>
        formatAutoMoney(vehicle.price, currentLocale, convertMoney),
    ],
    ["Année", (vehicle: VehiclePublic) => String(vehicle.technical.modelYear)],
    [
      "Kilométrage",
      (vehicle: VehiclePublic) => formatAutoMileage(vehicle, currentLocale),
    ],
    [
      "Énergie",
      (vehicle: VehiclePublic) => fuelLabels[vehicle.technical.fuelType],
    ],
    [
      "Transmission",
      (vehicle: VehiclePublic) =>
        transmissionLabels[vehicle.technical.transmission],
    ],
    [
      "Puissance",
      (vehicle: VehiclePublic) =>
        vehicle.technical.powerHp ? `${vehicle.technical.powerHp} ch` : "—",
    ],
    [
      "Garantie",
      (vehicle: VehiclePublic) =>
        vehicle.history.warrantyMonths
          ? `${vehicle.history.warrantyMonths} mois`
          : "Non indiquée",
    ],
    ["Vendeur", (vehicle: VehiclePublic) => vehicle.seller.displayName],
    [
      "Estimation",
      (vehicle: VehiclePublic) =>
        vehicle.priceEstimate?.band === "within_market"
          ? "Dans la moyenne"
          : "Données insuffisantes",
    ],
  ] as const;

  return (
    <Container className="py-5 sm:py-7">
      <nav aria-label="Fil d’Ariane" className="mb-4 text-xs text-text-muted">
        <Link to="/auto" className="hover:text-primary">
          Shongre Auto
        </Link>{" "}
        <span aria-hidden="true">/</span> Comparaison
      </nav>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-main">
            Comparer les véhicules
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Les différences sont visibles sans transformer une estimation en
            promesse.
          </p>
        </div>
        <Button to="/auto" variant="outline" size="compact">
          Ajouter un véhicule
        </Button>
      </div>
      <ScrollableRegion
        aria-label={t("auto.compare.tableLabel")}
        className="rounded-card border border-border-base bg-bg-surface shadow-xs"
      >
        <table className="w-full min-w-176 border-collapse text-left text-xs">
          <caption className="sr-only">
            Comparaison détaillée de {vehicles.length} véhicules
          </caption>
          <thead>
            <tr>
              <th className="w-36 border-b border-r border-border-subtle bg-bg-subtle p-4 align-bottom">
                Critère
              </th>
              {vehicles.map((vehicle) => (
                <th
                  key={vehicle.id}
                  className="min-w-52 border-b border-border-subtle p-4 align-top"
                >
                  <div className="relative mb-3 aspect-video overflow-hidden rounded-card bg-bg-subtle">
                    <Image
                      src={vehicle.mediaUrls[0]}
                      alt={vehicle.title}
                      className="h-full w-full object-cover"
                      sizes="240px"
                    />
                    <button
                      type="button"
                      onClick={() => remove(vehicle.id)}
                      aria-label={`Retirer ${vehicle.title}`}
                      className="absolute right-2 top-2 rounded-control bg-bg-surface p-1.5 shadow-xs"
                    >
                      <X className="h-icon-xs w-icon-xs" />
                    </button>
                  </div>
                  <Link
                    to={`/auto/vehicule/${vehicle.slug}`}
                    className="line-clamp-2 font-black text-text-main hover:text-primary"
                  >
                    {vehicle.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value], rowIndex) => (
              <tr key={label} className={rowIndex % 2 ? "bg-bg-subtle" : ""}>
                <th
                  scope="row"
                  className="border-r border-border-subtle p-4 font-bold text-text-main"
                >
                  {label}
                </th>
                {vehicles.map((vehicle) => (
                  <td key={vehicle.id} className="p-4 text-text-secondary">
                    {value(vehicle)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="border-r border-border-subtle p-4 font-bold"
              >
                Confiance
              </th>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="p-4">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                    {vehicle.trust.vinOnFile ? (
                      <Check className="h-icon-xs w-icon-xs" />
                    ) : (
                      <Minus className="h-icon-xs w-icon-xs" />
                    )}{" "}
                    VIN privé enregistré
                  </span>
                  <span className="mt-2 flex items-center gap-1.5 text-text-secondary">
                    <ShieldCheck className="h-icon-xs w-icon-xs" />{" "}
                    {vehicle.trust.publicBadges.join(" · ")}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </ScrollableRegion>
      <p className="mt-4 text-micro leading-relaxed text-text-muted">
        Les mensualités et estimations de prix sont indicatives. Shongre ne
        présente pas de décision de crédit ni d’approbation partenaire sur cette
        page.
      </p>
    </Container>
  );
};
