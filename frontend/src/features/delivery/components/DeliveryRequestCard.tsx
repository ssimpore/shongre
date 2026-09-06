import type {
  ListingCardView,
  MarketCode,
  Money,
  MoneyConversionProjection,
} from "@shongre/contracts";
import type { DeliveryPublicRequest } from "@shongre/contracts/delivery";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { routes } from "../../../configuration/routes";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import { projectGenericListingCardView } from "../../../domains/listing/listing-card.generic-presentation";
import { projectDeliveryRequest } from "../../../domains/discovery/vertical-discovery.projection";

export function presentDeliveryRequestCard(
  request: DeliveryPublicRequest,
  locale: string,
  marketCode: MarketCode,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): ListingCardView {
  return projectGenericListingCardView(
    projectDeliveryRequest(request, marketCode),
    locale,
    marketCode,
    undefined,
    convertMoney,
  );
}

export function DeliveryRequestCard({
  request,
  isFavorite = false,
  favoriteLoadState = "ready",
  onFavorite,
  onFavoriteRetry,
}: {
  request: DeliveryPublicRequest;
  isFavorite?: boolean;
  favoriteLoadState?: "loading" | "ready" | "error";
  onFavorite?: (request: DeliveryPublicRequest) => void | Promise<unknown>;
  onFavoriteRetry?: () => void | Promise<unknown>;
}) {
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const listing = presentDeliveryRequestCard(
    request,
    currentLocale,
    activeMarket.code as MarketCode,
    convertMoney,
  );

  return (
    <div
      className="h-full w-full min-w-0"
      data-listing-card-consumer="delivery"
    >
      <ListingCardViewCard
        listing={listing}
        href={routes.delivery.request(request.id)}
        isFavorite={isFavorite}
        favoriteLoadState={favoriteLoadState}
        onFavoriteToggle={onFavorite ? () => onFavorite(request) : undefined}
        onFavoriteRetry={onFavoriteRetry}
      />
    </div>
  );
}
