import { cache } from "react";
import { headers } from "next/headers";
import {
  isLocal,
  isTest,
  resolveMarketContext,
  type MarketContext,
} from "@shongre/contracts";
import {
  marketInfrastructureFromEnvironment,
  webEnvironmentFromEnvironment,
} from "./market-infrastructure";

export { marketInfrastructureFromEnvironment } from "./market-infrastructure";

export const resolveServerMarketContext = cache(
  async (pathname: string): Promise<MarketContext> => {
    const requestHeaders = await headers();
    const hostname =
      requestHeaders.get("x-shongre-resolved-host") ||
      requestHeaders.get("host") ||
      "";
    const environment = webEnvironmentFromEnvironment();
    return resolveMarketContext({
      hostname,
      pathname,
      infrastructure: marketInfrastructureFromEnvironment(),
      allowDevelopmentHosts:
        isLocal(environment.environment) ||
        isTest(environment.environment) ||
        process.env.SHONGRE_E2E_ALLOW_LOCAL_HOSTS === "1",
    });
  },
);
