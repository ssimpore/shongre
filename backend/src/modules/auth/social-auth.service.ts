import { randomUUID } from "crypto";
import { config } from "../../app/config/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { Principal } from "../../shared/auth/principal.js";
import type { UserProfile, UserRole } from "../../shared/types/index.js";
import {
  evaluateLinkRequest,
  evaluateUnlinkRequest,
  isApplePrivateRelay,
  isSocialProvider,
  normalizeEmail,
  reconcileProfileFields,
  resolveIdentity,
  type AccountSnapshot,
  type AuthProvider,
  type ProviderProfile,
} from "../../shared/auth/identity.js";
import { resolveSafeRedirect } from "../../shared/auth/safe-redirect.js";
import {
  authRepository,
  type IAuthRepository,
} from "../../infrastructure/database/repositories/auth.repository.js";
import {
  repositories,
  type IUserRepository,
} from "../../infrastructure/database/repositories/index.js";
import {
  oauthProviderClient,
  pkceChallenge,
  randomOAuthValue,
  sha256,
  type OAuthProviderClient,
  type SocialProvider,
} from "./oauth-provider.client.js";
import {
  sessionService,
  type AuthRequestMetadata,
  type SessionService,
  type SessionTokens,
  type SessionView,
} from "./session.service.js";
import { authEmailSender, type AuthEmailSender } from "./auth-email.sender.js";

export interface SocialAuthStartInput {
  provider: string;
  intent?: "sign_in" | "link";
  returnTo?: string;
  clientKind?: "web" | "native";
  accountType?: "individual" | "professional";
}

export interface SocialAuthCallbackInput {
  provider: string;
  state?: string;
  code?: string;
  error?: string;
  appleUser?: string | null;
}

export type SocialAuthCallbackResult =
  | {
      status: "authenticated";
      user: UserProfile;
      tokens: SessionTokens | null;
      returnTo: string;
      clientKind: "web" | "native";
      onboarding: "choose_account_type" | "professional" | null;
      nativeExchangeCode?: string;
    }
  | {
      status: "linked";
      userId: string;
      returnTo: string;
      clientKind: "web" | "native";
    }
  | {
      status: "link_required";
      maskedEmail: string;
      returnTo: string;
      clientKind: "web" | "native";
    }
  | {
      status: "email_required";
      completionHandle: string;
      returnTo: string;
      clientKind: "web" | "native";
    }
  | {
      status: "verification_required";
      returnTo: string;
      clientKind: "web" | "native";
    }
  | { status: "cancelled"; returnTo: string; clientKind: "web" | "native" };

export interface ConnectedAccountView {
  provider: AuthProvider;
  connected: boolean;
  email: string | null;
  emailVerified: boolean;
  linkedAt: string | null;
  lastUsedAt: string | null;
  isPrivateRelay: boolean;
}

export interface AuthSecurityOverview {
  methods: ConnectedAccountView[];
  sessions: SessionView[];
  recentAuthenticationRequired: boolean;
}

function invalidCallback(): AppError {
  return new AppError({
    code: "UNAUTHENTICATED",
    message: "La tentative de connexion est invalide ou a expiré.",
  });
}

export class SocialAuthService {
  constructor(
    private readonly users: IUserRepository = repositories.users,
    private readonly auth: IAuthRepository = authRepository,
    private readonly providerClient: OAuthProviderClient = oauthProviderClient,
    private readonly sessions: SessionService = sessionService,
    private readonly emailSender: AuthEmailSender = authEmailSender,
  ) {}

  availability(): Record<SocialProvider, boolean> & { linking: boolean } {
    return {
      google: this.providerClient.isEnabled("google"),
      apple: this.providerClient.isEnabled("apple"),
      facebook: this.providerClient.isEnabled("facebook"),
      linking: config.accountLinkingEnabled,
    };
  }

  async start(
    input: SocialAuthStartInput,
    principal: Principal,
    metadata: AuthRequestMetadata = {},
  ): Promise<{ authorizationUrl: string; expiresAt: string }> {
    if (!isSocialProvider(input.provider)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Fournisseur de connexion non pris en charge.",
      });
    }
    const provider = input.provider;
    const intent = input.intent || "sign_in";
    if (intent === "link") {
      if (!config.accountLinkingEnabled)
        throw new AppError({
          code: "FORBIDDEN",
          message: "La liaison de comptes est désactivée.",
        });
      if (
        !principal.userId ||
        !principal.sessionId ||
        !(await this.sessions.hasRecentAuthentication(principal.sessionId))
      ) {
        throw new AppError({
          code: "UNAUTHENTICATED",
          message:
            "Veuillez confirmer votre identité avant de connecter un compte.",
        });
      }
    }

    const limitKey = sha256(`${metadata.ipPrefix || "unknown"}:${provider}`);
    const decision = await this.auth.consumeRateLimit(
      limitKey,
      "oauth_start",
      20,
      600,
      600,
    );
    if (!decision.allowed) {
      await this.auth.recordSecurityEvent({
        eventType: "rate_limit_tripped",
        provider,
        ipPrefix: metadata.ipPrefix,
        failureReason: "oauth_start",
      });
      throw new AppError({
        code: "RATE_LIMITED",
        message: "Trop de tentatives. Réessayez dans quelques minutes.",
        details: { retryAfterSeconds: decision.retryAfterSeconds },
      });
    }

    const state = randomOAuthValue();
    const nonce = randomOAuthValue();
    const verifier = randomOAuthValue(48);
    const expiresAt = new Date(
      Date.now() + config.oauthFlowTtlSeconds * 1000,
    ).toISOString();
    const returnTo = resolveSafeRedirect(input.returnTo || "/compte");
    await this.auth.createOAuthFlow({
      stateHash: sha256(state),
      provider,
      intent,
      userId: intent === "link" ? principal.userId : null,
      sessionId: intent === "link" ? principal.sessionId || null : null,
      returnTo,
      clientKind: input.clientKind === "native" ? "native" : "web",
      requestedAccountType: input.accountType || null,
      nonceHash: sha256(nonce),
      codeVerifier: verifier,
      expiresAt,
    });
    await this.auth.recordSecurityEvent({
      userId: principal.userId || null,
      eventType: "oauth_started",
      provider,
      ipPrefix: metadata.ipPrefix,
      metadata: { intent },
    });
    return {
      authorizationUrl: this.providerClient.buildAuthorizationUrl({
        provider,
        state,
        nonce,
        codeChallenge: pkceChallenge(verifier),
      }),
      expiresAt,
    };
  }

  async callback(
    input: SocialAuthCallbackInput,
    metadata: AuthRequestMetadata = {},
  ): Promise<SocialAuthCallbackResult> {
    if (!isSocialProvider(input.provider) || !input.state)
      throw invalidCallback();
    const provider = input.provider;
    const flow = await this.auth.consumeOAuthFlow(sha256(input.state));
    if (!flow || flow.provider !== provider) {
      await this.auth.recordSecurityEvent({
        eventType: "oauth_callback_failed",
        provider,
        ipPrefix: metadata.ipPrefix,
        failureReason: "invalid_state",
      });
      throw invalidCallback();
    }
    if (input.error) {
      await this.auth.recordSecurityEvent({
        userId: flow.userId,
        eventType:
          input.error === "access_denied"
            ? "oauth_cancelled"
            : "oauth_callback_failed",
        provider,
        failureReason:
          input.error === "access_denied" ? "user_cancelled" : "provider_error",
      });
      return {
        status: "cancelled",
        returnTo: flow.returnTo,
        clientKind: flow.clientKind,
      };
    }
    if (!input.code) throw invalidCallback();

    let providerProfile: ProviderProfile;
    try {
      providerProfile = await this.providerClient.exchange({
        provider,
        code: input.code,
        codeVerifier: flow.codeVerifier,
        nonceHash: flow.nonceHash,
        appleUser: input.appleUser,
      });
    } catch (error) {
      await this.auth.recordSecurityEvent({
        userId: flow.userId,
        eventType: "oauth_callback_failed",
        provider,
        ipPrefix: metadata.ipPrefix,
        failureReason: "credential_validation_failed",
      });
      throw error;
    }

    if (flow.intent === "link") {
      return this.finishLink(
        flow.userId,
        flow.sessionId,
        providerProfile,
        flow.returnTo,
        flow.clientKind,
      );
    }
    return this.finishSignIn(providerProfile, flow, metadata);
  }

  async completePendingRegistration(input: {
    completionHandle: string;
    email: string;
    accountType?: "individual" | "professional";
  }): Promise<{ status: "verification_required"; email: string }> {
    const pending = await this.auth.consumePendingRegistration(
      sha256(input.completionHandle || ""),
    );
    if (!pending) throw invalidCallback();
    const email = normalizeEmail(input.email);
    if (!email)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Adresse email invalide.",
      });
    if (await this.users.findByEmail(email)) {
      // Do not attach the provider identity to the matching account. The user
      // must sign into that account and initiate an explicit link instead.
      throw new AppError({
        code: "CONFLICT",
        message:
          "Connectez-vous à votre compte existant pour associer cette méthode.",
      });
    }

    const profile = this.newProfile({
      email,
      emailVerified: false,
      displayName: pending.providerDisplayName,
      avatarUrl: pending.providerAvatarUrl,
    });
    profile.status = "pending_verification";
    const provisioned = await this.auth.provisionOAuthProfile({
      userId: profile.id,
      slug: profile.slug,
      email: profile.email,
      name: profile.name,
      status: "pending_verification",
      avatarUrl: profile.avatarUrl || null,
      emailVerified: false,
      provider: pending.provider,
      providerSubject: pending.providerSubject,
      providerEmail: pending.providerEmail,
      providerEmailVerified: pending.providerEmailVerified,
      providerDisplayName: pending.providerDisplayName,
      isPrivateRelay: isApplePrivateRelay(pending.providerEmail),
    });
    if (!provisioned) {
      await this.users.save(profile);
      await this.auth.linkIdentity({
        userId: profile.id,
        provider: pending.provider,
        providerSubject: pending.providerSubject,
        providerEmail: pending.providerEmail,
        providerEmailVerified: pending.providerEmailVerified,
        providerDisplayName: pending.providerDisplayName,
        isPrivateRelay: isApplePrivateRelay(pending.providerEmail),
      });
    }
    const verificationToken = randomOAuthValue(40);
    await this.auth.createActionToken({
      userId: profile.id,
      purpose: "verify_email",
      tokenHash: sha256(verificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    const verificationUrl = new URL(
      "/verification-email",
      config.frontendUrl || "http://localhost:3000",
    );
    verificationUrl.searchParams.set("token", verificationToken);
    try {
      await this.emailSender.send({
        to: email,
        template: "verify_email",
        actionUrl: verificationUrl.toString(),
      });
      await this.auth.recordSecurityEvent({
        userId: profile.id,
        eventType: "email_verification_sent",
        provider: pending.provider,
      });
    } catch {
      // The address can still recover through the generic resend endpoint; do
      // not orphan the just-provisioned account because a delivery vendor is
      // temporarily unavailable.
      logger.error("OAuth verification email delivery failed");
    }
    await this.auth.recordSecurityEvent({
      userId: profile.id,
      eventType: "registered",
      provider: pending.provider,
      metadata: {
        accountType:
          input.accountType || pending.requestedAccountType || "individual",
        emailVerificationRequired: true,
      },
    });
    return { status: "verification_required", email };
  }

  async exchangeNativeCode(
    code: string,
    metadata: AuthRequestMetadata = {},
  ): Promise<{ user: UserProfile; tokens: SessionTokens; returnTo: string }> {
    const exchange = await this.auth.consumeNativeExchange(sha256(code || ""));
    if (!exchange) throw invalidCallback();
    const user = await this.users.findById(exchange.userId);
    if (!user || user.status !== "active") throw invalidCallback();
    return {
      user,
      tokens: await this.sessions.create(user, exchange.provider, metadata),
      returnTo: exchange.returnTo,
    };
  }

  async securityOverview(
    userId: string,
    currentSessionId?: string,
  ): Promise<AuthSecurityOverview> {
    const [identities, sessions, credential] = await Promise.all([
      this.auth.listIdentities(userId),
      this.sessions.list(userId, currentSessionId),
      this.users.findCredentialByUserId(userId),
    ]);
    const methods: ConnectedAccountView[] = (
      ["password", "google", "apple", "facebook"] as AuthProvider[]
    ).map((provider) => {
      const identity = identities.find(
        (candidate) => candidate.provider === provider,
      );
      const passwordConnected = provider === "password" && Boolean(credential);
      return {
        provider,
        connected: passwordConnected || Boolean(identity),
        email: identity?.providerEmail || null,
        emailVerified: identity?.providerEmailVerified || false,
        linkedAt: identity?.linkedAt || null,
        lastUsedAt: identity?.lastAuthenticatedAt || null,
        isPrivateRelay: identity?.isPrivateRelay || false,
      };
    });
    return {
      methods,
      sessions,
      recentAuthenticationRequired:
        !(await this.sessions.hasRecentAuthentication(currentSessionId)),
    };
  }

  async unlink(
    userId: string,
    sessionId: string | undefined,
    provider: string,
  ): Promise<void> {
    if (!isSocialProvider(provider))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Fournisseur non pris en charge.",
      });
    const [identities, credential, recent] = await Promise.all([
      this.auth.listIdentities(userId),
      this.users.findCredentialByUserId(userId),
      this.sessions.hasRecentAuthentication(sessionId),
    ]);
    const decision = evaluateUnlinkRequest({
      provider,
      linkedProviders: identities.map((identity) => identity.provider),
      hasPassword: Boolean(credential),
      hasRecentAuthentication: recent,
    });
    if (decision.decision === "rejected") {
      const messages = {
        not_linked: "Ce compte n'est pas connecté.",
        would_remove_last_login_method:
          "Ajoutez d'abord un mot de passe ou une autre méthode de connexion.",
        recent_authentication_required:
          "Confirmez votre identité avant de modifier vos méthodes de connexion.",
      } as const;
      throw new AppError({
        code:
          decision.reason === "recent_authentication_required"
            ? "UNAUTHENTICATED"
            : "VALIDATION_ERROR",
        message: messages[decision.reason],
      });
    }
    await this.auth.unlinkIdentity(userId, provider);
    await this.auth.revokeSessions(userId, "provider_unlinked", sessionId);
    await this.auth.recordSecurityEvent({
      userId,
      eventType: "identity_unlinked",
      provider,
    });
  }

  private async finishLink(
    userId: string | null,
    sessionId: string | null,
    profile: ProviderProfile,
    returnTo: string,
    clientKind: "web" | "native",
  ): Promise<SocialAuthCallbackResult> {
    if (!userId || !sessionId) throw invalidCallback();
    const [existingIdentity, actingProviders, recent] = await Promise.all([
      this.auth.findIdentity(profile.provider, profile.subject),
      this.auth.listIdentities(userId),
      this.sessions.hasRecentAuthentication(sessionId),
    ]);
    const decision = evaluateLinkRequest({
      actingUserId: userId,
      profile,
      existingIdentity: existingIdentity
        ? {
            userId: existingIdentity.userId,
            provider: existingIdentity.provider,
            subject: existingIdentity.providerSubject,
          }
        : null,
      actingAccountProviders: actingProviders.map(
        (identity) => identity.provider,
      ),
      hasRecentAuthentication: recent,
    });
    if (decision.decision === "rejected") {
      await this.auth.recordSecurityEvent({
        userId,
        eventType: "identity_link_rejected",
        provider: profile.provider,
        failureReason: decision.reason,
      });
      throw new AppError({
        code:
          decision.reason === "recent_authentication_required"
            ? "UNAUTHENTICATED"
            : "CONFLICT",
        message: "Ce compte externe ne peut pas être associé.",
      });
    }
    if (decision.decision === "link") {
      await this.auth.linkIdentity({
        userId,
        provider: profile.provider,
        providerSubject: profile.subject,
        providerEmail: normalizeEmail(profile.email),
        providerEmailVerified: profile.emailVerified === true,
        providerDisplayName: profile.displayName?.trim() || null,
        isPrivateRelay: isApplePrivateRelay(profile.email),
      });
      await this.auth.recordSecurityEvent({
        userId,
        eventType: "identity_linked",
        provider: profile.provider,
      });
    }
    return { status: "linked", userId, returnTo, clientKind };
  }

  private async finishSignIn(
    profile: ProviderProfile,
    flow: {
      returnTo: string;
      clientKind: "web" | "native";
      requestedAccountType: "individual" | "professional" | null;
    },
    metadata: AuthRequestMetadata,
  ): Promise<SocialAuthCallbackResult> {
    const linked = await this.auth.findIdentity(
      profile.provider,
      profile.subject,
    );
    const normalizedProviderEmail = normalizeEmail(profile.email);
    const userByEmail = normalizedProviderEmail
      ? await this.users.findByEmail(normalizedProviderEmail)
      : null;
    const accountSnapshot = userByEmail
      ? await this.snapshot(userByEmail)
      : null;
    const resolution = resolveIdentity(
      profile,
      linked
        ? {
            userId: linked.userId,
            provider: linked.provider,
            subject: linked.providerSubject,
          }
        : null,
      accountSnapshot,
    );

    if (resolution.outcome === "blocked") throw invalidCallback();
    if (resolution.outcome === "require_account_linking") {
      return {
        status: "link_required",
        maskedEmail: resolution.maskedEmail,
        returnTo: flow.returnTo,
        clientKind: flow.clientKind,
      };
    }
    if (resolution.outcome === "create_account" && !resolution.email) {
      const handle = randomOAuthValue(40);
      await this.auth.createPendingRegistration({
        handleHash: sha256(handle),
        provider: profile.provider,
        providerSubject: profile.subject,
        providerEmail: normalizedProviderEmail,
        providerEmailVerified: profile.emailVerified === true,
        providerDisplayName: profile.displayName?.trim() || null,
        providerAvatarUrl: profile.avatarUrl?.trim() || null,
        requestedAccountType: flow.requestedAccountType,
        clientKind: flow.clientKind,
        returnTo: flow.returnTo,
        expiresAt: new Date(
          Date.now() + config.oauthFlowTtlSeconds * 1000,
        ).toISOString(),
      });
      return {
        status: "email_required",
        completionHandle: handle,
        returnTo: flow.returnTo,
        clientKind: flow.clientKind,
      };
    }

    let user: UserProfile;
    if (resolution.outcome === "authenticate") {
      const found = await this.users.findById(resolution.userId);
      if (!found || found.status !== "active") {
        return {
          status: "verification_required",
          returnTo: flow.returnTo,
          clientKind: flow.clientKind,
        };
      }
      user = found;
      if (linked) await this.auth.touchIdentity(linked.id);
      const updates = reconcileProfileFields(
        {
          name: user.name,
          avatarUrl: user.avatarUrl || null,
          isEmailVerified: user.isEmailVerified,
          hasUserEditedProfile: Boolean(user.name || user.avatarUrl),
        },
        profile,
      );
      if (Object.keys(updates).length > 0)
        user = await this.users.update(user.id, updates);
    } else {
      user = this.newProfile({
        email: resolution.email!,
        emailVerified: resolution.emailVerified,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      const provisioned = await this.auth.provisionOAuthProfile({
        userId: user.id,
        slug: user.slug,
        email: user.email,
        name: user.name,
        status: "active",
        avatarUrl: user.avatarUrl || null,
        emailVerified: user.isEmailVerified,
        provider: profile.provider,
        providerSubject: profile.subject,
        providerEmail: normalizedProviderEmail,
        providerEmailVerified: profile.emailVerified === true,
        providerDisplayName: profile.displayName?.trim() || null,
        isPrivateRelay: isApplePrivateRelay(profile.email),
      });
      if (!provisioned) {
        await this.users.save(user);
        await this.auth.linkIdentity({
          userId: user.id,
          provider: profile.provider,
          providerSubject: profile.subject,
          providerEmail: normalizedProviderEmail,
          providerEmailVerified: profile.emailVerified === true,
          providerDisplayName: profile.displayName?.trim() || null,
          isPrivateRelay: isApplePrivateRelay(profile.email),
        });
      }
      await this.auth.recordSecurityEvent({
        userId: user.id,
        eventType: "registered",
        provider: profile.provider,
        metadata: {
          preservedAccountType: flow.requestedAccountType || "choose",
        },
      });
    }

    await this.auth.recordSecurityEvent({
      userId: user.id,
      eventType: "login_succeeded",
      provider: profile.provider,
      ipPrefix: metadata.ipPrefix,
    });
    const onboarding =
      flow.requestedAccountType === "professional"
        ? "professional"
        : flow.requestedAccountType === null &&
            resolution.outcome === "create_account"
          ? "choose_account_type"
          : null;

    if (flow.clientKind === "native") {
      const nativeExchangeCode = randomOAuthValue(40);
      await this.auth.createNativeExchange({
        codeHash: sha256(nativeExchangeCode),
        userId: user.id,
        provider: profile.provider,
        returnTo: flow.returnTo,
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
      });
      return {
        status: "authenticated",
        user,
        tokens: null,
        returnTo: flow.returnTo,
        clientKind: "native",
        onboarding,
        nativeExchangeCode,
      };
    }
    return {
      status: "authenticated",
      user,
      tokens: await this.sessions.create(user, profile.provider, metadata),
      returnTo: flow.returnTo,
      clientKind: "web",
      onboarding,
    };
  }

  private async snapshot(user: UserProfile): Promise<AccountSnapshot> {
    const [credential, identities] = await Promise.all([
      this.users.findCredentialByUserId(user.id),
      this.auth.listIdentities(user.id),
    ]);
    return {
      userId: user.id,
      email: user.email,
      status: user.status as AccountSnapshot["status"],
      isEmailVerified: user.isEmailVerified,
      hasPassword: Boolean(credential),
      linkedProviders: identities.map((identity) => identity.provider),
    };
  }

  private newProfile(input: {
    email: string;
    emailVerified: boolean;
    displayName?: string | null;
    avatarUrl?: string | null;
  }): UserProfile {
    const id = randomUUID();
    const name = input.displayName?.trim() || "Nouveau membre";
    const slugRoot =
      name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "membre";
    const role: UserRole = "individual_buyer";
    return {
      id,
      slug: `${slugRoot}-${id.slice(0, 8)}`,
      email: input.email,
      name,
      accountType: "individual",
      primaryRole: role,
      role,
      sellerType: "individual",
      status: "active",
      avatarUrl: input.avatarUrl?.trim() || undefined,
      country: "FR",
      isVerified: false,
      isIdentityVerified: false,
      isPhoneVerified: false,
      isEmailVerified: input.emailVerified,
      isBusinessVerified: false,
      rating: 5,
      reviewCount: 0,
      responseRatePercent: 100,
      createdAt: new Date().toISOString(),
    };
  }
}

export const socialAuthService = new SocialAuthService();
