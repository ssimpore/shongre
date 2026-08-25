import { AppProviders } from "./app/providers/AppProviders";
import { AppRouter } from "./app/router";

export function App({ initialPath = "/" }: { initialPath?: string }) {
  return (
    <AppProviders>
      <AppRouter initialPath={initialPath} />
    </AppProviders>
  );
}

export default App;
