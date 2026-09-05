const DELIVERY_REQUEST_LINK = /^\/livraison\/demande\/[0-9a-f-]{36}$/i;
const DELIVERY_WORKSPACE_LINK = /^\/compte\/livraison(?:\/[0-9a-f-]{36})?$/i;

export function resolveDeliveryNotificationRoute(input: {
  data: unknown;
  authenticated: boolean;
  marketCode: string;
}): "/account/delivery?mode=browse" | "/account/delivery?mode=mine" | null {
  if (!input.authenticated || !input.data || typeof input.data !== "object") {
    return null;
  }
  const data = input.data as Record<string, unknown>;
  const link =
    typeof data.linkUrl === "string"
      ? data.linkUrl
      : typeof data.link_url === "string"
        ? data.link_url
        : typeof data.linkRoute === "string"
          ? data.linkRoute
          : "";
  const notificationMarket =
    typeof data.marketCode === "string"
      ? data.marketCode
      : typeof data.market_code === "string"
        ? data.market_code
        : "";
  if (
    !notificationMarket ||
    notificationMarket.toUpperCase() !== input.marketCode.toUpperCase()
  ) {
    return null;
  }
  if (DELIVERY_REQUEST_LINK.test(link)) return "/account/delivery?mode=browse";
  if (
    link === "/compte/livraison/coursier" ||
    DELIVERY_WORKSPACE_LINK.test(link)
  ) {
    return "/account/delivery?mode=mine";
  }
  return null;
}
