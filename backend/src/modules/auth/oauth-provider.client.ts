import {
  createHash,
  createPublicKey,
  createSign,
  randomBytes,
  verify as verifySignature,
} from "crypto";
import { config } from "../../app/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  ProviderProfile,
  AuthProvider,
} from "../../shared/auth/identity.js";

export type SocialProvider = Exclude<AuthProvider, "password">;

interface OAuthTokenResponse {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  error?: string;
}

interface JwtClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  iat?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  is_private_email?: boolean | string;
}

const GOOGLE_ISSUERS = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);
const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_AUTHORIZATION_URL = "https://appleid.apple.com/auth/authorize";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const PROVIDER_TIMEOUT_MS = 10_000;

export function randomOAuthValue(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function providerUnavailable(): AppError {
  return new AppError({
    code: "VALIDATION_ERROR",
    message: "Cette méthode de connexion est temporairement indisponible.",
  });
}

function providerFailure(): AppError {
  return new AppError({
    code: "UNAUTHENTICATED",
    message: "La connexion avec ce fournisseur n'a pas pu être vérifiée.",
  });
}

function decodeJwtSegment<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    throw providerFailure();
  }
}

async function fetchJson(url: string, init: RequestInit = {}): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw providerFailure();
  }
  if (!response.ok) throw providerFailure();
  try {
    return await response.json();
  } catch {
    throw providerFailure();
  }
}

async function postForm(
  url: string,
  body: URLSearchParams,
  headers: Record<string, string> = {},
): Promise<any> {
  return fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      ...headers,
    },
    body: body.toString(),
  });
}

async function validateRs256IdToken(input: {
  token: string;
  jwksUrl: string;
  issuers: ReadonlySet<string>;
  audience: string;
  nonceHash: string;
}): Promise<JwtClaims> {
  const segments = input.token.split(".");
  if (segments.length !== 3) throw providerFailure();
  const header = decodeJwtSegment<{ alg?: string; kid?: string }>(segments[0]);
  const claims = decodeJwtSegment<JwtClaims>(segments[1]);
  if (header.alg !== "RS256" || !header.kid) throw providerFailure();

  const jwks = await fetchJson(input.jwksUrl);
  const jwk = Array.isArray(jwks?.keys)
    ? jwks.keys.find((key: any) => key.kid === header.kid)
    : null;
  if (!jwk || jwk.kty !== "RSA") throw providerFailure();

  const signingInput = Buffer.from(`${segments[0]}.${segments[1]}`);
  const signature = Buffer.from(segments[2], "base64url");
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  if (!verifySignature("RSA-SHA256", signingInput, publicKey, signature))
    throw providerFailure();

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    !input.issuers.has(claims.iss) ||
    !audiences.includes(input.audience) ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    (typeof claims.iat === "number" && claims.iat > now + 60) ||
    typeof claims.nonce !== "string" ||
    sha256(claims.nonce) !== input.nonceHash
  ) {
    throw providerFailure();
  }
  return claims;
}

function boolClaim(value: boolean | string | undefined): boolean {
  return value === true || value === "true";
}

function createAppleClientSecret(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: config.appleOAuth.keyId, typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: config.appleOAuth.teamId,
      iat: now,
      exp: now + 5 * 60,
      aud: APPLE_ISSUER,
      sub: config.appleOAuth.clientId,
    }),
  ).toString("base64url");
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = signer
    .sign({ key: config.appleOAuth.privateKey, dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  return `${header}.${payload}.${signature}`;
}

export interface AuthorizationRequest {
  provider: SocialProvider;
  state: string;
  nonce: string;
  codeChallenge: string;
}

export interface CallbackExchange {
  provider: SocialProvider;
  code: string;
  codeVerifier: string;
  nonceHash: string;
  /** Apple posts the name only on the first authorization. */
  appleUser?: string | null;
}

export class OAuthProviderClient {
  isEnabled(provider: SocialProvider): boolean {
    if (!config.socialAuthEnabled) return false;
    if (provider === "google") return config.googleOAuth.enabled;
    if (provider === "apple") return config.appleOAuth.enabled;
    return config.facebookOAuth.enabled;
  }

  callbackUrl(provider: SocialProvider): string {
    if (provider === "google") return config.googleOAuth.callbackUrl;
    if (provider === "apple") return config.appleOAuth.callbackUrl;
    return config.facebookOAuth.callbackUrl;
  }

  buildAuthorizationUrl(input: AuthorizationRequest): string {
    if (!this.isEnabled(input.provider)) throw providerUnavailable();
    const common = {
      state: input.state,
      redirect_uri: this.callbackUrl(input.provider),
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
    };

    if (input.provider === "google") {
      const url = new URL(GOOGLE_AUTHORIZATION_URL);
      url.search = new URLSearchParams({
        ...common,
        client_id: config.googleOAuth.clientId,
        response_type: "code",
        scope: "openid email profile",
        nonce: input.nonce,
        prompt: "select_account",
      }).toString();
      return url.toString();
    }

    if (input.provider === "apple") {
      const url = new URL(APPLE_AUTHORIZATION_URL);
      url.search = new URLSearchParams({
        ...common,
        client_id: config.appleOAuth.clientId,
        response_type: "code",
        response_mode: "form_post",
        scope: "name email",
        nonce: input.nonce,
      }).toString();
      return url.toString();
    }

    const url = new URL(config.facebookOAuth.authorizationUrl);
    url.search = new URLSearchParams({
      ...common,
      client_id: config.facebookOAuth.clientId,
      response_type: "code",
      scope: "email,public_profile",
    }).toString();
    return url.toString();
  }

  async exchange(input: CallbackExchange): Promise<ProviderProfile> {
    if (!this.isEnabled(input.provider) || !input.code || !input.codeVerifier)
      throw providerUnavailable();
    if (input.provider === "google") return this.exchangeGoogle(input);
    if (input.provider === "apple") return this.exchangeApple(input);
    return this.exchangeFacebook(input);
  }

  private async exchangeGoogle(
    input: CallbackExchange,
  ): Promise<ProviderProfile> {
    const token = (await postForm(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        code: input.code,
        client_id: config.googleOAuth.clientId,
        client_secret: config.googleOAuth.clientSecret,
        redirect_uri: config.googleOAuth.callbackUrl,
        grant_type: "authorization_code",
        code_verifier: input.codeVerifier,
      }),
    )) as OAuthTokenResponse;
    if (!token.id_token) throw providerFailure();
    const claims = await validateRs256IdToken({
      token: token.id_token,
      jwksUrl: GOOGLE_JWKS_URL,
      issuers: GOOGLE_ISSUERS,
      audience: config.googleOAuth.clientId,
      nonceHash: input.nonceHash,
    });
    return {
      provider: "google",
      subject: claims.sub,
      email: claims.email || null,
      emailVerified: boolClaim(claims.email_verified),
      displayName: claims.name || null,
      avatarUrl: claims.picture || null,
    };
  }

  private async exchangeApple(
    input: CallbackExchange,
  ): Promise<ProviderProfile> {
    const token = (await postForm(
      APPLE_TOKEN_URL,
      new URLSearchParams({
        code: input.code,
        client_id: config.appleOAuth.clientId,
        client_secret: createAppleClientSecret(),
        redirect_uri: config.appleOAuth.callbackUrl,
        grant_type: "authorization_code",
        code_verifier: input.codeVerifier,
      }),
    )) as OAuthTokenResponse;
    if (!token.id_token) throw providerFailure();
    const claims = await validateRs256IdToken({
      token: token.id_token,
      jwksUrl: APPLE_JWKS_URL,
      issuers: new Set([APPLE_ISSUER]),
      audience: config.appleOAuth.clientId,
      nonceHash: input.nonceHash,
    });

    let displayName: string | null = null;
    if (input.appleUser) {
      try {
        const user = JSON.parse(input.appleUser);
        displayName =
          [user?.name?.firstName, user?.name?.lastName]
            .filter(Boolean)
            .join(" ") || null;
      } catch {
        // The signed ID token is still valid; malformed optional first-login
        // profile data must not turn into an identity bypass or overwrite.
      }
    }

    return {
      provider: "apple",
      subject: claims.sub,
      email: claims.email || null,
      emailVerified: boolClaim(claims.email_verified),
      displayName,
      avatarUrl: null,
    };
  }

  private async exchangeFacebook(
    input: CallbackExchange,
  ): Promise<ProviderProfile> {
    const token = (await postForm(
      new URL(
        "/oauth/access_token",
        config.facebookOAuth.graphApiBaseUrl,
      ).toString(),
      new URLSearchParams({
        code: input.code,
        client_id: config.facebookOAuth.clientId,
        client_secret: config.facebookOAuth.clientSecret,
        redirect_uri: config.facebookOAuth.callbackUrl,
        code_verifier: input.codeVerifier,
      }),
    )) as OAuthTokenResponse;
    if (!token.access_token) throw providerFailure();

    const debug = await postForm(
      new URL("/debug_token", config.facebookOAuth.graphApiBaseUrl).toString(),
      new URLSearchParams({ input_token: token.access_token }),
      {
        Authorization: `Bearer ${config.facebookOAuth.clientId}|${config.facebookOAuth.clientSecret}`,
      },
    );
    const debugData = debug?.data;
    const now = Math.floor(Date.now() / 1000);
    if (
      !debugData?.is_valid ||
      String(debugData.app_id) !== config.facebookOAuth.clientId ||
      (debugData.expires_at && debugData.expires_at <= now)
    ) {
      throw providerFailure();
    }

    const profileUrl = new URL("/me", config.facebookOAuth.graphApiBaseUrl);
    profileUrl.searchParams.set("fields", "id,name,email,picture");
    const profile = await fetchJson(profileUrl.toString(), {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (
      !profile?.id ||
      (debugData.user_id && String(debugData.user_id) !== String(profile.id))
    )
      throw providerFailure();
    return {
      provider: "facebook",
      subject: String(profile.id),
      email: typeof profile.email === "string" ? profile.email : null,
      // Facebook's profile response does not provide an OIDC-style verified
      // email assertion. Treat it as contact data until Shongre verifies it.
      emailVerified: false,
      displayName: typeof profile.name === "string" ? profile.name : null,
      avatarUrl: profile.picture?.data?.url || null,
    };
  }
}

export const oauthProviderClient = new OAuthProviderClient();
