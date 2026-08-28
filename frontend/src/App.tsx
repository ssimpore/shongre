import { AppProviders } from "./app/providers/AppProviders";
import { AppRouter } from "./app/router";
import type { MarketContext } from "@shongre/contracts";
import type { ShongreApplicationId } from "./platform/applications/application-registry";
import type { PublicRouteData } from "./platform/seo/public-route-data";

export function App({
  initialPath = "/",
  routingBasePath = "/",
  marketContext,
  applicationId = "marketplace",
  initialPublicRouteData,
}: {
  initialPath?: string;
  routingBasePath?: string;
  marketContext?: MarketContext;
  applicationId?: ShongreApplicationId;
  initialPublicRouteData?: PublicRouteData | null;
}) {
  return (
    <AppProviders
      marketContext={marketContext}
      initialPublicRouteData={initialPublicRouteData}
    >
      <AppRouter
        initialPath={initialPath}
        basename={routingBasePath}
        applicationId={applicationId}
      />
    </AppProviders>
  );
}

export default App;
