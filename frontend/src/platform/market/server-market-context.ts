import { cache } from "react";
import { headers } from "next/headers";
import {
  resolveMarketContext,
  type MarketContext,
} from "@shongre/contracts";
import { marketInfrastructureFromEnvironment } from "./market-infrastructure";

export { marketInfrastructureFromEnvironment } from "./market-infrastructure";

export const resolveServerMarketContext = cache(
  async (pathname: string): Promise<MarketContext> => {
    const requestHeaders = await headers();
    const hostname =
      requestHeaders.get("x-shongre-resolved-host") ||
      requestHeaders.get("host") ||
      "";
    return resolveMarketContext({
      hostname,
      pathname,
      infrastructure: marketInfrastructureFromEnvironment(),
      allowDevelopmentHosts: process.env.NODE_ENV !== "production",
    });
  },
);
