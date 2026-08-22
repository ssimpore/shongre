import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { resolveSafeReturn } from "../safe-return";

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isRestoring } = useAuth();
  const location = useLocation();

  if (isRestoring) {
    return (
      <div
        className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-stone-600"
        role="status"
        aria-busy="true"
      >
        Vérification de votre session…
      </div>
    );
  }

  if (isAuthenticated) {
    const target = new URLSearchParams(location.search).get("returnTo");
    const safeTarget = resolveSafeReturn(target, "/compte");
    return <Navigate replace to={safeTarget} />;
  }

  return <>{children}</>;
}
