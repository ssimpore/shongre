import { unsubscribeWebPush } from "../../platform/notifications/web-push";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import {
  UserProfile,
  ProfessionalVertical,
  UserRole,
  PlatformRole,
  AccountType,
  Permission,
  AuthResult,
  ShongreProductId,
} from "../../types";
import { services } from "../../api/client/service-registry";
import {
  authorizationService,
  ResourceOwnershipContext,
  AuthorizationContextOptions,
} from "../../security/authorization.service";
import { normalizePlatformRole } from "../../security/roles.config";
import {
  isProSeller,
  isAccountSuspended,
  isAccountLimited,
} from "../../domains/user/user.domain";
import { analyticsService } from "../../services/analytics.service";
import type { AuthProfileUpdate } from "../../api/contracts/auth.contract";

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole;
  platformRole: PlatformRole;
  accountType: AccountType;
  effectivePermissions: Permission[];
  isAuthenticated: boolean;
  isRestoring: boolean;
  isSuspended: boolean;
  isLimited: boolean;
  isPro: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  login: (
    email: string,
    password: string,
    options?: { rememberMe?: boolean },
  ) => Promise<AuthResult>;
  loginWithMFA: (tempToken: string, code: string) => Promise<AuthResult>;
  registerIndividual: (data: {
    name: string;
    email: string;
    password: string;
    city: string;
    postalCode: string;
    country?: string;
    termsAccepted: boolean;
    marketingConsent?: boolean;
  }) => Promise<AuthResult>;
  registerProfessional: (data: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    professionalVertical: ProfessionalVertical;
    sirenSiret: string;
    legalForm: string;
    vatNumber?: string;
    businessAddress: string;
    city: string;
    postalCode: string;
    country?: string;
    phone?: string;
    termsAccepted: boolean;
    marketingConsent?: boolean;
    requestedProduct?: ShongreProductId;
  }) => Promise<AuthResult>;
  upgradeToPro: (proData: {
    companyName: string;
    sirenSiret: string;
    legalForm: string;
    vatNumber?: string;
    businessAddress: string;
    phone?: string;
  }) => Promise<AuthResult>;
  refreshUser: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateProfile: (updates: AuthProfileUpdate) => Promise<void>;
  can: (
    permission: Permission,
    resource?: ResourceOwnershipContext | any,
    options?: AuthorizationContextOptions,
  ) => boolean;
  canAccessMarket: (countryCode?: string) => boolean;
  logout: () => Promise<void>;
  loginAs: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CHANNEL = "shongre-auth-v1";

function announceAuthChange(type: "login" | "logout"): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(AUTH_CHANNEL);
  channel.postMessage({ type });
  channel.close();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const refreshUser = useCallback(async () => {
    setCurrentUser(await services.auth.getCurrentUser());
  }, []);

  useEffect(() => {
    let active = true;
    // Restoration is a transition so it cannot force a still-hydrating page
    // boundary to drop its server HTML; see ConsentProvider.
    services.auth
      .getCurrentUser()
      .then((user) => {
        if (active) startTransition(() => setCurrentUser(user));
      })
      .catch(() => {
        if (active) startTransition(() => setCurrentUser(null));
      })
      .finally(() => {
        if (active) startTransition(() => setIsRestoring(false));
      });

    if (typeof BroadcastChannel === "undefined") {
      return () => {
        active = false;
      };
    }
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.onmessage = () => {
      void services.auth
        .getCurrentUser()
        .then((user) => {
          if (active) setCurrentUser(user);
        })
        .catch(() => undefined);
    };
    return () => {
      active = false;
      channel.close();
    };
  }, []);

  const platformRole = useMemo<PlatformRole>(() => {
    if (!currentUser) return "guest";
    return currentUser.primaryRole || normalizePlatformRole(currentUser.role);
  }, [currentUser]);

  const accountType = useMemo<AccountType>(() => {
    if (!currentUser) return "individual";
    return (
      currentUser.accountType ||
      (isProSeller(currentUser) ? "professional" : "individual")
    );
  }, [currentUser]);

  const effectivePermissions = useMemo<Permission[]>(() => {
    return authorizationService.getEffectivePermissions(currentUser);
  }, [currentUser]);

  const isSuspended = Boolean(isAccountSuspended(currentUser));
  const isLimited = Boolean(isAccountLimited(currentUser));
  const isPro = Boolean(isProSeller(currentUser));

  const isEmailVerified = Boolean(currentUser?.isEmailVerified);
  const isPhoneVerified = Boolean(currentUser?.isPhoneVerified);
  const isIdentityVerified = Boolean(currentUser?.isIdentityVerified);

  const hydrateProductProjection = useCallback(
    async (fallback: UserProfile) => {
      try {
        return (await services.auth.getCurrentUser()) ?? fallback;
      } catch {
        return fallback;
      }
    },
    [],
  );

  const login = useCallback(
    async (
      email: string,
      password: string,
      options?: { rememberMe?: boolean },
    ): Promise<AuthResult> => {
      analyticsService.track("login_started", { source: "email_password" });
      const result = await services.auth.login({
        email,
        password,
        rememberMe: options?.rememberMe,
      });
      if (result.success && result.user) {
        setCurrentUser(await hydrateProductProjection(result.user));
        announceAuthChange("login");
        analyticsService.track("login_completed", { source: "email_password" });
      }
      return result;
    },
    [hydrateProductProjection],
  );

  const loginWithMFA = useCallback(
    async (tempToken: string, code: string): Promise<AuthResult> => {
      analyticsService.track("login_started", { source: "mfa" });
      const result = await services.auth.loginWithMFA(tempToken, code);
      if (result.success && result.user) {
        setCurrentUser(await hydrateProductProjection(result.user));
        announceAuthChange("login");
        analyticsService.track("login_completed", { source: "mfa" });
      }
      return result;
    },
    [hydrateProductProjection],
  );

  const registerIndividual = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      city: string;
      postalCode: string;
      country?: string;
      termsAccepted: boolean;
      marketingConsent?: boolean;
    }): Promise<AuthResult> => {
      analyticsService.track("signup_started", { source: "individual" });
      const result = await services.auth.registerIndividual(data);
      if (result.success && result.user) {
        setCurrentUser(await hydrateProductProjection(result.user));
        announceAuthChange("login");
        analyticsService.track("signup_completed", { source: "individual" });
      }
      return result;
    },
    [hydrateProductProjection],
  );

  const registerProfessional = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      companyName: string;
      professionalVertical: ProfessionalVertical;
      sirenSiret: string;
      legalForm: string;
      vatNumber?: string;
      businessAddress: string;
      city: string;
      postalCode: string;
      country?: string;
      phone?: string;
      termsAccepted: boolean;
      marketingConsent?: boolean;
      requestedProduct?: ShongreProductId;
    }): Promise<AuthResult> => {
      analyticsService.track("signup_started", { source: "professional" });
      const result = await services.auth.registerProfessional(data);
      if (result.success && result.user) {
        setCurrentUser(await hydrateProductProjection(result.user));
        announceAuthChange("login");
        analyticsService.track("signup_completed", { source: "professional" });
      }
      return result;
    },
    [hydrateProductProjection],
  );

  const upgradeToPro = useCallback(
    async (proData: {
      companyName: string;
      sirenSiret: string;
      legalForm: string;
      vatNumber?: string;
      businessAddress: string;
      phone?: string;
    }): Promise<AuthResult> => {
      if (!currentUser) {
        return {
          success: false,
          errorMessage: "Vous devez être connecté pour effectuer cette action.",
        };
      }
      const result = await services.auth.upgradeToProfessional(proData);
      if (result.success && result.user) {
        setCurrentUser(result.user);
      }
      return result;
    },
    [currentUser],
  );

  const switchRole = useCallback(async (newRole: UserRole) => {
    const user = await services.auth.switchRole(newRole);
    setCurrentUser(user);
    announceAuthChange(user ? "login" : "logout");
  }, []);

  const updateProfile = useCallback(
    async (updates: AuthProfileUpdate) => {
      if (!currentUser) return;
      const updated = await services.auth.updateProfile(updates);
      setCurrentUser(updated);
    },
    [currentUser],
  );

  const can = useCallback(
    (
      permission: Permission,
      resource?: ResourceOwnershipContext | any,
      options?: AuthorizationContextOptions,
    ): boolean => {
      return authorizationService.can(
        currentUser,
        permission,
        resource,
        options,
      );
    },
    [currentUser],
  );

  const canAccessMarket = useCallback(
    (countryCode?: string): boolean => {
      return authorizationService.canAccessMarket(currentUser, countryCode);
    },
    [currentUser],
  );

  const logout = useCallback(async () => {
    analyticsService.track("logout_completed");
    // This browser stops being the account's device before the session ends,
    // like the native flow unregisters its push token on logout.
    try {
      const subscription = await unsubscribeWebPush();
      if (subscription) {
        await services.notifications.unregisterWebPushDevice(subscription);
      }
    } catch {
      // A push registration that outlives the session is removed by the
      // push service's next 410, and must not keep the visitor signed in.
    }
    await services.auth.logout();
    setCurrentUser(null);
    announceAuthChange("logout");
  }, []);

  const loginAs = useCallback(
    (targetRole: UserRole) => {
      switchRole(targetRole);
    },
    [switchRole],
  );

  /*
   * A fresh object literal here re-rendered all ~90 `useAuth()` consumers on
   * every provider render, and the handlers above were plain declarations, so
   * `React.memo` could not hold anywhere downstream either.
   */
  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      role: (currentUser?.role as UserRole) || "guest",
      platformRole,
      accountType,
      effectivePermissions,
      isAuthenticated: Boolean(currentUser && platformRole !== "guest"),
      isRestoring,
      isSuspended,
      isLimited,
      isPro,
      isEmailVerified,
      isPhoneVerified,
      isIdentityVerified,
      login,
      loginWithMFA,
      registerIndividual,
      registerProfessional,
      upgradeToPro,
      refreshUser,
      switchRole,
      updateProfile,
      can,
      canAccessMarket,
      logout,
      loginAs,
    }),
    [
      currentUser,
      platformRole,
      accountType,
      effectivePermissions,
      isRestoring,
      isSuspended,
      isLimited,
      isPro,
      isEmailVerified,
      isPhoneVerified,
      isIdentityVerified,
      login,
      loginWithMFA,
      registerIndividual,
      registerProfessional,
      upgradeToPro,
      refreshUser,
      switchRole,
      updateProfile,
      can,
      canAccessMarket,
      logout,
      loginAs,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
