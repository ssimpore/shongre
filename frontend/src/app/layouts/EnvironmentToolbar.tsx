import { useState, type ReactNode } from "react";
import { ChevronDown, Database, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";
import { routes } from "../../configuration/routes";
import { useTranslation } from "../../i18n/I18nProvider";
import { useStaffMarketplaceAccess } from "../../security/useStaffMarketplaceAccess";
import { DevelopmentIndicatorAlignment } from "./DevelopmentIndicatorAlignment";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";

function StaffReadOnlyIndicator() {
  const { t } = useTranslation();
  const { isStaff } = useStaffMarketplaceAccess();
  if (!isStaff) return null;

  const title = t("staffMarketplace.readOnly.title");
  const description = t("staffMarketplace.readOnly.description");
  return (
    <Link
      to={routes.admin.overview()}
      data-testid="staff-marketplace-mode"
      data-mode="read-only"
      aria-label={`${title} ${description} ${t("staffMarketplace.openAdmin")}`}
      title={`${title} ${description}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-info/60 bg-info/15 text-info transition-colors hover:bg-info/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-on-inverse"
    >
      <ShieldCheck className="h-icon-sm w-icon-sm" aria-hidden="true" />
    </Link>
  );
}

export function EnvironmentToolbar({ utility }: { utility?: ReactNode }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleLabel = isCollapsed
    ? t("shell.environment.expandToolbar")
    : t("shell.environment.collapseToolbar");

  return (
    <>
      <div
        data-environment-toolbar="api"
        data-collapsed={isCollapsed}
        className={`relative z-drawer flex items-center border-b border-success-inverse-deep bg-success-inverse-deep pl-semantic-lg pr-semantic-4xl text-xs text-success-on-inverse-soft motion-layout motion-reduce:transition-none lg:pl-semantic-4xl ${
          isCollapsed
            ? "min-h-control-sm py-0"
            : "min-h-environment-toolbar-height py-1.5"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-nowrap items-center justify-between gap-3">
          <div
            id="api-environment-toolbar-context"
            aria-hidden={isCollapsed}
            className={`${isCollapsed ? "hidden" : "flex"} min-w-0 shrink-0 items-center gap-2 animate-in fade-in duration-fast`}
          >
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded bg-success px-2 py-1 text-micro font-bold uppercase tracking-wider text-text-inverse">
              <Database className="h-icon-xs w-icon-xs" aria-hidden="true" />
              {t("shell.environment.label", {
                environment: getPublicRuntimeConfig().appEnvironment,
              })}
            </span>
            <span className="hidden h-7 items-center truncate text-success-on-inverse-muted lg:inline-flex">
              {t("shell.environment.apiSummary")}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2">
            <div
              id="api-environment-toolbar-actions"
              aria-hidden={isCollapsed}
              className={`${isCollapsed ? "hidden" : "flex"} min-w-0 items-center justify-end gap-2 animate-in fade-in duration-fast`}
            >
              {utility}
              <StaffReadOnlyIndicator />
              {currentUser ? (
                <span className="inline-flex h-7 min-w-0 items-center truncate font-semibold text-text-inverse">
                  {currentUser.name}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              data-environment-toolbar-toggle="true"
              aria-controls="api-environment-toolbar-context api-environment-toolbar-actions"
              aria-expanded={!isCollapsed}
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={() => setIsCollapsed((collapsed) => !collapsed)}
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-success-on-inverse-muted motion-interactive hover:bg-success-inverse hover:text-text-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-on-inverse"
            >
              <span
                className={`inline-flex transition-transform duration-fast ${isCollapsed ? "" : "rotate-180"}`}
              >
                <ChevronDown
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
              </span>
            </button>
          </div>
        </div>
      </div>
      <DevelopmentIndicatorAlignment />
    </>
  );
}
