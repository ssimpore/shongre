import { useEffect, useRef, useState, type ReactNode } from "react";
import { Database, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";
import { routes } from "../../configuration/routes";
import { useTranslation } from "../../i18n/I18nProvider";
import { useStaffMarketplaceAccess } from "../../security/useStaffMarketplaceAccess";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import { browserPreferencesService } from "../../services/browser-preferences.service";

const TOOLBAR_ID = "api-environment-toolbar";

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
  const environment = getPublicRuntimeConfig().appEnvironment;
  const preferenceKey = `shongre_environment_toolbar_hidden_v1:${environment}`;
  const [isHidden, setIsHidden] = useState(false);
  const hideButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    setIsHidden(
      browserPreferencesService.getByKey<boolean>(preferenceKey, false) ===
        true,
    );
  }, [preferenceKey]);

  useEffect(() => {
    if (!restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    (isHidden ? restoreButtonRef : hideButtonRef).current?.focus({
      preventScroll: true,
    });
  }, [isHidden]);

  const setToolbarHidden = (hidden: boolean) => {
    restoreFocusRef.current = true;
    browserPreferencesService.setByKey(preferenceKey, hidden);
    setIsHidden(hidden);
  };

  return (
    <>
      <div
        id={TOOLBAR_ID}
        data-environment-toolbar="api"
        hidden={isHidden}
        className={`relative z-drawer min-h-environment-toolbar-height items-center border-b border-success-inverse-deep bg-success-inverse-deep px-semantic-lg py-1.5 text-xs text-success-on-inverse-soft lg:px-semantic-4xl ${isHidden ? "hidden" : "flex"}`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-nowrap items-center justify-between gap-3">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded bg-success px-2 py-1 text-micro font-bold uppercase tracking-wider text-text-inverse">
              <Database className="h-icon-xs w-icon-xs" aria-hidden="true" />
              {t("shell.environment.label", {
                environment,
              })}
            </span>
            <span className="hidden h-7 items-center truncate text-success-on-inverse-muted lg:inline-flex">
              {t("shell.environment.apiSummary")}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2">
            <div className="flex min-w-0 items-center justify-end gap-2">
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
              ref={hideButtonRef}
              data-environment-toolbar-toggle="true"
              aria-controls={TOOLBAR_ID}
              aria-expanded="true"
              aria-label={t("shell.environment.hideToolbar")}
              title={t("shell.environment.hideToolbar")}
              onClick={() => setToolbarHidden(true)}
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-success-on-inverse-muted motion-interactive hover:bg-success-inverse hover:text-text-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-on-inverse"
            >
              <X className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      {isHidden && (
        <button
          type="button"
          ref={restoreButtonRef}
          data-environment-toolbar-restore="true"
          aria-controls={TOOLBAR_ID}
          aria-expanded="false"
          aria-label={t("shell.environment.showToolbar")}
          title={t("shell.environment.showToolbar")}
          onClick={() => setToolbarHidden(false)}
          className="fixed bottom-mobile-nav-clearance-gutter right-4 z-popover inline-flex h-control-touch w-control-touch items-center justify-center rounded-full border border-border-base bg-bg-surface text-text-muted shadow-dropdown motion-interactive hover:bg-bg-subtle hover:text-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:bottom-4"
        >
          <Database className="h-icon-md w-icon-md" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
