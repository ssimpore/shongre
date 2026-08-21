import { useRouter } from "expo-router";
import type { ListingCardView } from "@shongre/contracts";
import { ListingCard as SharedListingCard } from "@shongre/features/listings/native";

export function ListingCard({ listing }: { listing: ListingCardView }) {
  const router = useRouter();
  return (
    <SharedListingCard
      listing={listing}
      onPress={() => router.push(`/listing/${listing.id}`)}
    />
  );
}
