import type { UserProfile } from "../../shared/types/index.js";
import type { IUserRepository } from "../../infrastructure/database/repositories/user.repository.js";
import {
  createSupabasePasswordAuthClient,
  getSupabaseAdminClient,
} from "../../infrastructure/supabase/supabase-client.js";
import { config } from "../../app/config/index.js";
import {
  assertPasswordAcceptable,
  hashPassword,
  simulatePasswordVerification,
  verifyPassword,
} from "../../shared/auth/password.js";
import { AppError } from "../../shared/errors/app-error.js";

export interface PasswordIdentityProvider {
  authenticate(
    user: UserProfile | null,
    email: string,
    password: string,
  ): Promise<boolean>;
  provision(user: UserProfile, password: string): Promise<string>;
  hasPassword(user: UserProfile): Promise<boolean>;
  setPassword(user: UserProfile, password: string): Promise<void>;
  confirmEmail(user: UserProfile): Promise<void>;
  deleteAuthUser(authUserId: string | null): Promise<void>;
}

class DemoPasswordIdentityProvider implements PasswordIdentityProvider {
  constructor(private readonly users: IUserRepository) {}

  async authenticate(
    user: UserProfile | null,
    _email: string,
    password: string,
  ): Promise<boolean> {
    if (!user) {
      await simulatePasswordVerification();
      return false;
    }
    const credential = await this.users.findCredentialByUserId(user.id);
    return verifyPassword(password, credential?.passwordHash);
  }

  async provision(user: UserProfile, password: string): Promise<string> {
    const passwordHash = await hashPassword(password);
    await this.users.saveCredential({ userId: user.id, passwordHash });
    return user.id;
  }

  async hasPassword(user: UserProfile): Promise<boolean> {
    return Boolean(await this.users.findCredentialByUserId(user.id));
  }

  async setPassword(user: UserProfile, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    await this.users.saveCredential({ userId: user.id, passwordHash });
  }

  async confirmEmail(_user: UserProfile): Promise<void> {}

  async deleteAuthUser(_authUserId: string | null): Promise<void> {}
}

class SupabasePasswordIdentityProvider implements PasswordIdentityProvider {
  constructor(private readonly users: IUserRepository) {}

  async authenticate(
    user: UserProfile | null,
    email: string,
    password: string,
  ): Promise<boolean> {
    const client = createSupabasePasswordAuthClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user || !user) return false;
    const expectedAuthUserId = await this.users.findAuthUserId(user.id);
    return Boolean(expectedAuthUserId && data.user.id === expectedAuthUserId);
  }

  async provision(user: UserProfile, password: string): Promise<string> {
    assertPasswordAcceptable(password);
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password,
      // Shongre owns email-verification policy and its one-time action token.
      // Supabase is the password identity store here, so its independent
      // confirmation gate must not block reauthentication or account deletion.
      email_confirm: true,
      user_metadata: { name: user.name },
      app_metadata: {
        shongre_profile_id: user.id,
        shongre_password_enabled: true,
        shongre_email_verified: user.isEmailVerified,
        shongre_account_type: user.accountType,
        shongre_primary_role: user.primaryRole || user.role,
        shongre_staff_status: user.staffStatus ?? "none",
        shongre_staff_role: user.staffRole ?? null,
      },
    });
    if (error || !data.user) {
      throw new AppError({
        code: error?.status === 422 ? "CONFLICT" : "INTERNAL_ERROR",
        message:
          error?.status === 422
            ? "Un compte existe déjà avec cette adresse email."
            : "L’identité du compte n’a pas pu être créée.",
      });
    }
    try {
      await this.users.linkAuthUserId(user.id, data.user.id);
    } catch (linkError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw linkError;
    }
    return data.user.id;
  }

  async hasPassword(user: UserProfile): Promise<boolean> {
    const authUserId = await this.users.findAuthUserId(user.id);
    if (!authUserId) return false;
    const { data, error } =
      await getSupabaseAdminClient().auth.admin.getUserById(authUserId);
    if (error || !data.user) {
      throw new Error("The linked Supabase Auth identity is unavailable.");
    }
    return Boolean(data.user.app_metadata?.shongre_password_enabled);
  }

  async setPassword(user: UserProfile, password: string): Promise<void> {
    assertPasswordAcceptable(password);
    const linkedAuthUserId = await this.users.findAuthUserId(user.id);
    if (!linkedAuthUserId) {
      await this.provision(user, password);
      return;
    }
    const authUserId = linkedAuthUserId;
    const admin = getSupabaseAdminClient();
    const current = await admin.auth.admin.getUserById(authUserId);
    if (current.error || !current.data.user) {
      throw new Error("The linked Supabase Auth identity is unavailable.");
    }
    const { error } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      app_metadata: {
        ...current.data.user.app_metadata,
        shongre_password_enabled: true,
        shongre_profile_id: user.id,
      },
    });
    if (error) throw new Error("Supabase Auth rejected the password update.");
  }

  async confirmEmail(user: UserProfile): Promise<void> {
    const authUserId = await this.users.findAuthUserId(user.id);
    // Social-only accounts can use Shongre's email verification without a
    // password identity. If they later add a password, setPassword provisions
    // and links the Supabase Auth identity first.
    if (!authUserId) return;
    const admin = getSupabaseAdminClient();
    const current = await admin.auth.admin.getUserById(authUserId);
    if (current.error || !current.data.user) {
      throw new Error("The linked Supabase Auth identity is unavailable.");
    }
    const { error } = await admin.auth.admin.updateUserById(authUserId, {
      email_confirm: true,
      app_metadata: {
        ...current.data.user.app_metadata,
        shongre_email_verified: true,
      },
    });
    if (error) throw new Error("Supabase Auth rejected email confirmation.");
  }

  async deleteAuthUser(authUserId: string | null): Promise<void> {
    if (!authUserId) return;
    const { error } =
      await getSupabaseAdminClient().auth.admin.deleteUser(authUserId);
    if (error) throw new Error("Supabase Auth rejected account deletion.");
  }
}

export function createPasswordIdentityProvider(
  users: IUserRepository,
): PasswordIdentityProvider {
  return config.dataMode === "database"
    ? new SupabasePasswordIdentityProvider(users)
    : new DemoPasswordIdentityProvider(users);
}
