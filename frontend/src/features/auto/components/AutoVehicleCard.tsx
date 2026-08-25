import React from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Camera,
  GitCompareArrows,
  Heart,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import type { VehiclePublic } from "@shongre/contracts/auto";
import { Badge, Image, IconButton } from "../../../design-system";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import {
  formatAutoMileage,
  formatAutoMoney,
  fuelLabels,
  transmissionLabels,
} from "../auto-format";

interface Props {
  vehicle: VehiclePublic;
  compared?: boolean;
  onCompare?: (vehicle: VehiclePublic) => void;
  onFavorite?: (vehicle: VehiclePublic) => void;
  compact?: boolean;
}

export const AutoVehicleCard: React.FC<Props> = ({
  vehicle,
  compared = false,
  onCompare,
  onFavorite,
  compact = false,
}) => {
  const { currentLocale } = useMarketLocation();

  return (
    <article className="group overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs transition-shadow hover:shadow-card">
      <div
        className={
          compact
            ? "grid sm:grid-cols-media-content-md"
            : "grid md:grid-cols-media-content-xl"
        }
      >
        <Link
          to={`/auto/vehicule/${vehicle.slug}`}
          className="relative block min-h-48 overflow-hidden bg-bg-subtle md:min-h-full"
        >
          <Image
            src={vehicle.mediaUrls[0]}
            alt={vehicle.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
            sizes={compact ? "192px" : "272px"}
          />
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-control bg-overlay-scrim px-2 py-1 text-micro font-bold text-white">
            <Camera className="h-icon-xs w-icon-xs" aria-hidden="true" />{" "}
            {vehicle.mediaUrls.length}
          </span>
          {vehicle.promotionLabels.includes("sponsored") && (
            <span className="absolute left-3 top-3 rounded-control bg-text-main px-2 py-1 text-micro font-bold text-white">
              Sponsorisé
            </span>
          )}
        </Link>
        <div className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-content-stat">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <Link
                to={`/auto/vehicule/${vehicle.slug}`}
                className="line-clamp-2 text-sm font-black text-text-main hover:text-primary sm:text-base"
              >
                {vehicle.title}
              </Link>
              {onFavorite && (
                <IconButton
                  ariaLabel={`Ajouter ${vehicle.title} aux favoris`}
                  size="sm"
                  variant="ghost"
                  onClick={() => onFavorite(vehicle)}
                >
                  <Heart
                    className={`h-icon-sm w-icon-sm ${vehicle.isFavorite ? "fill-primary text-primary" : ""}`}
                  />
                </IconButton>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
              <span>{vehicle.technical.modelYear}</span>
              <span aria-hidden="true">·</span>
              <span>{formatAutoMileage(vehicle, currentLocale)}</span>
              <span aria-hidden="true">·</span>
              <span>{fuelLabels[vehicle.technical.fuelType]}</span>
              <span aria-hidden="true">·</span>
              <span>{transmissionLabels[vehicle.technical.transmission]}</span>
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <MapPin className="h-icon-xs w-icon-xs" aria-hidden="true" />{" "}
              {vehicle.locationLabel}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <BadgeCheck className="h-icon-xs w-icon-xs" aria-hidden="true" />{" "}
              {vehicle.seller.type === "dealer"
                ? "Professionnel"
                : "Particulier"}{" "}
              · {vehicle.seller.displayName}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {vehicle.history.warrantyMonths ? (
                <Badge variant="success">
                  <ShieldCheck
                    className="h-icon-xs w-icon-xs"
                    aria-hidden="true"
                  />{" "}
                  Garantie {vehicle.history.warrantyMonths} mois
                </Badge>
              ) : null}
              {vehicle.technical.critAirClass && (
                <Badge>Crit’Air {vehicle.technical.critAirClass}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-row items-end justify-between gap-3 border-t border-border-subtle pt-3 lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <div>
              <p className="text-lg font-black text-primary">
                {formatAutoMoney(vehicle.price, currentLocale)}
              </p>
              {vehicle.financingMonthlyEstimate && (
                <p className="mt-1 text-xs font-semibold text-text-main">
                  ou{" "}
                  {formatAutoMoney(
                    vehicle.financingMonthlyEstimate,
                    currentLocale,
                  )}{" "}
                  / mois
                </p>
              )}
              {vehicle.financingMonthlyEstimate && (
                <p className="mt-1 text-micro text-text-muted">
                  à titre indicatif
                </p>
              )}
            </div>
            {onCompare && (
              <button
                type="button"
                onClick={() => onCompare(vehicle)}
                aria-pressed={compared}
                className={`inline-flex min-h-control-target items-center justify-center gap-1.5 rounded-control border px-3 text-xs font-bold ${compared ? "border-primary bg-primary-light text-primary" : "border-border-base text-text-main hover:border-primary"}`}
              >
                <GitCompareArrows
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />{" "}
                {compared ? "Ajouté" : "Comparer"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
