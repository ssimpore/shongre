import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  UserProfile,
  UserRole,
  PlatformRole,
  AccountType,
  Permission,
  AuthResult,
} from "../../types";
import { userRepository } from "../../repositories/user.repository";
import { services } from "../../api/client/service-registry";
import { authService as demoProfileUpgradeService } from "../../domains/auth/auth.service";
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
  switchDemoUser: (userKey: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  can: (
    permission: Permission,
    resource?: ResourceOwnershipContext | any,
    options?: AuthorizationContextOptions,
  ) => boolean;
  hasEntitlement: (
    entitlement:
      | "storefrontCustomization"
      | "prioritySupport"
      | "bulkImportExport"
      | "automaticRelisting",
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
    services.auth
      .getCurrentUser()
      .then((user) => {
        if (active) setCurrentUser(user);
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });

    if (typeof BroadcastChannel === "undefined") {
      return () => {
        active = false;
      };
    }
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.onmessage = () => {
      void services.auth.getCurrentUser().then((user) => {
        if (active) setCurrentUser(user);
      });
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

  const login = async (
    email: string,
    password: string,
    options?: { rememberMe?: boolean },
  ): Promise<AuthResult> => {
    const result = await services.auth.login({ email, password, rememberMe: options?.rememberMe });
    if (result.success && result.user) {
      setCurrentUser(result.user);
      announceAuthChange("login");
    }
    return result;
  };

  const loginWithMFA = async (
    tempToken: string,
    code: string,
  ): Promise<AuthResult> => {
    const result = await services.auth.loginWithMFA(tempToken, code);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      announceAuthChange("login");
    }
    return result;
  };

  const registerIndividual = async (data: {
    name: string;
    email: string;
    password: string;
    city: string;
    postalCode: string;
    country?: string;
    termsAccepted: boolean;
    marketingConsent?: boolean;
  }): Promise<AuthResult> => {
    const result = await services.auth.registerIndividual(data);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      announceAuthChange("login");
    }
    return result;
  };

  const registerProfessional = async (data: {
    name: string;
    email: string;
    password: string;
    companyName: string;
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
  }): Promise<AuthResult> => {
    const result = await services.auth.registerProfessional(data);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      announceAuthChange("login");
    }
    return result;
  };

  const upgradeToPro = async (proData: {
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
    const result = await demoProfileUpgradeService.upgradeIndividualToPro(
      currentUser.id,
      proData,
    );
    if (result.success && result.user) {
      setCurrentUser(result.user);
    }
    return result;
  };

  const switchRole = async (newRole: UserRole) => {
    const user = await services.auth.switchRole(newRole);
    setCurrentUser(user);
  };

  const switchDemoUser = async (userKey: string) => {
    const user = await services.auth.switchDemoUser(userKey);
    setCurrentUser(user);
    if (user) announceAuthChange("login");
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = await userRepository.updateProfile(currentUser.id, updates);
    setCurrentUser(updated);
  };

  const can = (
    permission: Permission,
    resource?: ResourceOwnershipContext | any,
    options?: AuthorizationContextOptions,
  ): boolean => {
    return authorizationService.can(currentUser, permission, resource, options);
  };

  const hasEntitlement = (
    entitlement:
      | "storefrontCustomization"
      | "prioritySupport"
      | "bulkImportExport"
      | "automaticRelisting",
  ): boolean => {
    return authorizationService.hasEntitlement(currentUser, entitlement);
  };

  const canAccessMarket = (countryCode?: string): boolean => {
    return authorizationService.canAccessMarket(currentUser, countryCode);
  };

  const logout = async () => {
    await services.auth.logout();
    setCurrentUser(null);
    announceAuthChange("logout");
  };

  const loginAs = (targetRole: UserRole) => {
    switchRole(targetRole);
  };

  return (
    <AuthContext.Provider
      value={{
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
        switchDemoUser,
        updateProfile,
        can,
        hasEntitlement,
        canAccessMarket,
        logout,
        loginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
