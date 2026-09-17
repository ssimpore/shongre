import {
  PublicSellerProfile,
  UserProfile,
  UserRole,
} from "../../../shared/types/index.js";
import { toPublicSellerProfile } from "../../../shared/public-projections.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";
import { identifierColumn } from "./repository-identifier.js";
import type { DemoListingRepository } from "./listing.repository.js";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import { requireMarketCode } from "../../../shared/market/market-code.js";
import {
  CUSTOMER_MARKETPLACE_CAPABILITIES,
  type Capability,
  type StaffRole,
  type StaffStatus,
} from "@shongre/contracts/access-control";
import type { ProfessionalAccountUpgrade } from "@shongre/contracts";
import { AppError } from "../../../shared/errors/app-error.js";

/**
 * Credentials are stored separately from UserProfile on purpose.
 *
 * UserProfile is the DTO returned by /auth/me, /users/:id and the admin user
 * list. Keeping the password hash off that type makes it structurally
 * impossible for a hash to leak through an existing serialization path — there
 * is no field to accidentally forget to strip.
 */
export interface UserCredential {
  userId: string;
  passwordHash: string;
}

export interface IUserRepository {
  findById(id: string): Promise<UserProfile | null>;
  /**
   * Resolves the public projection by account id or public slug. Persisted
   * storefront slugs resolve to their publicly visible professional owner.
   */
  findPublicById(idOrSlug: string): Promise<PublicSellerProfile | null>;
  listPublicProfessionals(marketCode: string): Promise<PublicSellerProfile[]>;
  findByEmail(email: string): Promise<UserProfile | null>;
  findAuthUserId(userId: string): Promise<string | null>;
  linkAuthUserId(userId: string, authUserId: string): Promise<void>;
  save(user: UserProfile): Promise<UserProfile>;
  update(id: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  /**
   * Declares an absence and pauses the seller's active publications until it
   * ends (00144). The window is bounded to 90 days by the database.
   */
  setAway(input: {
    userId: string;
    until: string;
    message?: string;
  }): Promise<{ pausedPublications: number }>;
  /** Ends the absence now and resumes what it paused. */
  clearAway(userId: string): Promise<{ resumedPublications: number }>;
  /** The worker's pass: sellers whose absence has ended come back. */
  resumeReturnedSellers(
    limit: number,
  ): Promise<Array<{ userId: string; resumedPublications: number }>>;
  upgradeToProfessional(
    userId: string,
    input: ProfessionalAccountUpgrade,
  ): Promise<UserProfile>;
  updateStaffAccess(input: {
    userId: string;
    status: Exclude<StaffStatus, "none">;
    staffRole: StaffRole;
    actorId: string;
    reason: string;
  }): Promise<UserProfile>;
  updateCapabilityOverrides(input: {
    userId: string;
    actorId: string;
    customPermissions: Capability[];
    revokedPermissions: Capability[];
    reason: string;
    expectedVersion: number;
    requestId: string;
  }): Promise<UserProfile>;
  getAll(): Promise<UserProfile[]>;
  findCredentialByUserId(userId: string): Promise<UserCredential | null>;
  saveCredential(credential: UserCredential): Promise<void>;
  deleteCredential(userId: string): Promise<void>;
  anonymize(userId: string, reason?: string): Promise<UserProfile>;
}

export const CANONICAL_DEMO_USERS: Record<string, UserProfile> = {
  "thomas.laurent@example.fr": {
    id: "user_thomas",
    slug: "thomas-laurent",
    email: "thomas.laurent@example.fr",
    name: "Thomas Laurent",
    accountType: "individual",
    primaryRole: "individual_buyer",
    role: "individual_buyer",
    status: "active",
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    city: "Paris",
    postalCode: "75011",
    department: "75 - Paris",
    region: "Île-de-France",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 4.9,
    reviewCount: 14,
    responseRatePercent: 98,
    responseTimeText: "en moins d'une heure",
  },
  "camille.martin@example.fr": {
    id: "user_camille",
    slug: "camille-martin",
    email: "camille.martin@example.fr",
    name: "Camille Martin",
    accountType: "individual",
    primaryRole: "individual_seller",
    role: "individual_seller",
    sellerType: "individual",
    status: "active",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    city: "Lyon",
    postalCode: "69002",
    department: "69 - Rhône",
    region: "Auvergne-Rhône-Alpes",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 4.95,
    reviewCount: 42,
    responseRatePercent: 100,
    responseTimeText: "en quelques minutes",
  },
  "contact@atelier-nordique.fr": {
    id: "user_pro_atelier",
    slug: "atelier-nordique",
    email: "contact@atelier-nordique.fr",
    name: "Atelier Nordique SAS",
    accountType: "professional",
    primaryRole: "pro_seller",
    role: "pro_seller",
    sellerType: "pro",
    status: "active",
    avatarUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
    city: "Lyon",
    postalCode: "69002",
    department: "69 - Rhône",
    region: "Auvergne-Rhône-Alpes",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 4.9,
    reviewCount: 128,
    responseRatePercent: 99,
    responseTimeText: "en moins d’une heure",
  },
  "recrutement@technova.fr": {
    id: "user_employment_recruiter",
    slug: "technova-recrutement",
    email: "recrutement@technova.fr",
    name: "TechNova Recrutement",
    accountType: "professional",
    professionalVertical: "employment",
    primaryRole: "pro_seller",
    role: "pro_seller",
    sellerType: "pro",
    status: "active",
    city: "Lyon",
    postalCode: "69007",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 5,
    reviewCount: 0,
    responseRatePercent: 100,
  },
  "moderation@shongre.com": {
    id: "user_moderator",
    slug: "moderation-shongre",
    email: "moderation@shongre.com",
    name: "Modération Shongre",
    accountType: "individual",
    staffStatus: "active",
    staffRole: "moderator",
    primaryRole: "individual_buyer",
    role: "individual_buyer",
    status: "active",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 5,
    reviewCount: 0,
    responseRatePercent: 100,
  },
  "trust@shongre.com": {
    id: "user_trust_safety",
    slug: "trust-safety-shongre",
    email: "trust@shongre.com",
    name: "Trust & Safety Shongre",
    accountType: "individual",
    staffStatus: "active",
    staffRole: "trust_safety",
    primaryRole: "individual_buyer",
    role: "individual_buyer",
    status: "active",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 5,
    reviewCount: 0,
    responseRatePercent: 100,
  },
  "compliance@shongre.com": {
    id: "user_compliance",
    slug: "compliance-shongre",
    email: "compliance@shongre.com",
    name: "Conformité Shongre",
    accountType: "individual",
    staffStatus: "active",
    staffRole: "compliance",
    primaryRole: "individual_buyer",
    role: "individual_buyer",
    status: "active",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 5,
    reviewCount: 0,
    responseRatePercent: 100,
  },
  "finance@shongre.com": {
    id: "user_finance",
    slug: "finance-shongre",
    email: "finance@shongre.com",
    name: "Finance Shongre",
    accountType: "individual",
    staffStatus: "active",
    staffRole: "finance",
    primaryRole: "individual_buyer",
    role: "individual_buyer",
    status: "active",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 5,
    reviewCount: 0,
    responseRatePercent: 100,
  },
  "admin@shongre.com": {
    id: "user_admin",
    slug: "admin-shongre",
    email: "admin@shongre.com",
    name: "Administrateur Shongre",
    accountType: "individual",
    staffStatus: "active",
    staffRole: "admin",
    primaryRole: "individual_buyer",
    role: "individual_buyer",
    status: "active",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    city: "Paris",
    postalCode: "75008",
    department: "75 - Paris",
    region: "Île-de-France",
    country: "FR",
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 5.0,
    reviewCount: 0,
    responseRatePercent: 100,
  },
};

export class DemoUserRepository implements IUserRepository {
  private users: Map<string, UserProfile> = new Map();
  /** userId -> password hash. Seeded demo accounts get hashes from the bootstrap step. */
  private credentials: Map<string, string> = new Map();

  constructor(
    initialUsers: Record<string, UserProfile> = CANONICAL_DEMO_USERS,
    /** The fixture's listings, so an absence pauses their publications too. */
    private readonly listings?: DemoListingRepository,
  ) {
    this.reset(initialUsers);
  }

  reset(initialUsers: Record<string, UserProfile> = CANONICAL_DEMO_USERS) {
    this.users.clear();
    this.credentials.clear();
    Object.values(initialUsers).forEach((u) => this.users.set(u.id, { ...u }));
  }

  async findById(id: string): Promise<UserProfile | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findPublicById(idOrSlug: string): Promise<PublicSellerProfile | null> {
    const user =
      (await this.findById(idOrSlug)) ??
      [...this.users.values()].find(
        (candidate) => candidate.slug === idOrSlug,
      ) ??
      null;
    return user ? toPublicSellerProfile(user) : null;
  }

  async listPublicProfessionals(
    marketCode: string,
  ): Promise<PublicSellerProfile[]> {
    const normalized = marketCode.toUpperCase();
    return (
      [...this.users.values()]
        .filter(
          (user) =>
            user.accountType === "professional" &&
            user.status === "active" &&
            // Absent means "no Staff membership", which is what the
            // `public_profiles` view enforces in database mode. Treating only the
            // explicit "none" as non-Staff would diverge from the query.
            (user.staffStatus ?? "none") === "none" &&
            user.country.toUpperCase() === normalized,
        )
        .sort(
          (left, right) =>
            right.reviewCount - left.reviewCount ||
            left.id.localeCompare(right.id),
        )
        .slice(
          0,
          SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.discoveryCandidateLimit,
        )
        .map((user) => toPublicSellerProfile(user))
        // The projection applies its own visibility rules and may withhold a row.
        .filter((profile): profile is PublicSellerProfile => profile !== null)
    );
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const lower = (email || "").toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === lower) {
        return { ...u };
      }
    }
    return null;
  }

  async findAuthUserId(userId: string): Promise<string | null> {
    return this.users.has(userId) ? userId : null;
  }

  async linkAuthUserId(userId: string, _authUserId: string): Promise<void> {
    if (!this.users.has(userId)) {
      throw new Error(`User with id ${userId} not found in Demo repository`);
    }
  }

  async save(user: UserProfile): Promise<UserProfile> {
    this.users.set(user.id, { ...user });
    return { ...user };
  }

  async update(
    id: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User with id ${id} not found in Demo repository`);
    }
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    return { ...updated };
  }

  async setAway(input: {
    userId: string;
    until: string;
    message?: string;
  }): Promise<{ pausedPublications: number }> {
    const untilMs = Date.parse(input.until);
    if (
      !Number.isFinite(untilMs) ||
      untilMs <= Date.now() ||
      untilMs > Date.now() + 90 * 86_400_000
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La date de retour doit être comprise entre demain et 90 jours.",
      });
    }
    const existing = this.users.get(input.userId);
    if (!existing) {
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    }
    const message = input.message?.trim() || undefined;
    this.users.set(input.userId, {
      ...existing,
      awayUntil: new Date(untilMs).toISOString(),
      awayMessage: message,
    });
    return {
      pausedPublications:
        this.listings?.setSellerPublicationsPaused(input.userId, true) ?? 0,
    };
  }

  async clearAway(userId: string): Promise<{ resumedPublications: number }> {
    const existing = this.users.get(userId);
    if (!existing) {
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    }
    this.users.set(userId, {
      ...existing,
      awayUntil: undefined,
      awayMessage: undefined,
    });
    return {
      resumedPublications:
        this.listings?.setSellerPublicationsPaused(userId, false) ?? 0,
    };
  }

  async resumeReturnedSellers(
    limit: number,
  ): Promise<Array<{ userId: string; resumedPublications: number }>> {
    const now = Date.now();
    const returned: Array<{ userId: string; resumedPublications: number }> = [];
    for (const user of this.users.values()) {
      if (returned.length >= limit) break;
      if (!user.awayUntil || Date.parse(user.awayUntil) > now) continue;
      const { resumedPublications } = await this.clearAway(user.id);
      returned.push({ userId: user.id, resumedPublications });
    }
    return returned;
  }

  async upgradeToProfessional(
    userId: string,
    input: ProfessionalAccountUpgrade,
  ): Promise<UserProfile> {
    const existing = this.users.get(userId);
    if (!existing) {
      throw new Error(`User with id ${userId} not found in Demo repository`);
    }
    const updated: UserProfile = {
      ...existing,
      accountType: "professional",
      primaryRole: "pro_seller",
      role: "pro_seller",
      sellerType: "pro",
      professionalVertical: existing.professionalVertical ?? "generic",
      isBusinessVerified: false,
      phone: input.phone ?? existing.phone,
    };
    this.users.set(userId, updated);
    return { ...updated };
  }

  async updateStaffAccess(input: {
    userId: string;
    status: Exclude<StaffStatus, "none">;
    staffRole: StaffRole;
    actorId: string;
    reason: string;
  }): Promise<UserProfile> {
    const existing = this.users.get(input.userId);
    if (!existing) {
      throw new Error(
        `User with id ${input.userId} not found in Demo repository`,
      );
    }
    const updated: UserProfile = {
      ...existing,
      staffStatus: input.status,
      staffRole: input.staffRole,
      customPermissions: (existing.customPermissions ?? []).filter(
        (capability) =>
          !CUSTOMER_MARKETPLACE_CAPABILITIES.includes(
            capability as (typeof CUSTOMER_MARKETPLACE_CAPABILITIES)[number],
          ),
      ),
      capabilityOverrideVersion: (existing.customPermissions ?? []).some(
        (capability) =>
          CUSTOMER_MARKETPLACE_CAPABILITIES.includes(
            capability as (typeof CUSTOMER_MARKETPLACE_CAPABILITIES)[number],
          ),
      )
        ? (existing.capabilityOverrideVersion ?? 1) + 1
        : (existing.capabilityOverrideVersion ?? 1),
    };
    this.users.set(input.userId, updated);
    return { ...updated };
  }

  async updateCapabilityOverrides(input: {
    userId: string;
    actorId: string;
    customPermissions: Capability[];
    revokedPermissions: Capability[];
    reason: string;
    expectedVersion: number;
    requestId: string;
  }): Promise<UserProfile> {
    const existing = this.users.get(input.userId);
    if (!existing) {
      throw new Error(
        `User with id ${input.userId} not found in Demo repository`,
      );
    }
    const version = existing.capabilityOverrideVersion ?? 1;
    if (version !== input.expectedVersion) {
      throw new AppError({
        code: "CONFLICT",
        message: "Les permissions ont été modifiées par une autre session.",
      });
    }
    const updated: UserProfile = {
      ...existing,
      customPermissions: [...input.customPermissions],
      revokedPermissions: [...input.revokedPermissions],
      capabilityOverrideVersion: version + 1,
    };
    this.users.set(input.userId, updated);
    return { ...updated };
  }

  async getAll(): Promise<UserProfile[]> {
    return Array.from(this.users.values()).map((u) => ({ ...u }));
  }

  async findCredentialByUserId(userId: string): Promise<UserCredential | null> {
    const passwordHash = this.credentials.get(userId);
    return passwordHash ? { userId, passwordHash } : null;
  }

  async saveCredential(credential: UserCredential): Promise<void> {
    this.credentials.set(credential.userId, credential.passwordHash);
  }

  async deleteCredential(userId: string): Promise<void> {
    this.credentials.delete(userId);
  }

  async anonymize(userId: string): Promise<UserProfile> {
    const existing = this.users.get(userId);
    if (!existing)
      throw new Error(`User with id ${userId} not found in Demo repository`);
    const anonymized: UserProfile = {
      ...existing,
      slug: `deleted-${userId}`,
      email: `deleted+${userId}@anonymized.invalid`,
      name: "Utilisateur supprimé",
      status: "deleted",
      avatarUrl: undefined,
      phone: undefined,
      city: undefined,
      postalCode: undefined,
      department: undefined,
      region: undefined,
      bio: undefined,
      isVerified: false,
      isIdentityVerified: false,
      isPhoneVerified: false,
      isEmailVerified: false,
      isBusinessVerified: false,
    };
    this.users.set(userId, anonymized);
    this.credentials.delete(userId);
    return { ...anonymized };
  }
}

export class PostgresUserRepository implements IUserRepository {
  private mapRowToUserProfile(row: any, staffMembership?: any): UserProfile {
    const legacyStaffAccount = ["internal", "staff"].includes(
      String(row.account_type),
    );
    return {
      id: row.id,
      slug: row.slug,
      email: row.email,
      name: row.name,
      accountType:
        row.account_type === "professional" ? "professional" : "individual",
      professionalVertical: row.professional_vertical || undefined,
      staffStatus:
        staffMembership?.status || (legacyStaffAccount ? "active" : "none"),
      staffRole: staffMembership?.staff_role || row.staff_role || undefined,
      primaryRole: legacyStaffAccount ? "individual_buyer" : row.primary_role,
      role: (legacyStaffAccount
        ? "individual_buyer"
        : row.primary_role || "individual_buyer") as UserRole,
      sellerType: row.account_type === "professional" ? "pro" : "individual",
      status: row.status,
      customPermissions: row.custom_permissions || [],
      revokedPermissions: row.revoked_permissions || [],
      capabilityOverrideVersion: Number(row.capability_override_version || 1),
      avatarUrl: row.avatar_url || undefined,
      phone: row.phone || undefined,
      city: row.city || undefined,
      postalCode: row.postal_code || undefined,
      department: row.department || undefined,
      region: row.region || undefined,
      country: requireMarketCode(row.country),
      bio: row.bio || undefined,
      isVerified: Boolean(row.is_verified),
      isIdentityVerified: Boolean(row.is_identity_verified),
      isPhoneVerified: Boolean(row.is_phone_verified),
      isEmailVerified: Boolean(row.is_email_verified),
      isBusinessVerified: Boolean(row.is_business_verified),
      rating: Number(row.rating || 0),
      reviewCount: Number(row.review_count || 0),
      responseRatePercent: Number(row.response_rate_percent || 100),
      responseTimeText: row.response_time_text || undefined,
      awayUntil: row.away_until || undefined,
      awayMessage: row.away_message || undefined,
      createdAt: row.created_at,
    };
  }

  async findById(id: string): Promise<UserProfile | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) databaseFailure("users.findById", error);
      if (!data) return null;
      const membership = await this.findStaffMembership(id);
      return this.mapRowToUserProfile(data, membership);
    } catch (error) {
      databaseFailure("users.findById", error);
    }
  }

  /** The view already excludes suspended accounts and Staff memberships. */
  private publicProfileSelect() {
    return (
      getSupabaseAdminClient().from("public_profiles" as any) as any
    ).select(
      "id, slug, name, avatar_url, city, country, bio, account_family, is_verified, is_business_verified, rating, review_count, response_rate_percent, response_time_text, away_until, away_message, created_at",
    );
  }

  private mapPublicProfile(data: any): PublicSellerProfile {
    const accountType =
      data.account_family === "professional" ? "professional" : "individual";
    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      accountType,
      sellerType: accountType === "professional" ? "pro" : "individual",
      avatarUrl: data.avatar_url || undefined,
      city: data.city || undefined,
      country: requireMarketCode(data.country),
      bio: data.bio || undefined,
      isVerified: Boolean(data.is_verified),
      isBusinessVerified: Boolean(data.is_business_verified),
      rating: Number(data.rating || 0),
      reviewCount: Number(data.review_count || 0),
      responseRatePercent: Number(data.response_rate_percent || 0),
      responseTimeText: data.response_time_text || undefined,
      awayUntil: data.away_until || undefined,
      awayMessage: data.away_message || undefined,
      createdAt: data.created_at || undefined,
    };
  }

  async findPublicById(idOrSlug: string): Promise<PublicSellerProfile | null> {
    try {
      const { data, error } = await (this.publicProfileSelect()
        // Public seller routes address profiles by slug; comparing one against
        // the `uuid` column raises a type error rather than returning no row.
        .eq(identifierColumn(idOrSlug), idOrSlug)
        .maybeSingle() as any);
      if (error) databaseFailure("users.findPublicById", error);
      if (data) return this.mapPublicProfile(data);
      if (identifierColumn(idOrSlug) === "id") return null;

      const { data: store, error: storeError } = await getSupabaseAdminClient()
        .from("stores")
        .select("organizations!inner(owner_id)")
        .eq("slug", idOrSlug)
        .eq("is_active", true)
        .eq("organizations.status", "active")
        .maybeSingle();
      if (storeError) databaseFailure("users.findPublicById", storeError);
      if (!store) return null;

      // Resolve through the public view so a storefront cannot expose a
      // suspended account or an owner with a retained Staff membership.
      const { data: owner, error: ownerError } =
        await this.publicProfileSelect()
          .eq("id", store.organizations.owner_id)
          .eq("account_family", "professional")
          .maybeSingle();
      if (ownerError) databaseFailure("users.findPublicById", ownerError);
      return owner ? this.mapPublicProfile(owner) : null;
    } catch (error) {
      databaseFailure("users.findPublicById", error);
    }
  }

  async listPublicProfessionals(
    marketCode: string,
  ): Promise<PublicSellerProfile[]> {
    try {
      const { data, error } = await (this.publicProfileSelect()
        .eq("account_family", "professional")
        .eq("country", requireMarketCode(marketCode))
        .order("review_count", { ascending: false })
        .order("id", { ascending: true })
        .limit(
          SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.discoveryCandidateLimit,
        ) as any);
      if (error) databaseFailure("users.listPublicProfessionals", error);
      return (data || []).map((row: any) => this.mapPublicProfile(row));
    } catch (error) {
      databaseFailure("users.listPublicProfessionals", error);
    }
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();
      if (error) databaseFailure("users.findByEmail", error);
      if (!data) return null;
      const membership = await this.findStaffMembership(data.id);
      return this.mapRowToUserProfile(data, membership);
    } catch (error) {
      databaseFailure("users.findByEmail", error);
    }
  }

  async findAuthUserId(userId: string): Promise<string | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("auth_user_id")
        .eq("id", userId)
        .maybeSingle();
      if (error) databaseFailure("users.findAuthUserId", error);
      return data?.auth_user_id ?? null;
    } catch (error) {
      databaseFailure("users.findAuthUserId", error);
    }
  }

  async linkAuthUserId(userId: string, authUserId: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        auth_user_id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) databaseFailure("users.linkAuthUserId", error);
  }

  async save(user: UserProfile): Promise<UserProfile> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: user.id.includes("-") ? user.id : undefined,
      slug: user.slug,
      email: user.email.toLowerCase(),
      name: user.name,
      account_type: user.accountType,
      professional_vertical: user.professionalVertical || null,
      custom_permissions: user.customPermissions || [],
      revoked_permissions: user.revokedPermissions || [],
      primary_role: user.primaryRole || user.role,
      status: user.status,
      avatar_url: user.avatarUrl || null,
      phone: user.phone || null,
      city: user.city || null,
      postal_code: user.postalCode || null,
      department: user.department || null,
      region: user.region || null,
      country: user.country,
      bio: user.bio || null,
      is_verified: user.isVerified,
      is_identity_verified: user.isIdentityVerified,
      is_phone_verified: user.isPhoneVerified,
      is_email_verified: user.isEmailVerified,
      is_business_verified: Boolean(user.isBusinessVerified),
      rating: user.rating,
      review_count: user.reviewCount,
      response_rate_percent: user.responseRatePercent,
      response_time_text: user.responseTimeText || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase
      .from("profiles")
      .upsert(payload as any)
      .select()
      .single() as any);
    if (error || !data) {
      databaseFailure("users.save", error);
    }
    return this.mapRowToUserProfile(data);
  }

  async update(
    id: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const supabase = getSupabaseAdminClient();
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.postalCode !== undefined)
      payload.postal_code = updates.postalCode;
    if (updates.department !== undefined)
      payload.department = updates.department;
    if (updates.region !== undefined) payload.region = updates.region;
    if (updates.country !== undefined) payload.country = updates.country;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.accountType !== undefined)
      payload.account_type = updates.accountType;
    if (updates.professionalVertical !== undefined)
      payload.professional_vertical = updates.professionalVertical;
    if (updates.customPermissions !== undefined)
      payload.custom_permissions = updates.customPermissions;
    if (updates.revokedPermissions !== undefined)
      payload.revoked_permissions = updates.revokedPermissions;
    if (updates.primaryRole !== undefined || updates.role !== undefined)
      payload.primary_role = updates.primaryRole || updates.role;
    if (updates.isVerified !== undefined)
      payload.is_verified = updates.isVerified;
    if (updates.isIdentityVerified !== undefined)
      payload.is_identity_verified = updates.isIdentityVerified;
    if (updates.isPhoneVerified !== undefined)
      payload.is_phone_verified = updates.isPhoneVerified;
    if (updates.isEmailVerified !== undefined)
      payload.is_email_verified = updates.isEmailVerified;
    if (updates.isBusinessVerified !== undefined)
      payload.is_business_verified = updates.isBusinessVerified;

    const { data, error } = await ((supabase.from("profiles" as any) as any)
      .update(payload)
      .eq("id", id)
      .select()
      .single() as any);
    if (error || !data) {
      databaseFailure("users.update", error);
    }
    const updated = await this.findById(data.id);
    if (!updated) {
      databaseFailure("users.update", new Error("Updated profile disappeared"));
    }
    if (
      updates.accountType !== undefined ||
      updates.primaryRole !== undefined ||
      updates.role !== undefined
    ) {
      await this.syncAuthRoleMetadata(updated);
    }
    return updated;
  }

  async setAway(input: {
    userId: string;
    until: string;
    message?: string;
  }): Promise<{ pausedPublications: number }> {
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "set_seller_away",
      {
        p_user_id: input.userId,
        p_until: input.until,
        p_message: input.message ?? null,
      },
    );
    if (error?.code === "22023")
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La date de retour doit être comprise entre demain et 90 jours.",
      });
    if (error?.code === "P0002")
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    if (error) databaseFailure("users.setAway", error);
    return { pausedPublications: Number(data || 0) };
  }

  async clearAway(userId: string): Promise<{ resumedPublications: number }> {
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "clear_seller_away",
      { p_user_id: userId },
    );
    if (error?.code === "P0002")
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    if (error) databaseFailure("users.clearAway", error);
    return { resumedPublications: Number(data || 0) };
  }

  async resumeReturnedSellers(
    limit: number,
  ): Promise<Array<{ userId: string; resumedPublications: number }>> {
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "resume_returned_sellers",
      { p_limit: limit },
    );
    if (error) databaseFailure("users.resumeReturnedSellers", error);
    return ((data || []) as any[]).map((row) => ({
      userId: String(row.user_id),
      resumedPublications: Number(row.resumed_publications || 0),
    }));
  }

  async upgradeToProfessional(
    userId: string,
    input: ProfessionalAccountUpgrade,
  ): Promise<UserProfile> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc(
      "upgrade_account_to_professional",
      {
        p_user_id: userId,
        p_company_name: input.companyName,
        p_business_identifier: input.businessIdentifier,
        p_legal_form: input.legalForm,
        p_vat_number: (input.vatNumber ?? null) as unknown as string,
        p_business_address: input.businessAddress,
        p_phone: (input.phone ?? null) as unknown as string,
      },
    );
    if (error?.code === "P0002") {
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    }
    if (error?.code === "42501") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Ce compte ne peut pas devenir un compte Professionnel.",
      });
    }
    if (error?.code === "22023") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Complétez votre adresse et vérifiez les informations de l’entreprise.",
      });
    }
    if (error || !data?.length) {
      databaseFailure("users.upgradeToProfessional", error);
    }

    const upgraded = this.mapRowToUserProfile(data[0]);
    await this.syncAuthRoleMetadata(upgraded);
    return upgraded;
  }

  async updateStaffAccess(input: {
    userId: string;
    status: Exclude<StaffStatus, "none">;
    staffRole: StaffRole;
    actorId: string;
    reason: string;
  }): Promise<UserProfile> {
    const supabase = getSupabaseAdminClient();
    const { error } = await ((
      supabase.from("staff_memberships" as any) as any
    ).upsert(
      {
        user_id: input.userId,
        status: input.status,
        staff_role: input.staffRole,
        updated_by: input.actorId,
        change_reason: input.reason,
      },
      { onConflict: "user_id" },
    ) as any);
    if (error?.code === "42501") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Cette modification d’accès Staff n’est pas autorisée.",
      });
    }
    if (error?.code === "23514") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "L’accès Staff a changé entre-temps ou violerait une règle de gouvernance.",
      });
    }
    if (error) databaseFailure("users.updateStaffAccess", error);
    const updated = await this.findById(input.userId);
    if (!updated)
      databaseFailure(
        "users.updateStaffAccess",
        new Error("Staff target disappeared"),
      );
    await this.syncAuthRoleMetadata(updated);
    return updated;
  }

  async updateCapabilityOverrides(input: {
    userId: string;
    actorId: string;
    customPermissions: Capability[];
    revokedPermissions: Capability[];
    reason: string;
    expectedVersion: number;
    requestId: string;
  }): Promise<UserProfile> {
    const supabase = getSupabaseAdminClient();
    const { error } = await (supabase.rpc as any)(
      "update_profile_capability_overrides",
      {
        p_target_user_id: input.userId,
        p_actor_id: input.actorId,
        p_custom_permissions: input.customPermissions,
        p_revoked_permissions: input.revokedPermissions,
        p_reason: input.reason,
        p_expected_version: input.expectedVersion,
        p_request_id: input.requestId || null,
      },
    );
    if (error?.code === "42501") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Cette modification de permissions n’est pas autorisée.",
      });
    }
    if (["23514", "40001"].includes(error?.code)) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Les permissions ont changé entre-temps ou la modification viole une règle de gouvernance.",
      });
    }
    if (error?.code === "P0002") {
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    }
    if (error) databaseFailure("users.updateCapabilityOverrides", error);
    const updated = await this.findById(input.userId);
    if (!updated) {
      databaseFailure(
        "users.updateCapabilityOverrides",
        new Error("Capability target disappeared"),
      );
    }
    return updated;
  }

  async getAll(): Promise<UserProfile[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data) databaseFailure("users.getAll", error);
      const memberships = await this.findStaffMemberships(
        data.map((row) => row.id),
      );
      return data.map((row) =>
        this.mapRowToUserProfile(row, memberships.get(row.id)),
      );
    } catch (error) {
      databaseFailure("users.getAll", error);
    }
  }

  private async findStaffMembership(userId: string): Promise<any | null> {
    const memberships = await this.findStaffMemberships([userId]);
    return memberships.get(userId) ?? null;
  }

  private async findStaffMemberships(
    userIds: readonly string[],
  ): Promise<Map<string, any>> {
    if (userIds.length === 0) return new Map();
    const supabase = getSupabaseAdminClient();
    const { data, error } = await ((
      supabase.from("staff_memberships" as any) as any
    )
      .select("user_id, status, staff_role")
      .in("user_id", [...userIds]) as any);
    if (error) databaseFailure("users.findStaffMemberships", error);
    return new Map((data || []).map((row: any) => [row.user_id, row]));
  }

  private async syncAuthRoleMetadata(user: UserProfile): Promise<void> {
    const authUserId = await this.findAuthUserId(user.id);
    if (!authUserId) return;
    const admin = getSupabaseAdminClient();
    const current = await admin.auth.admin.getUserById(authUserId);
    if (current.error || !current.data.user) {
      databaseFailure("users.syncAuthRoleMetadata", current.error);
    }
    const synchronized = await admin.auth.admin.updateUserById(authUserId, {
      app_metadata: {
        ...current.data.user.app_metadata,
        shongre_account_type: user.accountType,
        shongre_primary_role: user.primaryRole || user.role,
        shongre_staff_status: user.staffStatus ?? "none",
        shongre_staff_role: user.staffRole ?? null,
      },
    });
    if (synchronized.error) {
      databaseFailure("users.syncAuthRoleMetadata", synchronized.error);
    }
  }

  async findCredentialByUserId(userId: string): Promise<UserCredential | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await ((
        supabase.from("user_credentials" as any) as any
      )
        .select("user_id, password_hash")
        .eq("user_id", userId)
        .maybeSingle() as any);
      if (error) databaseFailure("users.findCredentialByUserId", error);
      if (!data) return null;
      return { userId: data.user_id, passwordHash: data.password_hash };
    } catch (error) {
      databaseFailure("users.findCredentialByUserId", error);
    }
  }

  async saveCredential(credential: UserCredential): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await ((
      supabase.from("user_credentials" as any) as any
    ).upsert({
      user_id: credential.userId,
      password_hash: credential.passwordHash,
      updated_at: new Date().toISOString(),
    }) as any);
    if (error) {
      databaseFailure("users.saveCredential", error);
    }
  }

  async deleteCredential(userId: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await ((supabase.from("user_credentials" as any) as any)
      .delete()
      .eq("user_id", userId) as any);
    if (error) databaseFailure("users.deleteCredential", error);
  }

  async anonymize(userId: string, reason?: string): Promise<UserProfile> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("complete_account_deletion", {
      p_user_id: userId,
      p_reason: reason,
    });
    const profile = data?.[0];
    if (error || !profile) databaseFailure("users.anonymize", error);
    return this.mapRowToUserProfile(profile);
  }
}
