import { randomUUID } from "crypto";
import { config } from "../../app/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { issueToken } from "../../shared/auth/tokens.js";
import type { UserProfile } from "../../shared/types/index.js";
import type { AuthProvider } from "../../shared/auth/identity.js";
import {
  authRepository,
  type IAuthRepository,
  type AuthSessionRecord,
} from "../../infrastructure/database/repositories/auth.repository.js";
import { randomOAuthValue, sha256 } from "./oauth-provider.client.js";
import type { PlatformRole } from "../../shared/auth/rbac.js";
import { canonicalAccessContext } from "@shongre/contracts/access-control";

export interface AuthRequestMetadata {
  ipPrefix?: string | null;
  deviceLabel?: string | null;
  userAgentFamily?: string | null;
}

export interface SessionTokens {
  token: string;
  refreshToken: string;
  expiresAt: string;
  sessionId: string;
}

export interface SessionView {
  id: string;
  provider: AuthProvider;
  deviceLabel: string;
  ipPrefix: string | null;
  issuedAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

function unauthenticated(): AppError {
  return new AppError({
    code: "UNAUTHENTICATED",
    message: "Session invalide ou expirée.",
  });
}

export class SessionService {
  constructor(private readonly repository: IAuthRepository = authRepository) {}

  async create(
    user: UserProfile,
    provider: AuthProvider,
    metadata: AuthRequestMetadata = {},
    recentlyAuthenticated = true,
    mfaVerified = false,
  ): Promise<SessionTokens> {
    const access = canonicalAccessContext(user);
    if (access.staffStatus !== "none" && access.staffStatus !== "active") {
      throw unauthenticated();
    }
    const refreshToken = randomOAuthValue(48);
    const now = Date.now();
    const session = await this.repository.createSession({
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      familyId: randomUUID(),
      rotatedFrom: null,
      provider,
      deviceLabel: metadata.deviceLabel?.slice(0, 120) || "Navigateur",
      ipPrefix: metadata.ipPrefix || null,
      lastReauthenticatedAt: recentlyAuthenticated
        ? new Date(now).toISOString()
        : null,
      mfaVerifiedAt: mfaVerified ? new Date(now).toISOString() : null,
      expiresAt: new Date(
        now + config.authRefreshTokenTtlSeconds * 1000,
      ).toISOString(),
    });
    return this.tokensFor(user, session, refreshToken);
  }

  async rotate(
    refreshToken: string,
    metadata: AuthRequestMetadata = {},
  ): Promise<{ userId: string; tokens: SessionTokens }> {
    if (!refreshToken) throw unauthenticated();
    const existing = await this.repository.findSessionByRefreshHash(
      sha256(refreshToken),
    );
    if (!existing) throw unauthenticated();

    if (existing.revokedAt) {
      if (existing.revokedReason === "rotated") {
        await this.repository.revokeSessionFamily(
          existing.familyId,
          "reuse_detected",
        );
        await this.repository.recordSecurityEvent({
          userId: existing.userId,
          eventType: "session_reuse_detected",
          provider: existing.provider,
          ipPrefix: metadata.ipPrefix,
        });
      }
      throw unauthenticated();
    }
    if (Date.parse(existing.expiresAt) <= Date.now()) {
      await this.repository.revokeSession(existing.id, "expired");
      throw unauthenticated();
    }

    await this.repository.revokeSession(existing.id, "rotated");
    const nextRefresh = randomOAuthValue(48);
    const next = await this.repository.createSession({
      userId: existing.userId,
      refreshTokenHash: sha256(nextRefresh),
      familyId: existing.familyId,
      rotatedFrom: existing.id,
      provider: existing.provider,
      deviceLabel: metadata.deviceLabel?.slice(0, 120) || existing.deviceLabel,
      ipPrefix: metadata.ipPrefix || existing.ipPrefix,
      lastReauthenticatedAt: existing.lastReauthenticatedAt,
      mfaVerifiedAt: existing.mfaVerifiedAt,
      expiresAt: existing.expiresAt,
    });
    return {
      userId: existing.userId,
      tokens: {
        token: "",
        refreshToken: nextRefresh,
        expiresAt: new Date(
          Date.now() + config.authTokenTtlSeconds * 1000,
        ).toISOString(),
        sessionId: next.id,
      },
    };
  }

  issueAccessToken(user: UserProfile, sessionId: string): string {
    return issueToken(
      {
        sub: user.id,
        email: user.email,
        role: (user.primaryRole || user.role) as PlatformRole,
        sid: sessionId,
      },
      config.jwtSecret,
      config.authTokenTtlSeconds,
    );
  }

  async isActive(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.repository.findSessionById(sessionId);
    return Boolean(
      session &&
      session.userId === userId &&
      !session.revokedAt &&
      Date.parse(session.expiresAt) > Date.now(),
    );
  }

  async hasRecentAuthentication(
    sessionId: string | undefined,
  ): Promise<boolean> {
    if (!sessionId) return false;
    const session = await this.repository.findSessionById(sessionId);
    if (!session || session.revokedAt || !session.lastReauthenticatedAt)
      return false;
    return (
      Date.now() - Date.parse(session.lastReauthenticatedAt) <=
      config.authRecentAuthenticationSeconds * 1000
    );
  }

  async markReauthenticated(sessionId: string): Promise<void> {
    await this.repository.markSessionReauthenticated(sessionId);
  }

  async isMfaVerified(sessionId: string | undefined): Promise<boolean> {
    if (!sessionId) return false;
    const session = await this.repository.findSessionById(sessionId);
    return Boolean(session && !session.revokedAt && session.mfaVerifiedAt);
  }

  async markMfaVerified(sessionId: string): Promise<void> {
    await this.repository.markSessionMfaVerified(sessionId);
  }

  async touch(sessionId: string): Promise<void> {
    await this.repository.touchSession(sessionId);
  }

  async list(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionView[]> {
    const sessions = await this.repository.listSessions(userId);
    return sessions
      .filter(
        (session) =>
          !session.revokedAt && Date.parse(session.expiresAt) > Date.now(),
      )
      .map((session) => ({
        id: session.id,
        provider: session.provider,
        deviceLabel: session.deviceLabel || "Appareil",
        ipPrefix: session.ipPrefix,
        issuedAt: session.issuedAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        isCurrent: session.id === currentSessionId,
      }));
  }

  async revoke(sessionId: string, userId: string): Promise<void> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      // Do not reveal whether a session id belongs to another account.
      throw new AppError({
        code: "NOT_FOUND",
        message: "Session introuvable.",
      });
    }
    await this.repository.revokeSession(sessionId, "admin_revoked");
  }

  async revokeAll(
    userId: string,
    exceptId?: string,
    reason = "logout_all",
  ): Promise<void> {
    await this.repository.revokeSessions(userId, reason, exceptId);
  }

  private tokensFor(
    user: UserProfile,
    session: AuthSessionRecord,
    refreshToken: string,
  ): SessionTokens {
    return {
      token: this.issueAccessToken(user, session.id),
      refreshToken,
      expiresAt: new Date(
        Date.now() + config.authTokenTtlSeconds * 1000,
      ).toISOString(),
      sessionId: session.id,
    };
  }
}

export const sessionService = new SessionService();
