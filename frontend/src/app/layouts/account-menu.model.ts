import type { Capability } from "@shongre/contracts/access-control";
import { canonicalAccessContext } from "@shongre/contracts/access-control";
import { routes } from "../../configuration/routes";
import { isProSeller } from "../../domains/user/user.domain";
import type { MessageKey } from "../../i18n/messages.fr";
import type { RoutePolicyId } from "../../security/access-policy.registry";
import type { UserProfile } from "../../types";

export type HeaderAccountMenuItemId =
  | "admin"
  | "demo_workspace"
  | "account"
  | "listings"
  | "favorites"
  | "purchases"
  | "public_profile"
  | "pro_solutions"
  | "support";

export interface HeaderAccountMenuItem {
  id: HeaderAccountMenuItemId;
  to: string;
  labelKey: MessageKey;
  count?: number;
  marketplaceAction?: string;
  emphasis?: "primary" | "warning";
  separatorBefore?: boolean;
  isDemo?: boolean;
}

interface HeaderAccountMenuContext {
  user: UserProfile;
  canAccessRoute: (policyId: RoutePolicyId) => boolean;
  hasCapability: (capability: Capability) => boolean;
  canUseDemoMarketplace: boolean;
  listingCount: number;
  favoriteCount: number;
}

const CUSTOMER_DESTINATIONS = [
  {
    id: "account",
    policyId: "accountOverview",
    to: routes.workspace.overview,
    labelKey: "shell.header.tableauDeBordCompte",
    marketplaceAction: "account.open",
  },
  {
    id: "listings",
    policyId: "accountListings",
    to: routes.workspace.listings,
    labelKey: "shell.header.mesAnnonces",
    marketplaceAction: "listing.manage",
  },
  {
    id: "favorites",
    policyId: "accountFavorites",
    to: routes.workspace.favorites,
    labelKey: "shell.header.accountMenu.favorites",
    marketplaceAction: "favorite.manage",
  },
  {
    id: "purchases",
    policyId: "accountPurchases",
    to: routes.workspace.purchases,
    labelKey: "shell.header.accountMenu.purchases",
    marketplaceAction: "purchase.manage",
  },
] as const satisfies readonly {
  id: HeaderAccountMenuItemId;
  policyId: RoutePolicyId;
  to: () => string;
  labelKey: MessageKey;
  marketplaceAction: string;
}[];

/**
 * Builds the account shortcuts from the same named policies as the router.
 * Global marketplace navigation remains role-neutral; only this personalized
 * panel omits destinations that the signed-in identity cannot enter.
 */
export function resolveHeaderAccountMenuItems({
  user,
  canAccessRoute,
  hasCapability,
  canUseDemoMarketplace,
  listingCount,
  favoriteCount,
}: HeaderAccountMenuContext): HeaderAccountMenuItem[] {
  const access = canonicalAccessContext(user);

  if (access.staffStatus !== "none") {
    const items: HeaderAccountMenuItem[] = [];

    if (canAccessRoute("adminOverview")) {
      items.push({
        id: "admin",
        to: routes.admin.overview(),
        labelKey: "meta.adminOverview.title",
      });
    }

    if (canUseDemoMarketplace && canAccessRoute("accountOverview")) {
      items.push({
        id: "demo_workspace",
        to: routes.workspace.overview(),
        labelKey: "shell.header.accountMenu.demoWorkspace",
        emphasis: "warning",
        separatorBefore: items.length > 0,
        isDemo: true,
      });
    }

    if (items.length === 0) {
      items.push({
        id: "support",
        to: routes.contact(),
        labelKey: "footer.contactSupport",
      });
    }

    return items;
  }

  const items = CUSTOMER_DESTINATIONS.flatMap<HeaderAccountMenuItem>(
    (definition) => {
      if (!canAccessRoute(definition.policyId)) return [];
      return [
        {
          id: definition.id,
          to: definition.to(),
          labelKey: definition.labelKey,
          marketplaceAction: definition.marketplaceAction,
          count:
            definition.id === "listings"
              ? listingCount
              : definition.id === "favorites"
                ? favoriteCount
                : undefined,
        },
      ];
    },
  );

  if (hasCapability("profile.read")) {
    const publicId = user.storeSlug || user.slug || user.id;
    items.push({
      id: "public_profile",
      to: isProSeller(user)
        ? routes.seller.storefront(publicId)
        : routes.seller.profile(publicId),
      labelKey: isProSeller(user)
        ? "shell.header.accountMenu.publicStorefront"
        : "shell.header.accountMenu.publicProfile",
      emphasis: "primary",
    });
  }

  if (hasCapability("marketplace.customer.access")) {
    items.push({
      id: "pro_solutions",
      to: routes.proPlans(),
      labelKey: "shell.header.accountMenu.proSolutions",
      separatorBefore: items.length > 0,
    });
  }

  return items;
}
