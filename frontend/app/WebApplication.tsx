"use client";

import App from "../src/App";
import type { MarketContext } from "@shongre/contracts";

export function WebApplication({
  pathname,
  marketContext,
}: {
  pathname: string;
  marketContext: MarketContext;
}) {
  return (
    <App
      initialPath={pathname}
      routingBasePath={marketContext.routingBasePath}
      marketContext={marketContext}
    />
  );
}
