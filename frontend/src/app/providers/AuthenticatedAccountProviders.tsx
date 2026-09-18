import { Suspense, lazy, type ReactNode } from "react";
import { NotificationProvider } from "./NotificationProvider";
import { WorkspaceSummaryProvider } from "./WorkspaceSummaryProvider";
import { useAuth } from "./AuthProvider";

// Renders nothing, so it can load late without moving the tree: a guest never
// downloads the presence heartbeat, and a signed-in reader is not remounted
// when it arrives.
const UserPresenceBridge = lazy(() =>
  import("./UserPresenceBridge").then((module) => ({
    default: module.UserPresenceBridge,
  })),
);

/**
 * Account data providers. The context providers stay mounted for a guest and
 * idle until a real session has been restored, so the tree above the
 * application keeps its shape when the session arrives — inserting them at
 * that moment remounted every page and discarded whatever a signed-in reader
 * had already typed.
 */
export function AuthenticatedAccountProviders({
  children,
}: {
  children: ReactNode;
}) {
  const { currentUser, isRestoring } = useAuth();
  return (
    <WorkspaceSummaryProvider>
      {currentUser && !isRestoring ? (
        <Suspense fallback={null}>
          <UserPresenceBridge />
        </Suspense>
      ) : null}
      <NotificationProvider>{children}</NotificationProvider>
    </WorkspaceSummaryProvider>
  );
}
