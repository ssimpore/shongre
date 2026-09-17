import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import * as Linking from "expo-linking";
import type {
  AccountDeletionRequest,
  AuthUser,
  LoginRequest,
} from "@shongre/contracts";
import { authService } from "./auth.service";
import type {
  MobileLoginResult,
  MobileRegisterInput,
  SocialProvider,
} from "./auth.service";
import { parseNativeAuthCallback } from "./native-callback";
import { notificationsService } from "@/services/notifications/notifications.service";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  socialProviders: Record<SocialProvider, boolean>;
  pendingSocialCompletion: boolean;
  socialNotice: string;
  login(input: LoginRequest): Promise<MobileLoginResult>;
  register(input: MobileRegisterInput): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  completeMfa(tempMfaToken: string, code: string): Promise<void>;
  loginWithProvider(provider: SocialProvider): Promise<void>;
  completePendingSocialRegistration(email: string): Promise<void>;
  retryRestore(): Promise<void>;
  logout(): Promise<void>;
  deleteAccount(input: AccountDeletionRequest): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socialProviders, setSocialProviders] = useState<
    Record<SocialProvider, boolean>
  >({
    google: false,
    apple: false,
    facebook: false,
  });
  const [pendingCompletionHandle, setPendingCompletionHandle] = useState<
    string | null
  >(null);
  const [socialNotice, setSocialNotice] = useState("");

  const restore = useCallback(async () => {
    setLoading(true);
    setError("");
    const [sessionResult, providersResult] = await Promise.allSettled([
      authService.restore(),
      authService.getSocialProviders(),
    ]);
    if (sessionResult.status === "fulfilled") {
      setUser(sessionResult.value);
    } else {
      setError(
        "Impossible de vérifier votre session. Vérifiez votre connexion puis réessayez.",
      );
    }
    if (providersResult.status === "fulfilled") {
      setSocialProviders(providersResult.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const bootstrap = setTimeout(() => void restore(), 0);
    return () => clearTimeout(bootstrap);
  }, [restore]);

  useEffect(() => {
    let active = true;
    const handleUrl = async (url: string | null) => {
      const callback = parseNativeAuthCallback(url);
      if (!callback) return;
      if (callback.kind === "email_required") {
        if (active) {
          setPendingCompletionHandle(callback.completionHandle);
          setSocialNotice(
            "Votre fournisseur n’a pas transmis d’adresse email. Ajoutez-en une pour continuer.",
          );
        }
        return;
      }
      if (callback.kind === "cancelled") {
        if (active)
          setSocialNotice("Connexion annulée. Aucun compte n’a été créé.");
        return;
      }
      if (callback.kind !== "exchange") {
        if (active)
          setSocialNotice("La connexion n’a pas pu être vérifiée. Réessayez.");
        return;
      }
      try {
        const authenticated = await authService.completeSocialLogin(
          callback.code,
        );
        if (active) {
          setUser(authenticated);
          setPendingCompletionHandle(null);
          setSocialNotice("");
        }
      } catch {
        // Provider and exchange failures remain generic; no provider response
        // or credential is written to logs or surfaced to analytics.
        if (active)
          setSocialNotice("La connexion n’a pas pu être vérifiée. Réessayez.");
      }
    };
    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener(
      "url",
      ({ url }) => void handleUrl(url),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const login = useCallback(async (input: LoginRequest) => {
    const result = await authService.login(input);
    if (result.kind === "authenticated") setUser(result.user);
    return result;
  }, []);

  const register = useCallback(async (input: MobileRegisterInput) => {
    setUser(await authService.register(input));
  }, []);

  const requestPasswordReset = useCallback(
    (email: string) => authService.requestPasswordReset(email),
    [],
  );

  const completeMfa = useCallback(
    async (tempMfaToken: string, code: string) => {
      setUser(await authService.completeMfa(tempMfaToken, code));
    },
    [],
  );

  const loginWithProvider = useCallback(
    async (provider: SocialProvider) => {
      if (!socialProviders[provider])
        throw new Error("Cette méthode de connexion est indisponible.");
      setSocialNotice("");
      const authorizationUrl = await authService.startSocialLogin(provider);
      await Linking.openURL(authorizationUrl);
    },
    [socialProviders],
  );

  const completePendingSocialRegistration = useCallback(
    async (email: string) => {
      if (!pendingCompletionHandle)
        throw new Error("Cette tentative de connexion a expiré.");
      await authService.completePendingSocialRegistration(
        pendingCompletionHandle,
        email,
      );
      setPendingCompletionHandle(null);
      setSocialNotice("Vérifiez votre boîte mail pour activer votre compte.");
    },
    [pendingCompletionHandle],
  );

  const logout = useCallback(async () => {
    try {
      await notificationsService.unregisterCurrentDevice();
    } finally {
      try {
        await authService.logout();
      } finally {
        setUser(null);
      }
    }
  }, []);

  const deleteAccount = useCallback(async (input: AccountDeletionRequest) => {
    await notificationsService.unregisterCurrentDevice();
    await authService.deleteAccount(input);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      socialProviders,
      pendingSocialCompletion: Boolean(pendingCompletionHandle),
      socialNotice,
      login,
      register,
      requestPasswordReset,
      completeMfa,
      loginWithProvider,
      completePendingSocialRegistration,
      retryRestore: restore,
      logout,
      deleteAccount,
    }),
    [
      user,
      loading,
      error,
      socialProviders,
      pendingCompletionHandle,
      socialNotice,
      login,
      register,
      requestPasswordReset,
      completeMfa,
      loginWithProvider,
      completePendingSocialRegistration,
      restore,
      logout,
      deleteAccount,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
