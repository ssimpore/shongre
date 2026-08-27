import React from "react";
import { Link } from "react-router-dom";
import { Building2, Camera, Heart, MapPin } from "lucide-react";
import type { PropertyPublic } from "@shongre/contracts/real-estate";
import { Badge, IconButton, Image } from "../../../design-system";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import {
  formatImmoMoney,
  pricePeriodSuffix,
  propertyTypeLabels,
} from "../immo-format";

export const PropertyCard: React.FC<{
  property: PropertyPublic;
  selected?: boolean;
  onSelect?: (property: PropertyPublic) => void;
  onFavorite?: (property: PropertyPublic) => void;
  compact?: boolean;
}> = ({ property, selected, onSelect, onFavorite, compact = false }) => {
  const { currentLocale } = useMarketLocation();

  return (
    <article
      className={`group overflow-hidden rounded-card border bg-bg-surface shadow-xs transition-all ${
        selected
          ? "border-primary shadow-md"
          : "border-border-base hover:border-primary-border hover:shadow-md"
      }`}
      onMouseEnter={() => onSelect?.(property)}
    >
      <div
        className={`grid ${
          compact
            ? "sm:grid-cols-media-content"
            : "sm:grid-cols-media-content-lg"
        }`}
      >
        <Link
          to={`/immo/bien/${property.slug}`}
          className="relative block min-h-44 overflow-hidden bg-bg-subtle"
        >
          <Image
            src={property.media.photos[0]}
            alt={property.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
            sizes={compact ? "176px" : "240px"}
          />
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-control bg-overlay-scrim px-2 py-1 text-micro font-bold text-white">
            <Camera className="h-icon-xs w-icon-xs" aria-hidden="true" />
            {property.media.photos.length}
          </span>
          {property.promotion.sponsored ? (
            <span className="absolute left-2 top-2 rounded-control bg-text-main px-2 py-1 text-micro font-bold text-white">
              Sponsorisé
            </span>
          ) : null}
        </Link>
        <div className="min-w-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-black text-primary">
                {formatImmoMoney(property.financials.price, currentLocale)}
                {pricePeriodSuffix[property.financials.period]}
              </p>
              <Link
                to={`/immo/bien/${property.slug}`}
                className="mt-1 block line-clamp-2 text-sm font-black text-text-main hover:text-primary"
              >
                {property.title}
              </Link>
            </div>
            {onFavorite ? (
              <IconButton
                ariaLabel={`${property.isFavorite ? "Retirer" : "Ajouter"} ${property.title} ${property.isFavorite ? "des" : "aux"} favoris`}
                variant="ghost"
                size="sm"
                onClick={() => onFavorite(property)}
              >
                <Heart
                  className={`h-icon-sm w-icon-sm ${
                    property.isFavorite ? "fill-primary text-primary" : ""
                  }`}
                />
              </IconButton>
            ) : null}
          </div>
          <p className="mt-2 text-xs font-semibold text-text-main">
            {propertyTypeLabels[property.propertyType]} ·{" "}
            {property.characteristics.rooms} pièces ·{" "}
            {property.characteristics.livingAreaSquareMeters} m²
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <MapPin className="h-icon-xs w-icon-xs" aria-hidden="true" />
            {property.address.publicLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {property.energy.dpeClass ? (
              <Badge variant="success">DPE {property.energy.dpeClass}</Badge>
            ) : null}
            {property.characteristics.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity}>
                {amenity === "lift"
                  ? "Ascenseur"
                  : amenity === "balcony"
                    ? "Balcon"
                    : amenity === "terrace"
                      ? "Terrasse"
                      : amenity === "garden"
                        ? "Jardin"
                        : amenity === "parking"
                          ? "Parking"
                          : amenity === "cellar"
                            ? "Cave"
                            : amenity}
              </Badge>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 border-t border-border-subtle pt-3 text-micro text-text-muted">
            <Building2 className="h-icon-xs w-icon-xs" aria-hidden="true" />
            {property.seller.type === "owner"
              ? "Particulier"
              : "Professionnel"}{" "}
            · {property.seller.displayName}
          </p>
        </div>
      </div>
    </article>
  );
};
