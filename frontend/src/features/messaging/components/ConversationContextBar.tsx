import React from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  DollarSign,
  Calendar,
  ShieldCheck,
  Package,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  ListingConversationContext,
  TransactionConversationContext,
} from '../../../domains/messaging/messaging.types';
import { formatPrice } from '../../../utilities/formatters';
import { Badge } from '../../../design-system/primitives/Badge';
import { Button } from '../../../design-system/primitives/Button';
import { Image } from '../../../design-system/primitives/Image';

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
  if (!listingContext && !transactionContext) return null;

  return (
    <div className="bg-stone-50 border-b border-border-base px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
      {/* Listing Preview */}
      {listingContext && (
        <div className="flex items-center gap-3 min-w-0">
          {listingContext.listingPhotoUrl ? (
            <Image
              src={listingContext.listingPhotoUrl}
              alt={listingContext.listingTitle}
              sizes="40px"
              className="w-10 h-10 object-cover rounded-lg border border-border-base shrink-0 bg-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center shrink-0 text-stone-400">
              <Package className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/annonce/${listingContext.listingId}`}
                className="font-bold text-stone-900 hover:text-primary transition-colors truncate flex items-center gap-1 group"
              >
                <span>{listingContext.listingTitle}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              {listingContext.listingStatus === 'reserved' && (
                <Badge variant="warning" size="sm">Réservée</Badge>
              )}
              {listingContext.listingStatus === 'sold' && (
                <Badge variant="neutral" size="sm">Vendue</Badge>
              )}
            </div>
            <div className="text-xs font-black text-primary">
              {formatPrice(listingContext.listingPrice)}
            </div>
          </div>
        </div>
      )}

      {/* Transaction & Action Shortcuts */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {transactionContext ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewTransaction}
            leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-success" />}
            className="text-xs"
          >
            Suivi de commande
          </Button>
        ) : (
          <>
            {onMakeOffer && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMakeOffer}
                leftIcon={<DollarSign className="w-3.5 h-3.5 text-warning" />}
                className="text-xs"
              >
                Faire une offre
              </Button>
            )}
            {onSchedulePickup && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSchedulePickup}
                leftIcon={<Calendar className="w-3.5 h-3.5 text-primary" />}
                className="text-xs"
              >
                Fixer rendez-vous
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
