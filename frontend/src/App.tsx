import { AppProviders } from "./app/providers/AppProviders";
import { AppRouter } from "./app/router";
import type { MarketContext } from "@shongre/contracts";
import type { ShongreApplicationId } from "./platform/applications/application-registry";

export function App({
  initialPath = "/",
  routingBasePath = "/",
  marketContext,
  applicationId = "marketplace",
}: {
  initialPath?: string;
  routingBasePath?: string;
  marketContext?: MarketContext;
  applicationId?: ShongreApplicationId;
}) {
  return (
    <AppProviders marketContext={marketContext}>
      <AppRouter
        initialPath={initialPath}
        basename={routingBasePath}
        applicationId={applicationId}
      />
    </AppProviders>
  );
}

export default App;
