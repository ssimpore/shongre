import {
  accountDeletionRequestSchema,
  authSessionSchema,
  authUserSchema,
  loginRequestSchema,
  type AccountDeletionRequest,
  type AuthUser,
  type LoginRequest,
} from "@shongre/contracts";
import type { operations } from "@shongre/contracts/openapi";
import {
  apiRequest,
  isMobileApiError,
  sessionStorage,
} from "@/api/http-client";
import { requireMobileCustomer } from "./staff-access";

export interface AuthService {
  restore(): Promise<AuthUser | null>;
  login(input: LoginRequest): Promise<MobileLoginResult>;
  completeMfa(tempMfaToken: string, code: string): Promise<AuthUser>;
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

export type MobileLoginResult =
  | { kind: "authenticated"; user: AuthUser }
  | {
      kind: "mfa_required";
      tempMfaToken: string;
      expiresAt: string;
    };

type AuthMeResponse =
  operations["getAuthMe"]["responses"][200]["content"]["application/json"];
type LoginRequestWire =
  operations["postAuthLogin"]["requestBody"]["content"]["application/json"];
type LoginResponse =
  operations["postAuthLogin"]["responses"][200]["content"]["application/json"];
type MfaRequest =
  operations["postAuthMfaChallenge"]["requestBody"]["content"]["application/json"];
type MfaResponse =
  operations["postAuthMfaChallenge"]["responses"][200]["content"]["application/json"];
type OAuthStartRequest =
  operations["postAuthOauthByProviderStart"]["requestBody"]["content"]["application/json"];
type OAuthStartResponse =
  operations["postAuthOauthByProviderStart"]["responses"][200]["content"]["application/json"];
type OAuthProvidersResponse =
  operations["getAuthOauthProviders"]["responses"][200]["content"]["application/json"];
type OAuthExchangeRequest =
  operations["postAuthOauthNativeExchange"]["requestBody"]["content"]["application/json"];
type OAuthExchangeResponse =
  operations["postAuthOauthNativeExchange"]["responses"][200]["content"]["application/json"];
type OAuthCompletionRequest =
  operations["postAuthOauthCompleteProfile"]["requestBody"]["content"]["application/json"];
type OAuthCompletionResponse =
  operations["postAuthOauthCompleteProfile"]["responses"][200]["content"]["application/json"];
type LogoutResponse =
  operations["postAuthLogout"]["responses"][200]["content"]["application/json"];
type AccountDeletionRequestWire =
  operations["postAccountDelete"]["requestBody"]["content"]["application/json"];
type AccountDeletionResponse =
  operations["postAccountDelete"]["responses"][200]["content"]["application/json"];

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("La réponse d’authentification est invalide.");
  }
  return value as Record<string, unknown>;
}

function authenticatedUser(value: unknown): AuthUser {
  const parsed = authUserSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("La réponse d’authentification est invalide.");
  }
  return requireMobileCustomer(parsed.data);
}

async function storeSession(value: unknown): Promise<AuthUser> {
  const parsed = authSessionSchema.safeParse(value);
  if (!parsed.success) {
    await sessionStorage.clear();
    throw new Error("La session reçue est invalide.");
  }
  let user: AuthUser;
  try {
    user = authenticatedUser(parsed.data.user);
  } catch (error) {
    await sessionStorage.clear();
    throw error;
  }
  await sessionStorage.write({ ...parsed.data, user });
  return user;
}

export class HttpAuthService implements AuthService {
  async restore(): Promise<AuthUser | null> {
    const session = await sessionStorage.read();
    if (!session) return null;
    try {
      const user = await apiRequest<AuthMeResponse>("/auth/me");
      if (user === null) {
        await sessionStorage.clear();
        return null;
      }
      return authenticatedUser(user);
    } catch (error) {
      if (isMobileApiError(error) && error.status === 401) {
        await sessionStorage.clear();
        return null;
      }
      throw error;
    }
  }

  async login(input: LoginRequest): Promise<MobileLoginResult> {
    const credentials = loginRequestSchema.parse(input);
    const payload: LoginRequestWire = { ...credentials };
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const candidate = record(response);
    if (candidate.requiresMfa === true) {
      if (
        typeof candidate.tempMfaToken !== "string" ||
        typeof candidate.expiresAt !== "string"
      ) {
        throw new Error("Le défi de sécurité reçu est invalide.");
      }
      return {
        kind: "mfa_required",
        tempMfaToken: candidate.tempMfaToken,
        expiresAt: candidate.expiresAt,
      };
    }
    return { kind: "authenticated", user: await storeSession(response) };
  }

  async completeMfa(tempMfaToken: string, code: string): Promise<AuthUser> {
    const payload: MfaRequest = { tempMfaToken, code };
    const response = await apiRequest<MfaResponse>("/auth/mfa/challenge", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return storeSession(response);
  }

  async startSocialLogin(provider: SocialProvider): Promise<string> {
    const payload: OAuthStartRequest = {
      provider,
      clientKind: "native",
      returnTo: "/compte",
    };
    const response = await apiRequest<OAuthStartResponse>(
      `/auth/oauth/${provider}/start`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const authorizationUrl = record(response).authorizationUrl;
    if (typeof authorizationUrl !== "string") {
      throw new Error("La connexion externe est indisponible.");
    }
    return authorizationUrl;
  }

  async getSocialProviders(): Promise<Record<SocialProvider, boolean>> {
    const response = record(
      await apiRequest<OAuthProvidersResponse>("/auth/oauth/providers"),
    );
    if (
      typeof response.google !== "boolean" ||
      typeof response.apple !== "boolean" ||
      typeof response.facebook !== "boolean"
    ) {
      throw new Error("Les fournisseurs de connexion sont indisponibles.");
    }
    return {
      google: response.google,
      apple: response.apple,
      facebook: response.facebook,
    };
  }

  async completeSocialLogin(exchangeCode: string): Promise<AuthUser> {
    const payload: OAuthExchangeRequest = { code: exchangeCode };
    const response = await apiRequest<OAuthExchangeResponse>(
      "/auth/oauth/native-exchange",
      { method: "POST", body: JSON.stringify(payload) },
    );
    return storeSession(response);
  }

  async completePendingSocialRegistration(
    completionHandle: string,
    email: string,
  ): Promise<void> {
    const payload: OAuthCompletionRequest = {
      completionHandle,
      email,
      accountType: "individual",
    };
    await apiRequest<OAuthCompletionResponse>("/auth/oauth/complete-profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async logout(): Promise<void> {
    try {
      await apiRequest<LogoutResponse>("/auth/logout", { method: "POST" });
    } finally {
      await sessionStorage.clear();
    }
  }

  async deleteAccount(input: AccountDeletionRequest): Promise<void> {
    const parsed = accountDeletionRequestSchema.parse(input);
    const body: AccountDeletionRequestWire = parsed;
    await apiRequest<AccountDeletionResponse>("/account/delete", {
      method: "POST",
      body: JSON.stringify(body),
    });
    await sessionStorage.clear();
  }
}

export const authService: AuthService = new HttpAuthService();
