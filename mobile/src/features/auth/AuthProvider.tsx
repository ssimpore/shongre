import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type {
  AccountDeletionRequest,
  AuthUser,
  LoginRequest,
} from "@shongre/contracts";
import { authService } from "./auth.service";
import { notificationsService } from "@/services/notifications/notifications.service";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login(input: LoginRequest): Promise<void>;
  logout(): Promise<void>;
  deleteAccount(input: AccountDeletionRequest): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authService
      .restore()
      .then((restored) => {
        if (active) setUser(restored);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginRequest) => {
    setUser(await authService.login(input));
  }, []);

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
    () => ({ user, loading, login, logout, deleteAccount }),
    [user, loading, login, logout, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
