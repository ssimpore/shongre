import { randomUUID } from "crypto";
import { config } from "../../../app/config/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import type { AuthProvider } from "../../../shared/auth/identity.js";

export interface ExternalIdentityRecord {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
  providerEmail: string | null;
  providerEmailVerified: boolean;
  providerDisplayName: string | null;
  isPrivateRelay: boolean;
  linkedAt: string;
  lastAuthenticatedAt: string | null;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  rotatedFrom: string | null;
  provider: AuthProvider;
  deviceLabel: string | null;
  ipPrefix: string | null;
  issuedAt: string;
  lastReauthenticatedAt: string | null;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface OAuthFlowRecord {
  id: string;
  stateHash: string;
  provider: Exclude<AuthProvider, "password">;
  intent: "sign_in" | "link";
  userId: string | null;
  sessionId: string | null;
  returnTo: string;
  clientKind: "web" | "native";
  requestedAccountType: "individual" | "professional" | null;
  nonceHash: string;
  codeVerifier: string;
  expiresAt: string;
}

export interface NativeExchangeRecord {
  id: string;
  codeHash: string;
  userId: string;
  provider: Exclude<AuthProvider, "password">;
  returnTo: string;
  expiresAt: string;
}

export interface PendingOAuthRegistration {
  id: string;
  handleHash: string;
  provider: Exclude<AuthProvider, "password">;
  providerSubject: string;
  providerEmail: string | null;
  providerEmailVerified: boolean;
  providerDisplayName: string | null;
  providerAvatarUrl: string | null;
  requestedAccountType: "individual" | "professional" | null;
  clientKind: "web" | "native";
  returnTo: string;
  expiresAt: string;
}

export interface SecurityEventInput {
  userId?: string | null;
  eventType: string;
  provider?: AuthProvider | null;
  failureReason?: string | null;
  ipPrefix?: string | null;
  userAgentFamily?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface AuthActionTokenRecord {
  id: string;
  userId: string;
  purpose: "verify_email" | "password_reset" | "account_recovery";
  tokenHash: string;
  expiresAt: string;
}

export interface OAuthProfileProvisionInput {
  userId: string;
  slug: string;
  email: string;
  name: string;
  status: "active" | "pending_verification";
  avatarUrl: string | null;
  emailVerified: boolean;
  provider: Exclude<AuthProvider, "password">;
  providerSubject: string;
  providerEmail: string | null;
  providerEmailVerified: boolean;
  providerDisplayName: string | null;
  isPrivateRelay: boolean;
}

export interface ProviderDeletionRequestRecord {
  id: string;
  provider: Exclude<AuthProvider, "password">;
  providerSubject: string;
  userId: string | null;
  confirmationCodeHash: string;
  status: "queued" | "completed" | "rejected";
  requestedAt: string;
  completedAt: string | null;
}

export interface IAuthRepository {
  /** Atomically inserts a new profile and its first external identity in database mode. */
  provisionOAuthProfile(input: OAuthProfileProvisionInput): Promise<boolean>;
  createProviderDeletionRequest(
    input: Omit<
      ProviderDeletionRequestRecord,
      "id" | "status" | "requestedAt" | "completedAt"
    >,
  ): Promise<ProviderDeletionRequestRecord>;
  findProviderDeletionRequest(
    codeHash: string,
  ): Promise<ProviderDeletionRequestRecord | null>;
  updateProviderDeletionRequest(
    id: string,
    status: ProviderDeletionRequestRecord["status"],
  ): Promise<void>;
  listQueuedProviderDeletionRequests(
    limit?: number,
  ): Promise<ProviderDeletionRequestRecord[]>;
  deleteIdentities(userId: string): Promise<void>;
  findIdentity(
    provider: AuthProvider,
    subject: string,
  ): Promise<ExternalIdentityRecord | null>;
  listIdentities(userId: string): Promise<ExternalIdentityRecord[]>;
  linkIdentity(
    input: Omit<
      ExternalIdentityRecord,
      "id" | "linkedAt" | "lastAuthenticatedAt"
    >,
  ): Promise<ExternalIdentityRecord>;
  touchIdentity(id: string): Promise<void>;
  unlinkIdentity(userId: string, provider: AuthProvider): Promise<void>;
  createSession(
    input: Omit<
      AuthSessionRecord,
      "id" | "issuedAt" | "lastUsedAt" | "revokedAt" | "revokedReason"
    >,
  ): Promise<AuthSessionRecord>;
  findSessionById(id: string): Promise<AuthSessionRecord | null>;
  findSessionByRefreshHash(hash: string): Promise<AuthSessionRecord | null>;
  markSessionReauthenticated(id: string): Promise<void>;
  touchSession(id: string): Promise<void>;
  listSessions(userId: string): Promise<AuthSessionRecord[]>;
  revokeSession(id: string, reason: string): Promise<void>;
  revokeSessionFamily(familyId: string, reason: string): Promise<void>;
  revokeSessions(
    userId: string,
    reason: string,
    exceptId?: string,
  ): Promise<void>;
  createOAuthFlow(input: Omit<OAuthFlowRecord, "id">): Promise<void>;
  consumeOAuthFlow(stateHash: string): Promise<OAuthFlowRecord | null>;
  createNativeExchange(input: Omit<NativeExchangeRecord, "id">): Promise<void>;
  consumeNativeExchange(codeHash: string): Promise<NativeExchangeRecord | null>;
  createPendingRegistration(
    input: Omit<PendingOAuthRegistration, "id">,
  ): Promise<void>;
  consumePendingRegistration(
    handleHash: string,
  ): Promise<PendingOAuthRegistration | null>;
  createActionToken(input: Omit<AuthActionTokenRecord, "id">): Promise<void>;
  consumeActionToken(
    tokenHash: string,
    purpose: AuthActionTokenRecord["purpose"],
  ): Promise<AuthActionTokenRecord | null>;
  consumeRateLimit(
    keyHash: string,
    action: string,
    limit: number,
    windowSeconds: number,
    lockSeconds: number,
  ): Promise<RateLimitDecision>;
  clearRateLimit(keyHash: string, action: string): Promise<void>;
  recordSecurityEvent(input: SecurityEventInput): Promise<void>;
}

function mapIdentity(row: any): ExternalIdentityRecord {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerSubject: row.provider_subject,
    providerEmail: row.provider_email,
    providerEmailVerified: Boolean(row.provider_email_verified),
    providerDisplayName: row.provider_display_name,
    isPrivateRelay: Boolean(row.is_private_relay),
    linkedAt: row.linked_at,
    lastAuthenticatedAt: row.last_authenticated_at,
  };
}

function mapSession(row: any): AuthSessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    familyId: row.family_id,
    rotatedFrom: row.rotated_from,
    provider: row.provider,
    deviceLabel: row.device_label,
    ipPrefix: row.ip_prefix,
    issuedAt: row.issued_at,
    lastReauthenticatedAt: row.last_reauthenticated_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokedReason: row.revoked_reason,
  };
}

function mapFlow(row: any): OAuthFlowRecord {
  return {
    id: row.id,
    stateHash: row.state_hash,
    provider: row.provider,
    intent: row.intent,
    userId: row.user_id,
    sessionId: row.session_id,
    returnTo: row.return_to,
    clientKind: row.client_kind,
    requestedAccountType: row.requested_account_type,
    nonceHash: row.nonce_hash,
    codeVerifier: row.code_verifier,
    expiresAt: row.expires_at,
  };
}

function mapExchange(row: any): NativeExchangeRecord {
  return {
    id: row.id,
    codeHash: row.code_hash,
    userId: row.user_id,
    provider: row.provider,
    returnTo: row.return_to,
    expiresAt: row.expires_at,
  };
}

function mapPending(row: any): PendingOAuthRegistration {
  return {
    id: row.id,
    handleHash: row.handle_hash,
    provider: row.provider,
    providerSubject: row.provider_subject,
    providerEmail: row.provider_email,
    providerEmailVerified: Boolean(row.provider_email_verified),
    providerDisplayName: row.provider_display_name,
    providerAvatarUrl: row.provider_avatar_url,
    requestedAccountType: row.requested_account_type,
    clientKind: row.client_kind,
    returnTo: row.return_to,
    expiresAt: row.expires_at,
  };
}

function mapActionToken(row: any): AuthActionTokenRecord {
  return {
    id: row.id,
    userId: row.user_id,
    purpose: row.purpose,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
  };
}

export class DemoAuthRepository implements IAuthRepository {
  private identities = new Map<string, ExternalIdentityRecord>();
  private sessions = new Map<string, AuthSessionRecord>();
  private flows = new Map<string, OAuthFlowRecord>();
  private exchanges = new Map<string, NativeExchangeRecord>();
  private pendingRegistrations = new Map<string, PendingOAuthRegistration>();
  private actionTokens = new Map<string, AuthActionTokenRecord>();
  private providerDeletionRequests = new Map<
    string,
    ProviderDeletionRequestRecord
  >();
  private rateLimits = new Map<
    string,
    { attempts: number; resetAt: number; lockedUntil: number }
  >();
  readonly events: SecurityEventInput[] = [];

  private identityKey(provider: AuthProvider, subject: string): string {
    return `${provider}:${subject}`;
  }

  async provisionOAuthProfile(): Promise<boolean> {
    // The deterministic in-memory repositories have no shared transaction
    // boundary. Returning false asks the application service to use their
    // normal save/link operations; PostgreSQL performs the real atomic path.
    return false;
  }

  async createProviderDeletionRequest(
    input: Omit<
      ProviderDeletionRequestRecord,
      "id" | "status" | "requestedAt" | "completedAt"
    >,
  ): Promise<ProviderDeletionRequestRecord> {
    const record: ProviderDeletionRequestRecord = {
      ...input,
      id: randomUUID(),
      status: "queued",
      requestedAt: new Date().toISOString(),
      completedAt: null,
    };
    this.providerDeletionRequests.set(input.confirmationCodeHash, record);
    return record;
  }

  async findProviderDeletionRequest(
    codeHash: string,
  ): Promise<ProviderDeletionRequestRecord | null> {
    return this.providerDeletionRequests.get(codeHash) || null;
  }

  async updateProviderDeletionRequest(
    id: string,
    status: ProviderDeletionRequestRecord["status"],
  ): Promise<void> {
    for (const [key, record] of this.providerDeletionRequests) {
      if (record.id === id) {
        this.providerDeletionRequests.set(key, {
          ...record,
          status,
          completedAt: status === "completed" ? new Date().toISOString() : null,
        });
      }
    }
  }

  async listQueuedProviderDeletionRequests(
    limit = 50,
  ): Promise<ProviderDeletionRequestRecord[]> {
    return [...this.providerDeletionRequests.values()]
      .filter((record) => record.status === "queued")
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
      .slice(0, limit);
  }

  async deleteIdentities(userId: string): Promise<void> {
    for (const [key, identity] of this.identities) {
      if (identity.userId === userId) this.identities.delete(key);
    }
  }

  async findIdentity(
    provider: AuthProvider,
    subject: string,
  ): Promise<ExternalIdentityRecord | null> {
    return this.identities.get(this.identityKey(provider, subject)) || null;
  }

  async listIdentities(userId: string): Promise<ExternalIdentityRecord[]> {
    return [...this.identities.values()].filter(
      (identity) => identity.userId === userId,
    );
  }

  async linkIdentity(
    input: Omit<
      ExternalIdentityRecord,
      "id" | "linkedAt" | "lastAuthenticatedAt"
    >,
  ): Promise<ExternalIdentityRecord> {
    const key = this.identityKey(input.provider, input.providerSubject);
    const existingForProvider = [...this.identities.values()].find(
      (identity) =>
        identity.userId === input.userId &&
        identity.provider === input.provider,
    );
    if (this.identities.has(key) || existingForProvider)
      throw new Error("identity_conflict");
    const now = new Date().toISOString();
    const identity: ExternalIdentityRecord = {
      ...input,
      id: randomUUID(),
      linkedAt: now,
      lastAuthenticatedAt: now,
    };
    this.identities.set(key, identity);
    return identity;
  }

  async touchIdentity(id: string): Promise<void> {
    for (const [key, identity] of this.identities) {
      if (identity.id === id)
        this.identities.set(key, {
          ...identity,
          lastAuthenticatedAt: new Date().toISOString(),
        });
    }
  }

  async unlinkIdentity(userId: string, provider: AuthProvider): Promise<void> {
    for (const [key, identity] of this.identities) {
      if (identity.userId === userId && identity.provider === provider)
        this.identities.delete(key);
    }
  }

  async createSession(
    input: Omit<
      AuthSessionRecord,
      "id" | "issuedAt" | "lastUsedAt" | "revokedAt" | "revokedReason"
    >,
  ): Promise<AuthSessionRecord> {
    const record: AuthSessionRecord = {
      ...input,
      id: randomUUID(),
      issuedAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
      revokedReason: null,
    };
    this.sessions.set(record.id, record);
    return record;
  }

  async findSessionById(id: string): Promise<AuthSessionRecord | null> {
    return this.sessions.get(id) || null;
  }

  async findSessionByRefreshHash(
    hash: string,
  ): Promise<AuthSessionRecord | null> {
    return (
      [...this.sessions.values()].find(
        (session) => session.refreshTokenHash === hash,
      ) || null
    );
  }

  async markSessionReauthenticated(id: string): Promise<void> {
    const current = this.sessions.get(id);
    if (current)
      this.sessions.set(id, {
        ...current,
        lastReauthenticatedAt: new Date().toISOString(),
      });
  }

  async touchSession(id: string): Promise<void> {
    const current = this.sessions.get(id);
    if (current && !current.revokedAt)
      this.sessions.set(id, {
        ...current,
        lastUsedAt: new Date().toISOString(),
      });
  }

  async listSessions(userId: string): Promise<AuthSessionRecord[]> {
    return [...this.sessions.values()].filter(
      (session) => session.userId === userId,
    );
  }

  async revokeSession(id: string, reason: string): Promise<void> {
    const current = this.sessions.get(id);
    if (current && !current.revokedAt)
      this.sessions.set(id, {
        ...current,
        revokedAt: new Date().toISOString(),
        revokedReason: reason,
      });
  }

  async revokeSessionFamily(familyId: string, reason: string): Promise<void> {
    await Promise.all(
      [...this.sessions.values()]
        .filter((session) => session.familyId === familyId)
        .map((session) => this.revokeSession(session.id, reason)),
    );
  }

  async revokeSessions(
    userId: string,
    reason: string,
    exceptId?: string,
  ): Promise<void> {
    await Promise.all(
      [...this.sessions.values()]
        .filter(
          (session) => session.userId === userId && session.id !== exceptId,
        )
        .map((session) => this.revokeSession(session.id, reason)),
    );
  }

  async createOAuthFlow(input: Omit<OAuthFlowRecord, "id">): Promise<void> {
    this.flows.set(input.stateHash, { ...input, id: randomUUID() });
  }

  async consumeOAuthFlow(stateHash: string): Promise<OAuthFlowRecord | null> {
    const flow = this.flows.get(stateHash);
    this.flows.delete(stateHash);
    if (!flow || Date.parse(flow.expiresAt) <= Date.now()) return null;
    return flow;
  }

  async createNativeExchange(
    input: Omit<NativeExchangeRecord, "id">,
  ): Promise<void> {
    this.exchanges.set(input.codeHash, { ...input, id: randomUUID() });
  }

  async consumeNativeExchange(
    codeHash: string,
  ): Promise<NativeExchangeRecord | null> {
    const exchange = this.exchanges.get(codeHash);
    this.exchanges.delete(codeHash);
    if (!exchange || Date.parse(exchange.expiresAt) <= Date.now()) return null;
    return exchange;
  }

  async createPendingRegistration(
    input: Omit<PendingOAuthRegistration, "id">,
  ): Promise<void> {
    for (const [key, pending] of this.pendingRegistrations) {
      if (
        pending.provider === input.provider &&
        pending.providerSubject === input.providerSubject
      ) {
        this.pendingRegistrations.delete(key);
      }
    }
    this.pendingRegistrations.set(input.handleHash, {
      ...input,
      id: randomUUID(),
    });
  }

  async consumePendingRegistration(
    handleHash: string,
  ): Promise<PendingOAuthRegistration | null> {
    const pending = this.pendingRegistrations.get(handleHash);
    this.pendingRegistrations.delete(handleHash);
    if (!pending || Date.parse(pending.expiresAt) <= Date.now()) return null;
    return pending;
  }

  async createActionToken(
    input: Omit<AuthActionTokenRecord, "id">,
  ): Promise<void> {
    this.actionTokens.set(input.tokenHash, { ...input, id: randomUUID() });
  }

  async consumeActionToken(
    tokenHash: string,
    purpose: AuthActionTokenRecord["purpose"],
  ): Promise<AuthActionTokenRecord | null> {
    const token = this.actionTokens.get(tokenHash);
    this.actionTokens.delete(tokenHash);
    if (
      !token ||
      token.purpose !== purpose ||
      Date.parse(token.expiresAt) <= Date.now()
    )
      return null;
    return token;
  }

  async consumeRateLimit(
    keyHash: string,
    action: string,
    limit: number,
    windowSeconds: number,
    lockSeconds: number,
  ): Promise<RateLimitDecision> {
    const key = `${action}:${keyHash}`;
    const now = Date.now();
    const current = this.rateLimits.get(key);
    if (!current || current.resetAt <= now) {
      this.rateLimits.set(key, {
        attempts: 1,
        resetAt: now + windowSeconds * 1000,
        lockedUntil: 0,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((current.lockedUntil - now) / 1000),
      };
    }
    current.attempts += 1;
    if (current.attempts > limit)
      current.lockedUntil = now + lockSeconds * 1000;
    this.rateLimits.set(key, current);
    return current.attempts > limit
      ? { allowed: false, retryAfterSeconds: lockSeconds }
      : { allowed: true, retryAfterSeconds: 0 };
  }

  async clearRateLimit(keyHash: string, action: string): Promise<void> {
    this.rateLimits.delete(`${action}:${keyHash}`);
  }

  async recordSecurityEvent(input: SecurityEventInput): Promise<void> {
    this.events.unshift(input);
  }
}

export class PostgresAuthRepository implements IAuthRepository {
  private client(): any {
    return getSupabaseAdminClient() as any;
  }

  async provisionOAuthProfile(
    input: OAuthProfileProvisionInput,
  ): Promise<boolean> {
    const { data, error } = await this.client().rpc("provision_oauth_profile", {
      p_user_id: input.userId,
      p_slug: input.slug,
      p_email: input.email,
      p_name: input.name,
      p_status: input.status,
      p_avatar_url: input.avatarUrl,
      p_email_verified: input.emailVerified,
      p_provider: input.provider,
      p_provider_subject: input.providerSubject,
      p_provider_email: input.providerEmail,
      p_provider_email_verified: input.providerEmailVerified,
      p_provider_display_name: input.providerDisplayName,
      p_is_private_relay: input.isPrivateRelay,
    });
    if (error || data !== input.userId) {
      throw new Error(
        `OAuth profile provisioning failed: ${error?.message || "unexpected result"}`,
      );
    }
    return true;
  }

  async createProviderDeletionRequest(
    input: Omit<
      ProviderDeletionRequestRecord,
      "id" | "status" | "requestedAt" | "completedAt"
    >,
  ): Promise<ProviderDeletionRequestRecord> {
    const { data, error } = await this.client()
      .from("oauth_provider_deletion_requests")
      .insert({
        provider: input.provider,
        provider_subject: input.providerSubject,
        user_id: input.userId,
        confirmation_code_hash: input.confirmationCodeHash,
      })
      .select("*")
      .single();
    if (error || !data)
      throw new Error(
        `provider deletion request failed: ${error?.message || "missing row"}`,
      );
    return {
      id: data.id,
      provider: data.provider,
      providerSubject: data.provider_subject,
      userId: data.user_id,
      confirmationCodeHash: data.confirmation_code_hash,
      status: data.status,
      requestedAt: data.requested_at,
      completedAt: data.completed_at,
    };
  }

  async findProviderDeletionRequest(
    codeHash: string,
  ): Promise<ProviderDeletionRequestRecord | null> {
    const { data, error } = await this.client()
      .from("oauth_provider_deletion_requests")
      .select("*")
      .eq("confirmation_code_hash", codeHash)
      .maybeSingle();
    if (error)
      throw new Error(`provider deletion status failed: ${error.message}`);
    return data
      ? {
          id: data.id,
          provider: data.provider,
          providerSubject: data.provider_subject,
          userId: data.user_id,
          confirmationCodeHash: data.confirmation_code_hash,
          status: data.status,
          requestedAt: data.requested_at,
          completedAt: data.completed_at,
        }
      : null;
  }

  async updateProviderDeletionRequest(
    id: string,
    status: ProviderDeletionRequestRecord["status"],
  ): Promise<void> {
    const { error } = await this.client()
      .from("oauth_provider_deletion_requests")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error)
      throw new Error(
        `provider deletion status update failed: ${error.message}`,
      );
  }

  async listQueuedProviderDeletionRequests(
    limit = 50,
  ): Promise<ProviderDeletionRequestRecord[]> {
    const { data, error } = await this.client()
      .from("oauth_provider_deletion_requests")
      .select("*")
      .eq("status", "queued")
      .order("requested_at")
      .limit(limit);
    if (error)
      throw new Error(`provider deletion queue read failed: ${error.message}`);
    return (data || []).map((row: any) => ({
      id: row.id,
      provider: row.provider,
      providerSubject: row.provider_subject,
      userId: row.user_id,
      confirmationCodeHash: row.confirmation_code_hash,
      status: row.status,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
    }));
  }

  async deleteIdentities(userId: string): Promise<void> {
    const { error } = await this.client()
      .from("user_identities")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(`identity deletion failed: ${error.message}`);
  }

  async findIdentity(
    provider: AuthProvider,
    subject: string,
  ): Promise<ExternalIdentityRecord | null> {
    const { data, error } = await this.client()
      .from("user_identities")
      .select("*")
      .eq("provider", provider)
      .eq("provider_subject", subject)
      .maybeSingle();
    if (error) throw new Error(`identity lookup failed: ${error.message}`);
    return data ? mapIdentity(data) : null;
  }

  async listIdentities(userId: string): Promise<ExternalIdentityRecord[]> {
    const { data, error } = await this.client()
      .from("user_identities")
      .select("*")
      .eq("user_id", userId)
      .order("linked_at");
    if (error) throw new Error(`identity list failed: ${error.message}`);
    return (data || []).map(mapIdentity);
  }

  async linkIdentity(
    input: Omit<
      ExternalIdentityRecord,
      "id" | "linkedAt" | "lastAuthenticatedAt"
    >,
  ): Promise<ExternalIdentityRecord> {
    const { data, error } = await this.client()
      .from("user_identities")
      .insert({
        user_id: input.userId,
        provider: input.provider,
        provider_subject: input.providerSubject,
        provider_email: input.providerEmail,
        provider_email_verified: input.providerEmailVerified,
        provider_display_name: input.providerDisplayName,
        is_private_relay: input.isPrivateRelay,
        last_authenticated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error || !data)
      throw new Error(
        `identity link failed: ${error?.message || "missing row"}`,
      );
    return mapIdentity(data);
  }

  async touchIdentity(id: string): Promise<void> {
    const { error } = await this.client()
      .from("user_identities")
      .update({ last_authenticated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`identity update failed: ${error.message}`);
  }

  async unlinkIdentity(userId: string, provider: AuthProvider): Promise<void> {
    const { error } = await this.client()
      .from("user_identities")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);
    if (error) throw new Error(`identity unlink failed: ${error.message}`);
  }

  async createSession(
    input: Omit<
      AuthSessionRecord,
      "id" | "issuedAt" | "lastUsedAt" | "revokedAt" | "revokedReason"
    >,
  ): Promise<AuthSessionRecord> {
    const { data, error } = await this.client()
      .from("auth_sessions")
      .insert({
        user_id: input.userId,
        refresh_token_hash: input.refreshTokenHash,
        family_id: input.familyId,
        rotated_from: input.rotatedFrom,
        provider: input.provider,
        device_label: input.deviceLabel,
        ip_prefix: input.ipPrefix,
        last_reauthenticated_at: input.lastReauthenticatedAt,
        expires_at: input.expiresAt,
      })
      .select("*")
      .single();
    if (error || !data)
      throw new Error(
        `session creation failed: ${error?.message || "missing row"}`,
      );
    return mapSession(data);
  }

  async findSessionById(id: string): Promise<AuthSessionRecord | null> {
    const { data, error } = await this.client()
      .from("auth_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`session lookup failed: ${error.message}`);
    return data ? mapSession(data) : null;
  }

  async findSessionByRefreshHash(
    hash: string,
  ): Promise<AuthSessionRecord | null> {
    const { data, error } = await this.client()
      .from("auth_sessions")
      .select("*")
      .eq("refresh_token_hash", hash)
      .maybeSingle();
    if (error) throw new Error(`refresh lookup failed: ${error.message}`);
    return data ? mapSession(data) : null;
  }

  async markSessionReauthenticated(id: string): Promise<void> {
    const { error } = await this.client()
      .from("auth_sessions")
      .update({ last_reauthenticated_at: new Date().toISOString() })
      .eq("id", id)
      .is("revoked_at", null);
    if (error)
      throw new Error(
        `session reauthentication update failed: ${error.message}`,
      );
  }

  async touchSession(id: string): Promise<void> {
    const { error } = await this.client()
      .from("auth_sessions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", id)
      .is("revoked_at", null);
    if (error)
      throw new Error(`session activity update failed: ${error.message}`);
  }

  async listSessions(userId: string): Promise<AuthSessionRecord[]> {
    const { data, error } = await this.client()
      .from("auth_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });
    if (error) throw new Error(`session list failed: ${error.message}`);
    return (data || []).map(mapSession);
  }

  async revokeSession(id: string, reason: string): Promise<void> {
    const { error } = await this.client()
      .from("auth_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq("id", id)
      .is("revoked_at", null);
    if (error) throw new Error(`session revocation failed: ${error.message}`);
  }

  async revokeSessionFamily(familyId: string, reason: string): Promise<void> {
    const { error } = await this.client()
      .from("auth_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq("family_id", familyId)
      .is("revoked_at", null);
    if (error)
      throw new Error(`session family revocation failed: ${error.message}`);
  }

  async revokeSessions(
    userId: string,
    reason: string,
    exceptId?: string,
  ): Promise<void> {
    let query = this.client()
      .from("auth_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if (exceptId) query = query.neq("id", exceptId);
    const { error } = await query;
    if (error) throw new Error(`session revocation failed: ${error.message}`);
  }

  async createOAuthFlow(input: Omit<OAuthFlowRecord, "id">): Promise<void> {
    const { error } = await this.client()
      .from("oauth_authorization_flows")
      .insert({
        state_hash: input.stateHash,
        provider: input.provider,
        intent: input.intent,
        user_id: input.userId,
        session_id: input.sessionId,
        return_to: input.returnTo,
        client_kind: input.clientKind,
        requested_account_type: input.requestedAccountType,
        nonce_hash: input.nonceHash,
        code_verifier: input.codeVerifier,
        expires_at: input.expiresAt,
      });
    if (error) throw new Error(`OAuth state creation failed: ${error.message}`);
  }

  async consumeOAuthFlow(stateHash: string): Promise<OAuthFlowRecord | null> {
    const { data, error } = await this.client().rpc(
      "consume_oauth_authorization_flow",
      { p_state_hash: stateHash },
    );
    if (error)
      throw new Error(`OAuth state consumption failed: ${error.message}`);
    return data?.[0] ? mapFlow(data[0]) : null;
  }

  async createNativeExchange(
    input: Omit<NativeExchangeRecord, "id">,
  ): Promise<void> {
    const { error } = await this.client()
      .from("oauth_native_exchanges")
      .insert({
        code_hash: input.codeHash,
        user_id: input.userId,
        provider: input.provider,
        return_to: input.returnTo,
        expires_at: input.expiresAt,
      });
    if (error)
      throw new Error(`native exchange creation failed: ${error.message}`);
  }

  async consumeNativeExchange(
    codeHash: string,
  ): Promise<NativeExchangeRecord | null> {
    const { data, error } = await this.client().rpc(
      "consume_oauth_native_exchange",
      { p_code_hash: codeHash },
    );
    if (error) throw new Error(`native exchange failed: ${error.message}`);
    return data?.[0] ? mapExchange(data[0]) : null;
  }

  async createPendingRegistration(
    input: Omit<PendingOAuthRegistration, "id">,
  ): Promise<void> {
    // A repeat callback for the same validated provider identity replaces only
    // its unconsumed, short-lived completion attempt.
    await this.client()
      .from("oauth_pending_registrations")
      .delete()
      .eq("provider", input.provider)
      .eq("provider_subject", input.providerSubject)
      .is("consumed_at", null);
    const { error } = await this.client()
      .from("oauth_pending_registrations")
      .insert({
        handle_hash: input.handleHash,
        provider: input.provider,
        provider_subject: input.providerSubject,
        provider_email: input.providerEmail,
        provider_email_verified: input.providerEmailVerified,
        provider_display_name: input.providerDisplayName,
        provider_avatar_url: input.providerAvatarUrl,
        requested_account_type: input.requestedAccountType,
        client_kind: input.clientKind,
        return_to: input.returnTo,
        expires_at: input.expiresAt,
      });
    if (error)
      throw new Error(`pending OAuth registration failed: ${error.message}`);
  }

  async consumePendingRegistration(
    handleHash: string,
  ): Promise<PendingOAuthRegistration | null> {
    const { data, error } = await this.client().rpc(
      "consume_oauth_pending_registration",
      { p_handle_hash: handleHash },
    );
    if (error)
      throw new Error(
        `pending OAuth registration consumption failed: ${error.message}`,
      );
    return data?.[0] ? mapPending(data[0]) : null;
  }

  async createActionToken(
    input: Omit<AuthActionTokenRecord, "id">,
  ): Promise<void> {
    const { error } = await this.client().from("auth_action_tokens").insert({
      user_id: input.userId,
      purpose: input.purpose,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt,
    });
    if (error)
      throw new Error(`auth action token creation failed: ${error.message}`);
  }

  async consumeActionToken(
    tokenHash: string,
    purpose: AuthActionTokenRecord["purpose"],
  ): Promise<AuthActionTokenRecord | null> {
    const { data, error } = await this.client().rpc(
      "consume_auth_action_token",
      { p_token_hash: tokenHash, p_purpose: purpose },
    );
    if (error)
      throw new Error(`auth action token consumption failed: ${error.message}`);
    return data?.[0] ? mapActionToken(data[0]) : null;
  }

  async consumeRateLimit(
    keyHash: string,
    action: string,
    limit: number,
    windowSeconds: number,
    lockSeconds: number,
  ): Promise<RateLimitDecision> {
    const { data, error } = await this.client().rpc("consume_auth_rate_limit", {
      p_key_hash: keyHash,
      p_action: action,
      p_limit: limit,
      p_window_seconds: windowSeconds,
      p_lock_seconds: lockSeconds,
    });
    if (error || !data?.[0])
      throw new Error(
        `rate limit failed: ${error?.message || "missing result"}`,
      );
    return {
      allowed: Boolean(data[0].allowed),
      retryAfterSeconds: Number(data[0].retry_after_seconds || 0),
    };
  }

  async clearRateLimit(keyHash: string, action: string): Promise<void> {
    const { error } = await this.client()
      .from("auth_rate_limits")
      .delete()
      .eq("key_hash", keyHash)
      .eq("action", action);
    if (error) throw new Error(`rate limit reset failed: ${error.message}`);
  }

  async recordSecurityEvent(input: SecurityEventInput): Promise<void> {
    const { error } = await this.client()
      .from("auth_audit_events")
      .insert({
        user_id: input.userId || null,
        event_type: input.eventType,
        provider: input.provider || null,
        failure_reason: input.failureReason || null,
        ip_prefix: input.ipPrefix || null,
        user_agent_family: input.userAgentFamily || null,
        metadata: input.metadata || {},
      });
    if (error) throw new Error(`security event write failed: ${error.message}`);
  }
}

export const authRepository: IAuthRepository =
  config.dataMode === "database"
    ? new PostgresAuthRepository()
    : new DemoAuthRepository();
