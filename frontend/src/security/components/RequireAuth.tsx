import React from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { AuthRequiredPrompt } from "../../features/auth/components/AuthRequiredPrompt";

export interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { isAuthenticated, isRestoring, currentUser } = useAuth();

  if (isRestoring) {
    return (
      <div
        className="max-w-xl mx-auto px-4 py-16 text-center text-sm text-text-supporting"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        Vérification de votre session…
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <AuthRequiredPrompt />;
  }

  return <>{children}</>;
};
