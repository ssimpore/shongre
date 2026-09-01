import React from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  DollarSign,
  Calendar,
  ShieldCheck,
  Package,
} from "lucide-react";
import {
  ListingConversationContext,
  TransactionConversationContext,
} from "../../../domains/messaging/messaging.types";
import { formatPrice } from "../../../utilities/formatters";
import { Badge } from "../../../design-system/primitives/Badge";
import { Button } from "../../../design-system/primitives/Button";
import { Image } from "../../../design-system/primitives/Image";
import { useTranslation } from "../../../i18n/I18nProvider";

interface ConversationContextBarProps {
  listingContext?: ListingConversationContext | null;
  transactionContext?: TransactionConversationContext | null;
  onMakeOffer?: () => void;
  onSchedulePickup?: () => void;
  onViewTransaction?: () => void;
}

export const ConversationContextBar: React.FC<ConversationContextBarProps> = ({
  listingContext,
  transactionContext,
  onMakeOffer,
  onSchedulePickup,
  onViewTransaction,
}) => {
  const { t } = useTranslation();
  if (!listingContext && !transactionContext) return null;

  return (
    <div
      data-conversation-context
      className="flex min-w-0 shrink-0 flex-col items-stretch gap-3 border-b border-border-base bg-stone-50 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      {/* Listing Preview */}
      {listingContext && (
        <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
          {listingContext.listingPhotoUrl ? (
            <Image
              src={listingContext.listingPhotoUrl}
              alt={listingContext.listingTitle}
              sizes="40px"
              className="w-10 h-10 object-cover rounded-lg border border-border-base shrink-0 bg-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center shrink-0 text-stone-400">
              <Package className="w-icon-lg h-icon-lg" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                to={`/annonce/${listingContext.listingId}`}
                className="group flex min-w-0 items-center gap-1 truncate font-bold text-stone-900 transition-colors hover:text-primary"
              >
                <span className="truncate">{listingContext.listingTitle}</span>
                <ExternalLink className="h-icon-xs w-icon-xs shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              {listingContext.listingStatus === "reserved" && (
                <Badge variant="warning" size="sm">
                  {t("messaging.conversationContextBar.reservee")}
                </Badge>
              )}
              {listingContext.listingStatus === "sold" && (
                <Badge variant="neutral" size="sm">
                  Vendue
                </Badge>
              )}
            </div>
            <div className="text-xs font-black text-primary">
              {formatPrice(listingContext.listingPrice)}
            </div>
          </div>
        </div>
      )}

      {/* Transaction & Action Shortcuts */}
      <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:ml-auto sm:flex sm:w-auto sm:shrink-0 sm:items-center">
        {transactionContext ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewTransaction}
            leftIcon={
              <ShieldCheck className="w-icon-sm h-icon-sm text-success" />
            }
            className="w-full min-w-0 !whitespace-normal text-xs sm:w-auto"
          >
            {t("messaging.conversationContextBar.suiviDeCommande")}
          </Button>
        ) : (
          <>
            {onMakeOffer && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMakeOffer}
                leftIcon={
                  <DollarSign className="w-icon-sm h-icon-sm text-warning" />
                }
                className="w-full min-w-0 !whitespace-normal text-xs sm:w-auto"
              >
                {t("messaging.conversationContextBar.faireUneOffre")}
              </Button>
            )}
            {onSchedulePickup && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSchedulePickup}
                leftIcon={
                  <Calendar className="w-icon-sm h-icon-sm text-primary" />
                }
                className="w-full min-w-0 !whitespace-normal text-xs sm:w-auto"
              >
                {t("messaging.conversationContextBar.fixerRendezVous")}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
