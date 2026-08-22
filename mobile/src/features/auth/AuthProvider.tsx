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
import type { SocialProvider } from "./auth.service";
import { parseNativeAuthCallback } from "./native-callback";
import { notificationsService } from "@/services/notifications/notifications.service";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  socialProviders: Record<SocialProvider, boolean>;
  pendingSocialCompletion: boolean;
  socialNotice: string;
  login(input: LoginRequest): Promise<void>;
  loginWithProvider(provider: SocialProvider): Promise<void>;
  completePendingSocialRegistration(email: string): Promise<void>;
  logout(): Promise<void>;
  deleteAccount(input: AccountDeletionRequest): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [socialProviders, setSocialProviders] = useState<Record<SocialProvider, boolean>>({
    google: false,
    apple: false,
    facebook: false,
  });
  const [pendingCompletionHandle, setPendingCompletionHandle] = useState<string | null>(null);
  const [socialNotice, setSocialNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([authService.restore(), authService.getSocialProviders()])
      .then(([restored, providers]) => {
        if (active) {
          setUser(restored);
          setSocialProviders(providers);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const handleUrl = async (url: string | null) => {
      const callback = parseNativeAuthCallback(url);
      if (!callback) return;
      if (callback.kind === "email_required") {
        if (active) {
          setPendingCompletionHandle(callback.completionHandle);
          setSocialNotice("Votre fournisseur n’a pas transmis d’adresse email. Ajoutez-en une pour continuer.");
        }
        return;
      }
      if (callback.kind === "cancelled") {
        if (active) setSocialNotice("Connexion annulée. Aucun compte n’a été créé.");
        return;
      }
      if (callback.kind !== "exchange") {
        if (active) setSocialNotice("La connexion n’a pas pu être vérifiée. Réessayez.");
        return;
      }
      try {
        const authenticated = await authService.completeSocialLogin(callback.code);
        if (active) {
          setUser(authenticated);
          setPendingCompletionHandle(null);
          setSocialNotice("");
        }
      } catch {
        // Provider and exchange failures remain generic; no provider response
        // or credential is written to logs or surfaced to analytics.
        if (active) setSocialNotice("La connexion n’a pas pu être vérifiée. Réessayez.");
      }
    };
    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => void handleUrl(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const login = useCallback(async (input: LoginRequest) => {
    setUser(await authService.login(input));
  }, []);

  const loginWithProvider = useCallback(async (provider: SocialProvider) => {
    if (!socialProviders[provider]) throw new Error("Cette méthode de connexion est indisponible.");
    setSocialNotice("");
    const authorizationUrl = await authService.startSocialLogin(provider);
    await Linking.openURL(authorizationUrl);
  }, [socialProviders]);

  const completePendingSocialRegistration = useCallback(async (email: string) => {
    if (!pendingCompletionHandle) throw new Error("Cette tentative de connexion a expiré.");
    await authService.completePendingSocialRegistration(pendingCompletionHandle, email);
    setPendingCompletionHandle(null);
    setSocialNotice("Vérifiez votre boîte mail pour activer votre compte.");
  }, [pendingCompletionHandle]);

  const logout = useCallback(async () => {
    await notificationsService.unregisterCurrentDevice();
    await authService.logout();
    setUser(null);
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
      socialProviders,
      pendingSocialCompletion: Boolean(pendingCompletionHandle),
      socialNotice,
      login,
      loginWithProvider,
      completePendingSocialRegistration,
      logout,
      deleteAccount,
    }),
    [user, loading, socialProviders, pendingCompletionHandle, socialNotice, login, loginWithProvider, completePendingSocialRegistration, logout, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
