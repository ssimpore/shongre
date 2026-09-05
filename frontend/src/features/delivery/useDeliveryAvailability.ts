import { useCallback, useEffect, useState } from "react";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

export type DeliveryAvailabilityState =
  "loading" | "enabled" | "disabled" | "error";

export function useDeliveryAvailability() {
  const { activeMarket } = useMarketLocation();
  const [state, setState] = useState<DeliveryAvailabilityState>("loading");
  const reload = useCallback(async () => {
    setState("loading");
    try {
      const availability = await services.delivery.getAvailability(
        activeMarket.code,
      );
      setState(availability.enabled ? "enabled" : "disabled");
    } catch {
      setState("error");
    }
  }, [activeMarket.code]);
  useEffect(() => void reload(), [reload]);
  return { state, reload };
}
