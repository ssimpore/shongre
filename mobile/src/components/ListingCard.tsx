import { useRouter } from "expo-router";
import type { ListingCardView } from "@shongre/contracts";
import { deliveryRequestIdFromDiscoveryListingId } from "@shongre/contracts/delivery";
import { ListingCard as SharedListingCard } from "@shongre/features/listings/native";
import { messagesFr } from "../i18n/messages.fr";
import { useFavorites } from "@/features/favorites/FavoritesProvider";
import { useMarket } from "@/features/market/MarketProvider";
import { ListingFavoriteButton } from "./ListingFavoriteButton";

export function ListingCard({ listing }: { listing: ListingCardView }) {
  const router = useRouter();
  const { activeMarket } = useMarket();
  const { isFavorite, isPending, loadState, retry, toggleFavorite } =
    useFavorites();
  const favorite = isFavorite(listing.id);
  const deliveryRequestId = deliveryRequestIdFromDiscoveryListingId(listing.id);
  return (
    <SharedListingCard
      listing={listing}
      onPress={() =>
        router.push(
          deliveryRequestId
            ? `/account/delivery?mode=browse&requestId=${encodeURIComponent(deliveryRequestId)}`
            : `/listing/${listing.id}`,
        )
      }
      locale={activeMarket.defaultLocale}
      favoriteAction={
        <ListingFavoriteButton
          isFavorite={favorite}
          disabled={loadState === "loading" || isPending(listing.id)}
          loadState={loadState}
          label={`${
            loadState === "loading"
              ? messagesFr["ui.favorites.loading"]
              : loadState === "error"
                ? messagesFr["ui.favorites.retry"]
                : favorite
                  ? messagesFr["ui.favorites.remove"]
                  : messagesFr["ui.favorites.add"]
          } : ${listing.title}`}
          onPress={() => void toggleFavorite(listing.id)}
          onRetry={() => void retry()}
        />
      }
      labels={{
        boosted: messagesFr["ui.listingCard.boosted"],
        free: messagesFr["ui.listingCard.free"],
        onRequest: messagesFr["ui.listingCard.onRequest"],
        imageUnavailable: messagesFr["ui.listingCard.imageUnavailable"],
        rating: (rating, count) =>
          messagesFr["ui.listingCard.noteAvis"]
            .replace("{rating}", rating)
            .replace("{count}", count),
      }}
      identityLabels={{
        pro: messagesFr["ui.identityStatus.pro.short"],
        proAccessibility: messagesFr["ui.identityStatus.pro.seller"],
      }}
    />
  );
}
