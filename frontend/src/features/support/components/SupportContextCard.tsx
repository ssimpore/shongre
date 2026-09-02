import React from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingBag, ExternalLink, X } from "lucide-react";
import { SupportContext } from "../../../domains/support/support.types";
import { Image } from "../../../design-system/primitives/Image";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";

interface SupportContextCardProps {
  context: SupportContext;
  onRemove?: () => void;
}

export const SupportContextCard: React.FC<SupportContextCardProps> = ({
  context,
  onRemove,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useMarketLocation();
  if (context.type === "listing") {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-stone-50 border border-border-base rounded-2xl">
        <div className="flex items-center gap-3 min-w-0">
          {context.listingPhotoUrl ? (
            <Image
              src={context.listingPhotoUrl}
              alt={context.listingTitle ?? ""}
              sizes="44px"
              className="w-11 h-11 object-cover rounded-xl border border-border-base bg-white shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-stone-200 flex items-center justify-center shrink-0 text-stone-400">
              <Package className="w-icon-lg h-icon-lg" />
            </div>
          )}

          <div className="min-w-0">
            <span className="text-micro font-bold uppercase tracking-wider text-primary block">
              {t("support.supportContextCard.annonceLiee")}
            </span>
            <span className="text-xs font-black text-stone-900 truncate block">
              {context.listingTitle || `Annonce #${context.listingId}`}
            </span>
            {context.price !== undefined && (
              <span className="text-xs font-bold text-stone-600">
                {formatPrice(context.price, {
                  sourceCurrency: context.currency,
                })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to={`/annonce/${context.listingId}`}
            target="_blank"
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition-colors"
            title={t("support.supportContextCard.ouvrirLAnnonce")}
          >
            <ExternalLink className="w-icon-md h-icon-md" />
          </Link>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-stone-500 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
              title={t("support.supportContextCard.detacherLAnnonce")}
            >
              <X className="w-icon-md h-icon-md" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (context.type === "transaction") {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-stone-50 border border-border-base rounded-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-success-surface text-success border border-success-border flex items-center justify-center shrink-0">
            <ShoppingBag className="w-icon-lg h-icon-lg" />
          </div>

          <div className="min-w-0">
            <span className="text-micro font-bold uppercase tracking-wider text-success block">
              {t("support.supportContextCard.commandeSequestreLie")}
            </span>
            <span className="text-xs font-black text-stone-900 truncate block">
              {context.listingTitle || `Transaction #${context.transactionId}`}
            </span>
            {context.amount !== undefined && (
              <span className="text-xs font-bold text-stone-600">
                Montant :{" "}
                {formatPrice(context.amount, {
                  sourceCurrency: context.currency,
                })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to="/compte/achats"
            target="_blank"
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition-colors"
            title={t("support.supportContextCard.voirLaCommande")}
          >
            <ExternalLink className="w-icon-md h-icon-md" />
          </Link>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-stone-500 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
              title={t("support.supportContextCard.detacherLaCommande")}
            >
              <X className="w-icon-md h-icon-md" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
