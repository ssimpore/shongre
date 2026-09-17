import {
  accountDeletionRequestSchema,
  authSessionSchema,
  authUserSchema,
  loginRequestSchema,
  type AccountDeletionRequest,
  type AuthUser,
  type LoginRequest,
} from "@shongre/contracts";
import { apiOperation } from "@/api/generated-api-operation";
import type { operations } from "@shongre/contracts/openapi";
import { isMobileApiError, sessionStorage } from "@/api/http-client";
import { requireMobileCustomer } from "./staff-access";

/** A native individual sign-up; professionals register through the Web flow. */
export interface MobileRegisterInput {
  name: string;
  email: string;
  password: string;
  city: string;
  postalCode: string;
  /** The active market: the account is created in it. */
  country: string;
}

export interface AuthService {
  restore(): Promise<AuthUser | null>;
  login(input: LoginRequest): Promise<MobileLoginResult>;
  /** Creates the account and opens its session on this device. */
  register(input: MobileRegisterInput): Promise<AuthUser>;
  /** Sends the recovery email; answers the same whether or not the address exists. */
  requestPasswordReset(email: string): Promise<void>;
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

type LoginRequestWire =
  operations["postAuthLogin"]["requestBody"]["content"]["application/json"];
type MfaRequest =
  operations["postAuthMfaChallenge"]["requestBody"]["content"]["application/json"];
type OAuthStartRequest =
  operations["postAuthOauthByProviderStart"]["requestBody"]["content"]["application/json"];
type OAuthExchangeRequest =
  operations["postAuthOauthNativeExchange"]["requestBody"]["content"]["application/json"];
type OAuthCompletionRequest =
  operations["postAuthOauthCompleteProfile"]["requestBody"]["content"]["application/json"];
type AccountDeletionRequestWire =
  operations["postAccountDelete"]["requestBody"]["content"]["application/json"];

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
      const user = await apiOperation("getAuthMe", {});
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
    const response = await apiOperation("postAuthLogin", { body: payload });
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

  async register(input: MobileRegisterInput): Promise<AuthUser> {
    const response = await apiOperation("postAuthRegister", {
      body: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        password: input.password,
        role: "individual_buyer",
        city: input.city.trim(),
        postalCode: input.postalCode.trim(),
        country: input.country,
      },
    });
    return storeSession(response);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await apiOperation("postAuthPasswordForgot", {
      body: { email: email.trim().toLowerCase() },
    });
  }

  async completeMfa(tempMfaToken: string, code: string): Promise<AuthUser> {
    const payload: MfaRequest = { tempMfaToken, code };
    const response = await apiOperation("postAuthMfaChallenge", {
      body: payload,
    });
    return storeSession(response);
  }

  async startSocialLogin(provider: SocialProvider): Promise<string> {
    const payload: OAuthStartRequest = {
      provider,
      clientKind: "native",
      returnTo: "/compte",
    };
    const response = await apiOperation("postAuthOauthByProviderStart", {
      path: { provider: provider },
      body: payload,
    });
    const authorizationUrl = record(response).authorizationUrl;
    if (typeof authorizationUrl !== "string") {
      throw new Error("La connexion externe est indisponible.");
    }
    return authorizationUrl;
  }

  async getSocialProviders(): Promise<Record<SocialProvider, boolean>> {
    const response = record(await apiOperation("getAuthOauthProviders", {}));
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
    const response = await apiOperation("postAuthOauthNativeExchange", {
      body: payload,
    });
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
    await apiOperation("postAuthOauthCompleteProfile", { body: payload });
  }

  async logout(): Promise<void> {
    try {
      await apiOperation("postAuthLogout", {});
    } finally {
      await sessionStorage.clear();
    }
  }

  async deleteAccount(input: AccountDeletionRequest): Promise<void> {
    const parsed = accountDeletionRequestSchema.parse(input);
    const body: AccountDeletionRequestWire = parsed;
    await apiOperation("postAccountDelete", { body: body });
    await sessionStorage.clear();
  }
}

export const authService: AuthService = new HttpAuthService();
