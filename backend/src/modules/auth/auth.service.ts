import { UserProfile, UserRole } from "../../shared/types/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  IUserRepository,
  repositories,
  CANONICAL_DEMO_USERS,
} from "../../infrastructure/database/repositories/index.js";
import { IKYCProvider, providers } from "../../integrations/providers/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { config } from "../../app/config/index.js";
import {
  hashPassword,
  verifyPassword,
  simulatePasswordVerification,
  WeakPasswordError,
} from "../../shared/auth/password.js";
import {
  issueToken,
  verifyToken,
  TokenError,
} from "../../shared/auth/tokens.js";
import { Principal, GUEST_PRINCIPAL } from "../../shared/auth/principal.js";
import { PlatformRole, permissionsForSubject } from "../../shared/auth/rbac.js";
import {
  PROFESSIONAL_VERTICALS,
  type ProfessionalVertical,
  canonicalAccessContext,
  staffRoleFromLegacyRole,
} from "@shongre/contracts/access-control";
import {
  sessionService,
  type AuthRequestMetadata,
  type SessionService,
} from "./session.service.js";
import {
  authRepository,
  type IAuthRepository,
} from "../../infrastructure/database/repositories/auth.repository.js";
import { randomOAuthValue, sha256 } from "./oauth-provider.client.js";
import { authEmailSender, type AuthEmailSender } from "./auth-email.sender.js";
import { randomUUID } from "node:crypto";

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  companyName?: string;
  professionalVertical?: ProfessionalVertical;
  siret?: string;
  phone?: string;
}

export interface AuthResult {
  user: UserProfile;
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  sessionId?: string;
}

export const DEMO_PROFILES = CANONICAL_DEMO_USERS;

/**
 * Roles a self-service registration is allowed to claim.
 *
 * Registration takes a `role` from the request body, so without this list a
 * caller could simply register as `admin`. Staff roles are granted by an
 * administrator, never requested by the account being created.
 */
const SELF_ASSIGNABLE_ROLES: ReadonlySet<string> = new Set<UserRole>([
  "individual_buyer",
  "individual_seller", // accepted as a legacy registration alias
  "pro_seller",
]);

/**
 * The generic failure returned for every unsuccessful login.
 *
 * One message for "no such account", "wrong password" and "not yet activated"
 * keeps the login form from confirming which email addresses are registered.
 */
function invalidCredentials(): AppError {
  return new AppError({
    code: "UNAUTHENTICATED",
    message: "Identifiants invalides.",
  });
}

export class AuthService {
  constructor(
    private userRepo: IUserRepository = repositories.users,
    private kyc: IKYCProvider = providers.kyc,
    private sessions: SessionService = sessionService,
    private authRepo: IAuthRepository = authRepository,
    private emailSender: AuthEmailSender = authEmailSender,
  ) {}

  /**
   * Resolves the caller from a bearer token.
   *
   * Every failure — malformed, forged, expired, or pointing at an account that
   * has since been deleted or suspended — collapses to the guest principal.
   * Route-level guards then decide whether guest is acceptable, which keeps the
   * "is this request allowed" decision in exactly one place.
   */
  async resolvePrincipal(token: string | null): Promise<Principal> {
    if (!token) return GUEST_PRINCIPAL;

    let claims;
    try {
      claims = verifyToken(token, config.jwtSecret);
    } catch (err) {
      if (err instanceof TokenError) return GUEST_PRINCIPAL;
      throw err;
    }

    // The token is authentic, but authority comes from the account's current
    // state, not from claims minted possibly hours ago. A user suspended after
    // their token was issued must lose access immediately.
    if (claims.sid && !(await this.sessions.isActive(claims.sid, claims.sub)))
      return GUEST_PRINCIPAL;

    const user = await this.userRepo.findById(claims.sub);
    if (!user) return GUEST_PRINCIPAL;
    const access = canonicalAccessContext(user);
    if (access.status === "banned" || access.status === "closed") {
      return GUEST_PRINCIPAL;
    }

    if (claims.sid) await this.sessions.touch(claims.sid);

    return {
      userId: user.id,
      email: user.email,
      role: (user.primaryRole || user.role) as PlatformRole,
      accountType: access.accountType,
      status: user.status,
      professionalVertical: user.professionalVertical,
      staffRole:
        user.staffRole ??
        staffRoleFromLegacyRole(user.primaryRole || user.role),
      capabilities: permissionsForSubject(user),
      sessionId: claims.sid,
    };
  }

  async getCurrentUser(principal: Principal): Promise<UserProfile | null> {
    if (!principal.userId) return null;
    return this.userRepo.findById(principal.userId);
  }

  async login(
    credentials: LoginCredentials,
    metadata: AuthRequestMetadata = {},
  ): Promise<AuthResult> {
    const email = (credentials?.email || "").toLowerCase().trim();
    const password = credentials?.password || "";

    if (!config.emailPasswordAuthEnabled) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette méthode de connexion est temporairement indisponible.",
      });
    }

    if (!email || !password) {
      throw invalidCredentials();
    }

    const limitKey = sha256(`${email}:${metadata.ipPrefix || "unknown"}`);
    const rateLimit = await this.authRepo.consumeRateLimit(
      limitKey,
      "login",
      10,
      900,
      900,
    );
    if (!rateLimit.allowed) {
      await this.authRepo.recordSecurityEvent({
        eventType: "rate_limit_tripped",
        failureReason: "login",
        ipPrefix: metadata.ipPrefix,
      });
      throw new AppError({
        code: "RATE_LIMITED",
        message: "Trop de tentatives. Réessayez dans quelques minutes.",
        details: { retryAfterSeconds: rateLimit.retryAfterSeconds },
      });
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Spend comparable CPU to a real verification so that a missing account
      // and a wrong password are not distinguishable by response time.
      await simulatePasswordVerification();
      await this.authRepo.recordSecurityEvent({
        eventType: "login_failed",
        provider: "password",
        failureReason: "invalid_credentials",
        ipPrefix: metadata.ipPrefix,
      });
      throw invalidCredentials();
    }

    const credential = await this.userRepo.findCredentialByUserId(user.id);
    const passwordMatches = await verifyPassword(
      password,
      credential?.passwordHash,
    );
    if (!passwordMatches) {
      await this.authRepo.recordSecurityEvent({
        userId: user.id,
        eventType: "login_failed",
        provider: "password",
        failureReason: "invalid_credentials",
        ipPrefix: metadata.ipPrefix,
      });
      throw invalidCredentials();
    }

    const accountStatus = canonicalAccessContext(user).status;
    if (accountStatus === "banned" || accountStatus === "closed") {
      // Suspended and banned accounts get the same generic error: telling a
      // banned user their ban is in effect also tells an attacker the account
      // is real.
      throw invalidCredentials();
    }

    await this.authRepo.clearRateLimit(limitKey, "login");
    await this.authRepo.recordSecurityEvent({
      userId: user.id,
      eventType: "login_succeeded",
      provider: "password",
      ipPrefix: metadata.ipPrefix,
    });
    logger.info(`Authentication succeeded for profile ${user.id}`);
    const tokens = await this.sessions.create(user, "password", metadata);
    return { user, ...tokens };
  }

  async register(
    input: RegisterInput,
    metadata: AuthRequestMetadata = {},
  ): Promise<AuthResult> {
    const email = (input?.email || "").toLowerCase().trim();
    const password = input?.password || "";

    if (!config.emailPasswordAuthEnabled) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette méthode de connexion est temporairement indisponible.",
      });
    }

    if (!email || !input?.name) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Email et nom sont requis.",
      });
    }

    const registrationLimit = await this.authRepo.consumeRateLimit(
      sha256(`${email}:${metadata.ipPrefix || "unknown"}`),
      "registration",
      5,
      3600,
      3600,
    );
    if (!registrationLimit.allowed) {
      await this.authRepo.recordSecurityEvent({
        eventType: "rate_limit_tripped",
        failureReason: "registration",
        ipPrefix: metadata.ipPrefix,
      });
      throw new AppError({
        code: "RATE_LIMITED",
        message: "Trop de tentatives. Réessayez plus tard.",
        details: { retryAfterSeconds: registrationLimit.retryAfterSeconds },
      });
    }

    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      // Registration inherently reveals that an address is taken. Rather than
      // pretend otherwise, keep it a clean 409 and rely on rate limiting at the
      // edge to make bulk enumeration impractical.
      throw new AppError({
        code: "CONFLICT",
        message: "Un compte existe déjà avec cette adresse email.",
      });
    }

    let passwordHash: string;
    try {
      passwordHash = await hashPassword(password);
    } catch (err) {
      if (err instanceof WeakPasswordError) {
        throw new AppError({ code: "VALIDATION_ERROR", message: err.message });
      }
      throw err;
    }

    const requestedRole = input.role;
    if (requestedRole && !SELF_ASSIGNABLE_ROLES.has(requestedRole)) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Ce type de compte ne peut pas être créé depuis l'inscription.",
      });
    }
    // Buyer and seller are activities of one individual account, not durable
    // security identities. Keep one stored compatibility role and let the
    // capability policy expose both legitimate journeys.
    const role: UserRole = input.siret ? "pro_seller" : "individual_buyer";
    const professionalVertical = input.siret
      ? (input.professionalVertical ?? "generic")
      : undefined;
    if (
      professionalVertical &&
      !PROFESSIONAL_VERTICALS.includes(professionalVertical)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Activité professionnelle invalide.",
      });
    }

    const newUser: UserProfile = {
      id: randomUUID(),
      slug: input.name.toLowerCase().replace(/\s+/g, "-"),
      email,
      name: input.name,
      accountType: input.siret ? "professional" : "individual",
      professionalVertical,
      primaryRole: role,
      role,
      sellerType: input.siret ? "pro" : "individual",
      status: "active",
      phone: input.phone,
      country: "FR",
      isVerified: false,
      isIdentityVerified: false,
      isPhoneVerified: false,
      isEmailVerified: false,
      // Claiming a SIRET at signup is not proof of anything. Business
      // verification is an admin/registry decision, so the flag starts false
      // regardless of what the form supplied.
      isBusinessVerified: false,
      rating: 5.0,
      reviewCount: 0,
      responseRatePercent: 100,
    };

    const saved = await this.userRepo.save(newUser);
    await this.userRepo.saveCredential({ userId: saved.id, passwordHash });

    // Demo repositories do not run the SQL backfill migration, so register the
    // password method explicitly. Do not swallow storage outages: an auth
    // method silently missing from the security overview is not idempotency.
    const existingPasswordIdentity = (
      await this.authRepo.listIdentities(saved.id)
    ).some((identity) => identity.provider === "password");
    if (!existingPasswordIdentity) {
      await this.authRepo.linkIdentity({
        userId: saved.id,
        provider: "password",
        providerSubject: saved.id,
        providerEmail: saved.email,
        providerEmailVerified: saved.isEmailVerified,
        providerDisplayName: saved.name,
        isPrivateRelay: false,
      });
    }

    logger.info(`New account registered: profile ${saved.id} (${role})`);
    await this.authRepo.recordSecurityEvent({
      userId: saved.id,
      eventType: "registered",
      provider: "password",
      ipPrefix: metadata.ipPrefix,
    });
    try {
      await this.sendEmailVerification(saved.email, metadata, true);
    } catch (error: any) {
      // The account remains recoverable through resend. Do not roll back a
      // completed registration merely because the delivery provider is down.
      logger.error(
        `Email verification delivery failed: ${error?.message || "unknown delivery error"}`,
      );
    }
    const tokens = await this.sessions.create(saved, "password", metadata);
    return { user: saved, ...tokens };
  }

  /** Revokes the current server-side refresh session and its access-token sid. */
  async logout(principal: Principal): Promise<void> {
    if (principal.userId) {
      if (principal.sessionId)
        await this.authRepo.revokeSession(principal.sessionId, "logout");
      await this.authRepo.recordSecurityEvent({
        userId: principal.userId,
        eventType: "logout",
      });
      logger.info(`Session ended for profile ${principal.userId}`);
    }
  }

  /**
   * Switches the role a session acts as.
   *
   * This endpoint previously accepted any role from the request body and
   * applied it, which meant an unauthenticated caller could POST
   * {"role":"super_admin"} and become an administrator. A session may now only
   * move between roles the account actually holds.
   */
  async switchRole(principal: Principal, role: UserRole): Promise<AuthResult> {
    if (!principal.userId) {
      throw new AppError({ code: "UNAUTHENTICATED", message: "Non connecté" });
    }

    const user = await this.userRepo.findById(principal.userId);
    if (!user) {
      throw new AppError({ code: "UNAUTHENTICATED", message: "Non connecté" });
    }

    if (!this.grantedRolesFor(user).has(role)) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Ce rôle n'est pas disponible pour votre compte.",
      });
    }

    // A new token is issued so the session's authority reflects the new role.
    // Returning only the profile would leave the caller holding a token that
    // still asserts the old one.
    const updated: UserProfile = { ...user, role, primaryRole: role };
    return {
      user: updated,
      token: principal.sessionId
        ? this.sessions.issueAccessToken(updated, principal.sessionId)
        : this.issueFor(updated),
      sessionId: principal.sessionId,
    };
  }

  /**
   * The roles a given account is allowed to act as.
   *
   * Selling is a capability any individual account may switch into, which is
   * what lets a buyer publish their first listing. Staff and professional roles
   * are not self-assignable: they come from the account's stored primary role.
   */
  private grantedRolesFor(user: UserProfile): Set<UserRole> {
    const granted = new Set<UserRole>();
    const primary = (user.primaryRole || user.role) as UserRole;
    granted.add(primary);

    if (primary === "individual_buyer" || primary === "individual_seller") {
      granted.add("individual_buyer");
      granted.add("individual_seller");
    }
    if (primary === "pro_seller") {
      granted.add("individual_buyer");
    }
    return granted;
  }

  async verifyPhone(
    principal: Principal,
    phone: string,
    code: string,
  ): Promise<boolean> {
    if (!principal.userId) {
      throw new AppError({ code: "UNAUTHENTICATED", message: "Non connecté" });
    }
    const valid = await this.kyc.verifyPhoneOtp(phone, code);
    if (valid) {
      await this.userRepo.update(principal.userId, {
        isPhoneVerified: true,
        phone,
      });
    }
    return valid;
  }

  /** Confirms an email from a purpose-bound, one-time opaque token. */
  async verifyEmail(token: string): Promise<boolean> {
    if (!token) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Jeton de vérification manquant.",
      });
    }

    const action = await this.authRepo.consumeActionToken(
      sha256(token),
      "verify_email",
    );
    const user = action ? await this.userRepo.findById(action.userId) : null;
    if (!user) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Lien de vérification invalide ou expiré.",
      });
    }

    await this.userRepo.update(user.id, {
      isEmailVerified: true,
      status: user.status === "pending_verification" ? "active" : user.status,
    });
    await this.authRepo.recordSecurityEvent({
      userId: user.id,
      eventType: "email_verified",
    });
    return true;
  }

  async sendEmailVerification(
    email: string,
    metadata: AuthRequestMetadata = {},
    skipRateLimit = false,
  ): Promise<{ accepted: true; demoToken?: string }> {
    const normalized = (email || "").trim().toLowerCase();
    const key = sha256(`${normalized}:${metadata.ipPrefix || "unknown"}`);
    if (!skipRateLimit) {
      const decision = await this.authRepo.consumeRateLimit(
        key,
        "verify_email",
        3,
        300,
        300,
      );
      if (!decision.allowed)
        throw new AppError({
          code: "RATE_LIMITED",
          message: "Veuillez patienter avant de renvoyer un email.",
          details: { retryAfterSeconds: decision.retryAfterSeconds },
        });
    }
    const user = await this.userRepo.findByEmail(normalized);
    if (!user || user.isEmailVerified) return { accepted: true };
    const rawToken = await this.createActionToken(
      user.id,
      "verify_email",
      24 * 60 * 60,
    );
    const actionUrl = new URL(
      "/verification-email",
      config.frontendUrl || "http://localhost:3000",
    );
    actionUrl.searchParams.set("token", rawToken);
    await this.emailSender.send({
      to: user.email,
      template: "verify_email",
      actionUrl: actionUrl.toString(),
    });
    await this.authRepo.recordSecurityEvent({
      userId: user.id,
      eventType: "email_verification_sent",
      ipPrefix: metadata.ipPrefix,
    });
    return config.dataMode === "demo"
      ? { accepted: true, demoToken: rawToken }
      : { accepted: true };
  }

  async requestPasswordReset(
    email: string,
    metadata: AuthRequestMetadata = {},
  ): Promise<{ accepted: true; demoToken?: string }> {
    const normalized = (email || "").trim().toLowerCase();
    const key = sha256(`${normalized}:${metadata.ipPrefix || "unknown"}`);
    const decision = await this.authRepo.consumeRateLimit(
      key,
      "password_reset",
      3,
      900,
      900,
    );
    if (!decision.allowed) {
      // Keep the public response generic even when throttled; revealing the
      // bucket would make it possible to test whether someone else requested a
      // reset for an address.
      return { accepted: true };
    }
    const user = await this.userRepo.findByEmail(normalized);
    if (!user || user.status !== "active") return { accepted: true };
    const rawToken = await this.createActionToken(
      user.id,
      "password_reset",
      15 * 60,
    );
    const actionUrl = new URL(
      "/reinitialisation-mot-de-passe",
      config.frontendUrl || "http://localhost:3000",
    );
    actionUrl.searchParams.set("token", rawToken);
    await this.emailSender.send({
      to: user.email,
      template: "password_reset",
      actionUrl: actionUrl.toString(),
    });
    await this.authRepo.recordSecurityEvent({
      userId: user.id,
      eventType: "password_reset_requested",
      ipPrefix: metadata.ipPrefix,
    });
    return config.dataMode === "demo"
      ? { accepted: true, demoToken: rawToken }
      : { accepted: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const action = token
      ? await this.authRepo.consumeActionToken(sha256(token), "password_reset")
      : null;
    if (!action)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Lien de réinitialisation invalide ou expiré.",
      });
    let passwordHash: string;
    try {
      passwordHash = await hashPassword(newPassword);
    } catch (error) {
      if (error instanceof WeakPasswordError)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: error.message,
        });
      throw error;
    }
    await this.userRepo.saveCredential({ userId: action.userId, passwordHash });
    await this.sessions.revokeAll(action.userId, undefined, "password_reset");
    await this.authRepo.recordSecurityEvent({
      userId: action.userId,
      eventType: "password_reset_completed",
      provider: "password",
    });
  }

  async refresh(
    refreshToken: string,
    metadata: AuthRequestMetadata = {},
  ): Promise<AuthResult> {
    const rotated = await this.sessions.rotate(refreshToken, metadata);
    const user = await this.userRepo.findById(rotated.userId);
    if (!user || user.status !== "active") throw invalidCredentials();
    rotated.tokens.token = this.sessions.issueAccessToken(
      user,
      rotated.tokens.sessionId,
    );
    await this.authRepo.recordSecurityEvent({
      userId: user.id,
      eventType: "session_refreshed",
      provider:
        (await this.authRepo.findSessionById(rotated.tokens.sessionId))
          ?.provider || "password",
      ipPrefix: metadata.ipPrefix,
    });
    return { user, ...rotated.tokens };
  }

  async logoutAll(principal: Principal, keepCurrent = false): Promise<void> {
    if (!principal.userId)
      throw new AppError({ code: "UNAUTHENTICATED", message: "Non connecté" });
    await this.sessions.revokeAll(
      principal.userId,
      keepCurrent ? principal.sessionId : undefined,
      "logout_all",
    );
    await this.authRepo.recordSecurityEvent({
      userId: principal.userId,
      eventType: "logout_all",
    });
  }

  async listSessions(principal: Principal) {
    if (!principal.userId)
      throw new AppError({ code: "UNAUTHENTICATED", message: "Non connecté" });
    return this.sessions.list(principal.userId, principal.sessionId);
  }

  async revokeSession(principal: Principal, sessionId: string): Promise<void> {
    if (!principal.userId)
      throw new AppError({ code: "UNAUTHENTICATED", message: "Non connecté" });
    await this.sessions.revoke(sessionId, principal.userId);
    await this.authRepo.recordSecurityEvent({
      userId: principal.userId,
      eventType: "session_revoked",
    });
  }

  async reauthenticate(
    principal: Principal,
    password: string,
  ): Promise<{ reauthenticated: true }> {
    if (!principal.userId || !principal.sessionId)
      throw new AppError({ code: "UNAUTHENTICATED", message: "Non connecté" });
    const credential = await this.userRepo.findCredentialByUserId(
      principal.userId,
    );
    if (!(await verifyPassword(password || "", credential?.passwordHash)))
      throw invalidCredentials();
    await this.sessions.markReauthenticated(principal.sessionId);
    await this.authRepo.recordSecurityEvent({
      userId: principal.userId,
      eventType: "reauthenticated",
      provider: "password",
    });
    return { reauthenticated: true };
  }

  async changePassword(
    principal: Principal,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.reauthenticate(principal, currentPassword);
    let passwordHash: string;
    try {
      passwordHash = await hashPassword(newPassword);
    } catch (error) {
      if (error instanceof WeakPasswordError)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: error.message,
        });
      throw error;
    }
    await this.userRepo.saveCredential({
      userId: principal.userId,
      passwordHash,
    });
    await this.sessions.revokeAll(
      principal.userId,
      principal.sessionId,
      "password_changed",
    );
    await this.authRepo.recordSecurityEvent({
      userId: principal.userId,
      eventType: "password_changed",
      provider: "password",
    });
  }

  async addPassword(principal: Principal, newPassword: string): Promise<void> {
    if (
      !principal.userId ||
      !principal.sessionId ||
      !(await this.sessions.hasRecentAuthentication(principal.sessionId))
    ) {
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Confirmez votre identité avant d’ajouter un mot de passe.",
      });
    }
    if (await this.userRepo.findCredentialByUserId(principal.userId)) {
      throw new AppError({
        code: "CONFLICT",
        message: "Un mot de passe est déjà défini.",
      });
    }
    let passwordHash: string;
    try {
      passwordHash = await hashPassword(newPassword);
    } catch (error) {
      if (error instanceof WeakPasswordError)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: error.message,
        });
      throw error;
    }
    await this.userRepo.saveCredential({
      userId: principal.userId,
      passwordHash,
    });
    const existingPasswordIdentity = (
      await this.authRepo.listIdentities(principal.userId)
    ).some((identity) => identity.provider === "password");
    if (!existingPasswordIdentity) {
      const user = await this.userRepo.findById(principal.userId);
      await this.authRepo.linkIdentity({
        userId: principal.userId,
        provider: "password",
        providerSubject: principal.userId,
        providerEmail: user?.email || null,
        providerEmailVerified: Boolean(user?.isEmailVerified),
        providerDisplayName: user?.name || null,
        isPrivateRelay: false,
      });
    }
    await this.authRepo.recordSecurityEvent({
      userId: principal.userId,
      eventType: "password_changed",
      provider: "password",
      metadata: { passwordAdded: true },
    });
  }

  private async createActionToken(
    userId: string,
    purpose: "verify_email" | "password_reset" | "account_recovery",
    ttlSeconds: number,
  ): Promise<string> {
    const rawToken = randomOAuthValue(40);
    await this.authRepo.createActionToken({
      userId,
      purpose,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
    return rawToken;
  }

  private issueFor(user: UserProfile): string {
    return issueToken(
      {
        sub: user.id,
        email: user.email,
        role: (user.primaryRole || user.role) as PlatformRole,
      },
      config.jwtSecret,
      config.authTokenTtlSeconds,
    );
  }
}

export const authService = new AuthService();
