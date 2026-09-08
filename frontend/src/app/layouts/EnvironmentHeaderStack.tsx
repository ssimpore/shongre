import type { ReactNode } from "react";
import { EnvironmentToolbar } from "./EnvironmentToolbar";

interface EnvironmentHeaderStackProps {
  children: ReactNode;
  utility?: ReactNode;
}

/**
 * Keeps the environment disclosure and application header in one sticky
 * chrome stack. The environment toolbar owns development-diagnostic alignment
 * so direct toolbar consumers and stacked application headers behave alike.
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
