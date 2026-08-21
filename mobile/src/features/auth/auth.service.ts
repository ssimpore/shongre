import {
  accountDeletionRequestSchema,
  authSessionSchema,
  authUserSchema,
  loginRequestSchema,
  type AccountDeletionRequest,
  type AuthSession,
  type AuthUser,
  type LoginRequest,
} from "@shongre/contracts";
import { apiRequest, sessionStorage } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";

export interface AuthService {
  restore(): Promise<AuthUser | null>;
  login(input: LoginRequest): Promise<AuthUser>;
  logout(): Promise<void>;
  deleteAccount(input: AccountDeletionRequest): Promise<void>;
}

const demoSession: AuthSession = {
  token: "demo-mobile-session",
  user: {
    id: "user_thomas",
    email: "thomas.laurent@example.fr",
    name: "Thomas Laurent",
    role: "individual_buyer",
    accountType: "individual",
  },
};

export class DemoAuthService implements AuthService {
  async restore(): Promise<AuthUser | null> {
    const stored = await sessionStorage.read();
    if (!stored) return null;
    const parsed = authUserSchema.safeParse(stored.user);
    return parsed.success ? parsed.data : null;
  }

  async login(input: LoginRequest): Promise<AuthUser> {
    const credentials = loginRequestSchema.parse(input);
    if (credentials.password.length < 6)
      throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
    const session = {
      ...demoSession,
      user: { ...demoSession.user, email: credentials.email.toLowerCase() },
    };
    await sessionStorage.write(session);
    return session.user;
  }

  async logout(): Promise<void> {
    await sessionStorage.clear();
  }

  async deleteAccount(input: AccountDeletionRequest): Promise<void> {
    accountDeletionRequestSchema.parse(input);
    await sessionStorage.clear();
  }
}

export class HttpAuthService implements AuthService {
  async restore(): Promise<AuthUser | null> {
    const session = await sessionStorage.read();
    if (!session) return null;
    try {
      const user = await apiRequest<unknown>("/auth/me");
      return authUserSchema.parse(user);
    } catch {
      await sessionStorage.clear();
      return null;
    }
  }

  async login(input: LoginRequest): Promise<AuthUser> {
    const credentials = loginRequestSchema.parse(input);
    const session = authSessionSchema.parse(
      await apiRequest<unknown>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    );
    await sessionStorage.write(session);
    return session.user;
  }

  async logout(): Promise<void> {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      await sessionStorage.clear();
    }
  }

  async deleteAccount(input: AccountDeletionRequest): Promise<void> {
    const body = accountDeletionRequestSchema.parse(input);
    await apiRequest("/account/delete", {
      method: "POST",
      body: JSON.stringify(body),
    });
    await sessionStorage.clear();
  }
}

export const authService: AuthService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoAuthService()
    : new HttpAuthService();
