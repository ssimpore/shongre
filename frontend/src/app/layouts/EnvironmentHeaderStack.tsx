import type { ReactNode } from "react";
import { EnvironmentToolbar } from "./EnvironmentToolbar";

interface EnvironmentHeaderStackProps {
  children: ReactNode;
  utility?: ReactNode;
}

/**
 * Keeps the environment disclosure and application header in one sticky
 * chrome stack. Hiding the toolbar lets the application header occupy its space.
 */
export function EnvironmentHeaderStack({
  children,
  utility,
}: EnvironmentHeaderStackProps) {
  return (
    <div data-environment-header-stack="true" className="sticky top-0 z-header">
      <EnvironmentToolbar utility={utility} />
      {children}
    </div>
  );
}
