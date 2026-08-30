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
import { requireMobileCustomer, StaffMobileAccessError } from "./staff-access";

export { requireMobileCustomer, StaffMobileAccessError } from "./staff-access";

export interface AuthService {
  restore(): Promise<AuthUser | null>;
  login(input: LoginRequest): Promise<AuthUser>;
  getSocialProviders(): Promise<Record<SocialProvider, boolean>>;
  startSocialLogin(provider: SocialProvider): Promise<string>;
  completeSocialLogin(exchangeCode: string): Promise<AuthUser>;
  completePendingSocialRegistration(
    completionHandle: string,
    email: string,
  ): Promise<void>;
  logout(): Promise<void>;
  deleteAccount(input: AccountDeletionRequest): Promise<void>;
}

export type SocialProvider = "google" | "apple" | "facebook";

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
    if (!parsed.success) return null;
    try {
      return requireMobileCustomer(parsed.data);
    } catch (error) {
      await sessionStorage.clear();
      if (error instanceof StaffMobileAccessError) return null;
      throw error;
    }
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

  async startSocialLogin(provider: SocialProvider): Promise<string> {
    return `shongre://auth/callback#status=success&exchange=demo-${provider}`;
  }

  async getSocialProviders(): Promise<Record<SocialProvider, boolean>> {
    return { google: true, apple: true, facebook: true };
  }

  async completeSocialLogin(exchangeCode: string): Promise<AuthUser> {
    const provider = exchangeCode.replace(/^demo-/, "");
    if (!["google", "apple", "facebook"].includes(provider))
      throw new Error("Réponse de connexion invalide.");
    const session = {
      ...demoSession,
      token: `demo-mobile-${provider}-session`,
      user: { ...demoSession.user, email: `${provider}.demo@shongre.fr` },
    };
    await sessionStorage.write(session);
    return session.user;
  }

  async completePendingSocialRegistration(
    _completionHandle: string,
    _email: string,
  ): Promise<void> {
    // Demo providers always assert a verified deterministic email. The method
    // remains asynchronous so demo and API adapters keep the same contract.
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
      return requireMobileCustomer(authUserSchema.parse(user));
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
    try {
      requireMobileCustomer(session.user);
    } catch (error) {
      await sessionStorage.clear();
      throw error;
    }
    await sessionStorage.write(session);
    return session.user;
  }

  async startSocialLogin(provider: SocialProvider): Promise<string> {
    const response = await apiRequest<{ authorizationUrl: string }>(
      `/auth/oauth/${provider}/start`,
      {
        method: "POST",
        body: JSON.stringify({
          provider,
          clientKind: "native",
          returnTo: "/compte",
        }),
      },
    );
    return response.authorizationUrl;
  }

  async getSocialProviders(): Promise<Record<SocialProvider, boolean>> {
    const response = await apiRequest<
      Record<SocialProvider, boolean> & { linking: boolean }
    >("/auth/oauth/providers");
    return {
      google: response.google,
      apple: response.apple,
      facebook: response.facebook,
    };
  }

  async completeSocialLogin(exchangeCode: string): Promise<AuthUser> {
    const session = authSessionSchema.parse(
      await apiRequest<unknown>("/auth/oauth/native-exchange", {
        method: "POST",
        body: JSON.stringify({ code: exchangeCode }),
      }),
    );
    try {
      requireMobileCustomer(session.user);
    } catch (error) {
      await sessionStorage.clear();
      throw error;
    }
    await sessionStorage.write(session);
    return session.user;
  }

  async completePendingSocialRegistration(
    completionHandle: string,
    email: string,
  ): Promise<void> {
    await apiRequest("/auth/oauth/complete-profile", {
      method: "POST",
      body: JSON.stringify({
        completionHandle,
        email,
        accountType: "individual",
      }),
    });
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
