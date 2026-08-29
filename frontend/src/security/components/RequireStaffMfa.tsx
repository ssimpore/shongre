import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";

/**
 * Mirrors the backend's mandatory staff MFA gate for navigation UX. The API
 * remains authoritative; this guard prevents an unverified OAuth or legacy
 * session from rendering a console that every data request will reject.
 */
export const RequireStaffMfa: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser } = useAuth();
  const [state, setState] = useState<"loading" | "allowed" | "required">(
    "loading",
  );

  useEffect(() => {
    if (currentUser?.staffStatus !== "active") {
      setState("allowed");
      return;
    }
    let active = true;
    void services.auth
      .getMfaStatus()
      .then((status) => {
        if (active)
          setState(
            status.required && !status.sessionVerified ? "required" : "allowed",
          );
      })
      .catch(() => {
        if (active) setState("required");
      });
    return () => {
      active = false;
    };
  }, [currentUser]);

  if (state === "loading") return null;
  if (state === "required") return <Navigate to="/securite-interne" replace />;
  return <>{children}</>;
};
