import type { ListingCardView } from "@shongre/contracts/listings";
import type { Money } from "@shongre/contracts/primitives";
import type { MoneyConversionProjection } from "@shongre/contracts/currency";
import { majorToMinorAmount } from "@shongre/shared/money";
import { formatListingPricePresentation } from "@shongre/shared";
import type { ListingPricePresentation } from "../../types";

export {
  getListingPriceCopy,
  getListingPeriodLabel,
  formatListingPricePresentation,
} from "@shongre/shared";

export interface GenericListingPriceInput {
  price: number;
  currency?: string;
  isFreeDonation: boolean;
  priceType?: unknown;
  pricePresentation?: ListingPricePresentation;
}

export interface GenericListingPriceResolution {
  kind: NonNullable<ListingCardView["priceKind"]>;
  money?: Money;
  label?: string;
}

/**
 * Resolves the generic listing's commercial meaning once for every card-like
 * surface. In particular, zero is never enough to infer a donation: salary,
 * request-only and genuinely unpriced categories remain distinct states.
 */
export function resolveGenericListingPrice(
  listing: GenericListingPriceInput,
  locale: string,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): GenericListingPriceResolution {
  if (listing.isFreeDonation || listing.priceType === "free") {
    return { kind: "free" };
  }

  const semantic = listing.pricePresentation;
  const semanticLabel = formatListingPricePresentation(
    semantic,
    locale,
    convertMoney,
  );
  if (semantic?.visibility === "undisclosed") {
    return {
      kind: semantic.kind === "salary" ? "unpriced" : "on_request",
      label: semanticLabel,
    };
  }

  if (listing.priceType === "on_request") {
    return { kind: "on_request" };
  }
  if (listing.priceType === "unpriced") {
    return { kind: "unpriced" };
  }

  if (semantic?.visibility === "public") {
    const amountMinor =
      semantic.minimumAmountMinor ?? semantic.maximumAmountMinor;
    if (
      typeof amountMinor === "number" &&
      Number.isFinite(amountMinor) &&
      amountMinor > 0
    ) {
      return {
        kind: "amount",
        money: { amountMinor, currency: semantic.currency },
        label: semanticLabel,
      };
    }
    return { kind: "unpriced", label: semanticLabel };
  }

  if (!Number.isFinite(listing.price) || listing.price <= 0) {
    return { kind: "unpriced" };
  }
  if (!listing.currency?.trim()) {
    return { kind: "unpriced" };
  }
  return {
    kind: "amount",
    money: {
      amountMinor: majorToMinorAmount(listing.price, listing.currency),
      currency: listing.currency,
    },
  };
}
