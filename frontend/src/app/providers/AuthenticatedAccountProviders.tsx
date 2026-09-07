import type { ReactNode } from "react";
import { NotificationProvider } from "./NotificationProvider";
import { WorkspaceSummaryProvider } from "./WorkspaceSummaryProvider";

/** Data providers used only after a real account session has been restored. */
export function AuthenticatedAccountProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceSummaryProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </WorkspaceSummaryProvider>
  );
}
