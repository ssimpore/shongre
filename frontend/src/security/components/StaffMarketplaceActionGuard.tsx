import React, { useEffect } from "react";
import { useToast } from "../../app/providers/ToastProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { useStaffMarketplaceAccess } from "../useStaffMarketplaceAccess";

export const STAFF_MARKETPLACE_ACTION_ATTRIBUTE =
  "data-marketplace-action" as const;

function findMarketplaceActionTarget(event: Event): Element | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const actionTarget = target.closest(
    `[${STAFF_MARKETPLACE_ACTION_ATTRIBUTE}]`,
  );
  // A marker on a form protects keyboard submission without making its fields
  // read-only. Clicks are intercepted only by an explicitly marked control.
  if (event.type === "click" && actionTarget?.tagName === "FORM") return null;
  return actionTarget;
}

/**
 * Stops read-only Staff before React Router, form handlers, service adapters,
 * or provider SDKs receive a protected marketplace action. This is a UX
 * safeguard only: demo adapters and the API independently authorize the same
 * operation.
 */
export const StaffMarketplaceActionGuard: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { isReadOnly } = useStaffMarketplaceAccess();
  const { warning } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isReadOnly) return;

    const intercept = (event: Event) => {
      if (!findMarketplaceActionTarget(event)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      warning(
        t("staffMarketplace.actionBlocked.description"),
        t("staffMarketplace.actionBlocked.title"),
      );
    };

    document.addEventListener("click", intercept, true);
    document.addEventListener("submit", intercept, true);
    return () => {
      document.removeEventListener("click", intercept, true);
      document.removeEventListener("submit", intercept, true);
    };
  }, [isReadOnly, t, warning]);

  return <>{children}</>;
};
