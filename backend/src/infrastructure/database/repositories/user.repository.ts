import { UserProfile, UserRole } from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

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
  findByEmail(email: string): Promise<UserProfile | null>;
  save(user: UserProfile): Promise<UserProfile>;
  update(id: string, updates: Partial<UserProfile>): Promise<UserProfile>;
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
    accountType: "staff",
    staffRole: "moderator",
    primaryRole: "moderator",
    role: "moderator",
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
    accountType: "staff",
    staffRole: "trust_safety",
    primaryRole: "operations",
    role: "operations",
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
    accountType: "staff",
    staffRole: "compliance",
    primaryRole: "operations",
    role: "operations",
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
    accountType: "staff",
    staffRole: "finance",
    primaryRole: "finance",
    role: "finance",
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
    accountType: "staff",
    staffRole: "admin",
    primaryRole: "admin",
    role: "admin",
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

  async findByEmail(email: string): Promise<UserProfile | null> {
    const lower = (email || "").toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === lower) {
        return { ...u };
      }
    }
    return null;
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
  private mapRowToUserProfile(row: any): UserProfile {
    return {
      id: row.id,
      slug: row.slug,
      email: row.email,
      name: row.name,
      accountType: row.account_type === "internal" ? "staff" : row.account_type,
      professionalVertical: row.professional_vertical || undefined,
      staffRole: row.staff_role || undefined,
      primaryRole: row.primary_role,
      role: (row.primary_role || "individual_buyer") as UserRole,
      sellerType: row.account_type === "professional" ? "pro" : "individual",
      status: row.status,
      customPermissions: row.custom_permissions || [],
      revokedPermissions: row.revoked_permissions || [],
      avatarUrl: row.avatar_url || undefined,
      phone: row.phone || undefined,
      city: row.city || undefined,
      postalCode: row.postal_code || undefined,
      department: row.department || undefined,
      region: row.region || undefined,
      country: row.country || "FR",
      bio: row.bio || undefined,
      isVerified: Boolean(row.is_verified),
      isIdentityVerified: Boolean(row.is_identity_verified),
      isPhoneVerified: Boolean(row.is_phone_verified),
      isEmailVerified: Boolean(row.is_email_verified),
      isBusinessVerified: Boolean(row.is_business_verified),
      rating: Number(row.rating || 5.0),
      reviewCount: Number(row.review_count || 0),
      responseRatePercent: Number(row.response_rate_percent || 100),
      responseTimeText: row.response_time_text || undefined,
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
      return this.mapRowToUserProfile(data);
    } catch (error) {
      databaseFailure("users.findById", error);
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
      return this.mapRowToUserProfile(data);
    } catch (error) {
      databaseFailure("users.findByEmail", error);
    }
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
      staff_role: user.staffRole || null,
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
    if (updates.staffRole !== undefined) payload.staff_role = updates.staffRole;
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
    return this.mapRowToUserProfile(data);
  }

  async getAll(): Promise<UserProfile[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data) databaseFailure("users.getAll", error);
      return data.map((r) => this.mapRowToUserProfile(r));
    } catch (error) {
      databaseFailure("users.getAll", error);
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
      p_reason: reason || null,
    });
    const profile = data?.[0];
    if (error || !profile) databaseFailure("users.anonymize", error);
    return this.mapRowToUserProfile(profile);
  }
}
