import React, { useEffect, useState } from "react";
import { Monitor, Smartphone, ArrowRight } from "lucide-react";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { NewsletterCampaign } from "../../../domains/newsletter/newsletter.types";
import { Image } from "../../../design-system/primitives/Image";
import { useTranslation } from "../../../i18n/I18nProvider";
import { services } from "../../../api/client/service-registry";
import type { Listing } from "../../../types";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";

interface NewsletterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: NewsletterCampaign;
}

export const NewsletterPreviewModal: React.FC<NewsletterPreviewModalProps> = ({
  isOpen,
  onClose,
  campaign,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useMarketLocation();
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const listingIds = campaign.content.featuredListingIds?.slice(0, 2) || [];
    setFeaturedListings([]);

    Promise.all(
      listingIds.map((listingId) =>
        services.listings.getListingById(listingId),
      ),
    )
      .then((listings) => {
        if (!cancelled) {
          setFeaturedListings(
            listings.filter((listing): listing is Listing => listing !== null),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setFeaturedListings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [campaign.content.featuredListingIds, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Aperçu email : ${campaign.name}`}
      description={t(
        "newsletter.newsletterPreviewModal.simulationDeRenduResponsiveDe",
      )}
    >
      <div className="space-y-4 text-xs">
        {/* Device Switcher */}
        <div className="flex items-center justify-between p-2 bg-stone-100 rounded-xl">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("desktop")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "desktop"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Ordinateur (600px)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mobile")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "mobile"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile (360px)</span>
            </button>
          </div>

          <span className="text-micro text-stone-500 font-mono">
            Marché : {campaign.marketCode} • {campaign.locale}
          </span>
        </div>

        {/* Email Subject / Preheader Header */}
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-500 w-16 shrink-0">
              Objet :
            </span>
            <span className="font-black text-stone-900">
              {campaign.subject}
            </span>
          </div>
          {campaign.previewText && (
            <div className="flex items-center gap-2 text-stone-500">
              <span className="font-bold w-16 shrink-0">
                {t("newsletter.newsletterPreviewModal.preheader")}
              </span>
              <span className="truncate">{campaign.previewText}</span>
            </div>
          )}
        </div>

        {/* Simulated Email Container */}
        <div className="p-4 bg-stone-200 rounded-2xl flex justify-center overflow-x-auto">
          <div
            className={`bg-white rounded-2xl shadow-sm border border-stone-300 overflow-hidden transition-all text-stone-800 ${
              viewMode === "mobile" ? "w-90" : "w-140"
            }`}
          >
            {/* Email Header */}
            <div className="p-6 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-base">
                  S
                </div>
                <span className="text-base font-extrabold">Shongre</span>
              </div>
              <span className="text-micro uppercase tracking-wider text-stone-500 font-bold">
                {t("newsletter.newsletterPreviewModal.laSelectionDeLaSemaine")}
              </span>
            </div>

            {/* Email Hero */}
            <div className="p-6 bg-primary-light border-b border-primary-border space-y-2 text-center">
              <h2 className="text-lg sm:text-xl font-black text-stone-900 leading-tight">
                {campaign.content.heroTitle || campaign.subject}
              </h2>
              {campaign.content.heroSubtitle && (
                <p className="text-xs text-stone-600 max-w-sm mx-auto">
                  {campaign.content.heroSubtitle}
                </p>
              )}
            </div>

            {/* Email Body Content */}
            <div className="p-6 space-y-4 text-xs leading-relaxed text-stone-700">
              {campaign.content.introText && (
                <p className="text-stone-800 font-medium">
                  {campaign.content.introText}
                </p>
              )}

              {/* Showcase resolves the campaign's listing IDs through the same
                  service contract as the marketplace, so prices and inventory
                  cannot drift from a second set of mock cards in this modal. */}
              {featuredListings.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {featuredListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="p-3 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5"
                    >
                      <div className="h-24 bg-stone-200 rounded-lg overflow-hidden flex items-center justify-center text-stone-400">
                        <Image
                          src={listing.coverImageUrl}
                          alt=""
                          sizes="(max-width: 640px) 45vw, 240px"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-bold text-stone-900 text-xs line-clamp-1">
                        {listing.title}
                      </span>
                      <span className="text-primary font-black text-xs block">
                        {formatPrice(listing.price, {
                          isFreeDonation: listing.isFreeDonation,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Main CTA */}
              <div className="text-center pt-4">
                <button
                  type="button"
                  disabled
                  title="Bouton non interactif dans l’aperçu de l’e-mail"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-xs"
                >
                  <span>
                    {campaign.content.ctaText || "Explorer la sélection"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Email Footer & Unsubscribe notice */}
            <div className="p-6 bg-stone-100 border-t border-stone-200 text-center space-y-2 text-micro text-stone-500">
              <p>
                Vous recevez cet email car vous êtes abonné à la newsletter
                Shongre ({campaign.marketCode}).
              </p>
              <div className="flex items-center justify-center gap-3 text-stone-700 font-bold">
                <span>
                  {t("newsletter.newsletterPreviewModal.gererMesPreferences")}
                </span>
                <span>•</span>
                <span>
                  {t("newsletter.newsletterPreviewModal.seDesabonnerEn1Clic")}
                </span>
              </div>
              <p className="text-micro text-stone-500">
                © {new Date().getFullYear()} Shongre SAS. 14 boulevard
                Haussmann, 75009 Paris.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("newsletter.newsletterPreviewModal.fermerLApercu")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
