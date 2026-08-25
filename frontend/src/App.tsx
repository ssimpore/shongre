import { AppProviders } from "./app/providers/AppProviders";
import { AppRouter } from "./app/router";
import type { MarketContext } from "@shongre/contracts";

export function App({
  initialPath = "/",
  routingBasePath = "/",
  marketContext,
}: {
  initialPath?: string;
  routingBasePath?: string;
  marketContext?: MarketContext;
}) {
  return (
    <AppProviders marketContext={marketContext}>
      <AppRouter initialPath={initialPath} basename={routingBasePath} />
    </AppProviders>
  );
}

export default App;
