import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  canonicalAccessContext,
  hasEffectiveCapability,
} from "@shongre/contracts/access-control";
import { useAuth } from "../../app/providers/AuthProvider";
import { routes } from "../../configuration/routes";
import {
  ROUTE_POLICIES,
  canAccessRoutePolicy,
  type RoutePolicyId,
} from "../access-policy.registry";
import { RequireAuth } from "./RequireAuth";
import { RequirePermission } from "./RequirePermission";
import { hasProductAccess } from "../../domains/user/user.domain";
import type { RoutePolicy } from "../access-policy.registry";
import { useDataMode } from "../../app/providers/DataModeProvider";
import { resolveStaffMarketplaceMode } from "../useStaffMarketplaceAccess";
import { applicationHref } from "../../platform/applications/use-application-href";

const ApplicationRedirect: React.FC<{
  applicationId: "facturation";
  pathname: string;
}> = ({ applicationId, pathname }) => {
  const destination = applicationHref(applicationId, pathname);
  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);
  return null;
};

/**
 * Enforces the same named route policy used to build workspace navigation.
 * Capability checks remain UX protection only; backend routes enforce their
 * own policy independently.
 */
export const RequireRoutePolicy: React.FC<{
  policyId: RoutePolicyId;
  standalone?: boolean;
  children: React.ReactNode;
}> = ({ policyId, standalone, children }) => {
  const { currentUser, isRestoring } = useAuth();
  const { mode: dataMode } = useDataMode();
  const location = useLocation();
  const policy: RoutePolicy = ROUTE_POLICIES[policyId];

  if (isRestoring) return null;
  if (!currentUser) {
    return <RequireAuth>{children}</RequireAuth>;
  }

  const access = canonicalAccessContext(currentUser);
  const staffMarketplaceMode = resolveStaffMarketplaceMode(
    currentUser,
    dataMode,
  );
  if (
    access.staffStatus !== "none" &&
    (policy.access === "customer" || policy.access === "professional") &&
    staffMarketplaceMode !== "demo"
  ) {
    return (
      <Navigate
        to={
          access.staffStatus === "active"
            ? routes.admin.overview()
            : routes.contact()
        }
        replace
      />
    );
  }
  if (
    policy.requiresActiveStaff &&
    !hasEffectiveCapability(currentUser, "staff.internal.access")
  ) {
    return <Navigate to={routes.workspace.overview()} replace />;
  }
  if (
    !policy.accountTypes.some((type) => type === access.accountType) &&
    staffMarketplaceMode !== "demo"
  ) {
    if (policy.access === "staff_capability") {
      return <Navigate to={routes.workspace.overview()} replace />;
    }
    if (policy.access === "professional") {
      return <Navigate to={routes.proPlans()} replace />;
    }
    return (
      <Navigate
        to={routes.auth.login(`${location.pathname}${location.search}`)}
        replace
      />
    );
  }

  if (
    canAccessRoutePolicy(currentUser, policyId, {
      allowStaffMarketplaceDemo: staffMarketplaceMode === "demo",
    })
  ) {
    return <>{children}</>;
  }
  if (policy.productId && !hasProductAccess(currentUser, policy.productId)) {
    if (policy.productId === "facturation") {
      return (
        <ApplicationRedirect
          applicationId="facturation"
          pathname="/activation"
        />
      );
    }
    return <Navigate to={routes.proPlans()} replace />;
  }
  if (!policy.capability) return <>{children}</>;

  return (
    <RequirePermission permission={policy.capability} standalone={standalone}>
      {children}
    </RequirePermission>
  );
};
