import React from 'react';
import { MapPin, Package, Truck, Store, ShieldCheck } from 'lucide-react';
import { Listing } from '../../../types';
import { fulfillmentResolver } from '../../../domains/fulfillment/fulfillment.resolver';

export interface ListingFulfillmentSummaryProps {
  listing: Listing;
  className?: string;
}

export const ListingFulfillmentSummary: React.FC<ListingFulfillmentSummaryProps> = ({
  listing,
  className = '',
}) => {
  const caps = fulfillmentResolver.resolveCapabilities({
    taxonomyNodeId: listing.subCategorySlug || listing.categorySlug,
    sellerType: listing.sellerType,
    price: listing.price,
  });

  const deliveryOpts = listing.deliveryOptions || [];
  const hasHandDelivery = caps.allowHandDelivery && deliveryOpts.some((d) => d.type === 'hand_delivery' && d.available);
  const hasParcel = caps.allowParcelShipping && deliveryOpts.some((d) => (d.type === 'relay_point' || d.type === 'home_delivery') && d.available);
  const hasBulky = caps.allowBulkyDelivery && deliveryOpts.some((d) => d.type === 'custom_carrier' && d.available);
  const hasStorePickup = caps.allowStorePickup && listing.sellerType === 'pro';

  // If no fulfillment modes apply (e.g. Real estate, jobs, digital services)
  if (!hasHandDelivery && !hasParcel && !hasBulky && !hasStorePickup) {
    return null;
  }

  return (
    <div className={`bg-white rounded-2xl border border-border-base p-5 sm:p-6 space-y-4 shadow-xs ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
        <h2 className="text-sm sm:text-base font-bold text-stone-900 uppercase tracking-wider">
          Modes de remise & Expédition
        </h2>
        <span className="text-micro text-stone-500 font-medium">
          Choix définitif à la commande
        </span>
      </div>

      <div className="space-y-3">
        {/* Hand Delivery */}
        {hasHandDelivery && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  Remise en main propre
                </div>
                <div className="text-micro text-stone-500">
                  À convenir à {listing.city} ({listing.postalCode}) • Validation par code secret PIN
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-success">
              Gratuit
            </div>
          </div>
        )}

        {/* Parcel Shipping */}
        {hasParcel && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  Livraison en colis avec suivi
                </div>
                <div className="text-micro text-stone-500">
                  Mondial Relay (Point relais & Locker) ou Colissimo Domicile
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-stone-900">
              À partir de 3,99 €
            </div>
          </div>
        )}

        {/* Bulky Transport */}
        {hasBulky && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning-surface text-warning flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  Transport de meubles & Gros colis
                </div>
                <div className="text-micro text-stone-500">
                  Livraison par transporteur spécialisé Cocolis
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-stone-900">
              Sur devis transport
            </div>
          </div>
        )}

        {/* Store Pickup (Pro) */}
        {hasStorePickup && (
          <div className="p-3.5 rounded-xl bg-bg-base/60 border border-border-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-success-surface text-success flex items-center justify-center shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900">
                  Retrait en boutique
                </div>
                <div className="text-micro text-stone-500">
                  Retrait direct dans le magasin du vendeur Pro
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-success">
              Gratuit
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
