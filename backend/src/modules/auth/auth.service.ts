import { UserProfile, UserRole } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { IUserRepository, repositories, CANONICAL_DEMO_USERS } from '../../infrastructure/database/repositories/index.js';
import { IKYCProvider, providers } from '../../integrations/providers/index.js';
import { logger } from '../../infrastructure/logging/logger.js';
import { config } from '../../app/config/index.js';
import { hashPassword, verifyPassword, simulatePasswordVerification, WeakPasswordError } from '../../shared/auth/password.js';
import { issueToken, verifyToken, TokenError } from '../../shared/auth/tokens.js';
import { Principal, GUEST_PRINCIPAL } from '../../shared/auth/principal.js';
import { PlatformRole } from '../../shared/auth/rbac.js';

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
  siret?: string;
  phone?: string;
}

export interface AuthResult {
  user: UserProfile;
  token: string;
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
  'individual_buyer',
  'individual_seller',
  'pro_seller',
]);

/**
 * The generic failure returned for every unsuccessful login.
 *
 * One message for "no such account", "wrong password" and "not yet activated"
 * keeps the login form from confirming which email addresses are registered.
 */
function invalidCredentials(): AppError {
  return new AppError({
    code: 'UNAUTHENTICATED',
    message: 'Identifiants invalides.',
  });
}

export class AuthService {
  constructor(
    private userRepo: IUserRepository = repositories.users,
    private kyc: IKYCProvider = providers.kyc
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
    const user = await this.userRepo.findById(claims.sub);
    if (!user || user.status !== 'active') return GUEST_PRINCIPAL;

    return {
      userId: user.id,
      email: user.email,
      role: (user.primaryRole || user.role) as PlatformRole,
    };
  }

  async getCurrentUser(principal: Principal): Promise<UserProfile | null> {
    if (!principal.userId) return null;
    return this.userRepo.findById(principal.userId);
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const email = (credentials?.email || '').toLowerCase().trim();
    const password = credentials?.password || '';

    if (!email || !password) {
      throw invalidCredentials();
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Spend comparable CPU to a real verification so that a missing account
      // and a wrong password are not distinguishable by response time.
      await simulatePasswordVerification();
      throw invalidCredentials();
    }

    const credential = await this.userRepo.findCredentialByUserId(user.id);
    const passwordMatches = await verifyPassword(password, credential?.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    if (user.status !== 'active') {
      // Suspended and banned accounts get the same generic error: telling a
      // banned user their ban is in effect also tells an attacker the account
      // is real.
      throw invalidCredentials();
    }

    logger.info(`Authentication succeeded for profile ${user.id}`);
    return { user, token: this.issueFor(user) };
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = (input?.email || '').toLowerCase().trim();
    const password = input?.password || '';

    if (!email || !input?.name) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Email et nom sont requis.' });
    }

    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      // Registration inherently reveals that an address is taken. Rather than
      // pretend otherwise, keep it a clean 409 and rely on rate limiting at the
      // edge to make bulk enumeration impractical.
      throw new AppError({
        code: 'CONFLICT',
        message: 'Un compte existe déjà avec cette adresse email.',
      });
    }

    let passwordHash: string;
    try {
      passwordHash = await hashPassword(password);
    } catch (err) {
      if (err instanceof WeakPasswordError) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: err.message });
      }
      throw err;
    }

    const requestedRole = input.role;
    if (requestedRole && !SELF_ASSIGNABLE_ROLES.has(requestedRole)) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: "Ce type de compte ne peut pas être créé depuis l'inscription.",
      });
    }
    const role: UserRole = requestedRole || 'individual_buyer';

    const newUser: UserProfile = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      slug: input.name.toLowerCase().replace(/\s+/g, '-'),
      email,
      name: input.name,
      accountType: input.siret ? 'professional' : 'individual',
      primaryRole: role,
      role,
      sellerType: input.siret ? 'pro' : 'individual',
      status: 'active',
      phone: input.phone,
      country: 'FR',
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

    logger.info(`New account registered: profile ${saved.id} (${role})`);
    return { user: saved, token: this.issueFor(saved) };
  }

  /**
   * Logout is a client-side token discard.
   *
   * Tokens are stateless and short-lived, so there is nothing to clear
   * server-side yet. Genuine server-side revocation needs a rejected-jti store;
   * until that exists this is honest about doing nothing rather than implying a
   * guarantee it cannot make.
   */
  async logout(principal: Principal): Promise<void> {
    if (principal.userId) {
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
      throw new AppError({ code: 'UNAUTHENTICATED', message: 'Non connecté' });
    }

    const user = await this.userRepo.findById(principal.userId);
    if (!user) {
      throw new AppError({ code: 'UNAUTHENTICATED', message: 'Non connecté' });
    }

    if (!this.grantedRolesFor(user).has(role)) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: "Ce rôle n'est pas disponible pour votre compte.",
      });
    }

    // A new token is issued so the session's authority reflects the new role.
    // Returning only the profile would leave the caller holding a token that
    // still asserts the old one.
    const updated: UserProfile = { ...user, role, primaryRole: role };
    return { user: updated, token: this.issueFor(updated) };
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

    if (primary === 'individual_buyer' || primary === 'individual_seller') {
      granted.add('individual_buyer');
      granted.add('individual_seller');
    }
    if (primary === 'pro_seller') {
      granted.add('individual_buyer');
    }
    return granted;
  }

  async verifyPhone(principal: Principal, phone: string, code: string): Promise<boolean> {
    if (!principal.userId) {
      throw new AppError({ code: 'UNAUTHENTICATED', message: 'Non connecté' });
    }
    const valid = await this.kyc.verifyPhoneOtp(phone, code);
    if (valid) {
      await this.userRepo.update(principal.userId, { isPhoneVerified: true, phone });
    }
    return valid;
  }

  /**
   * Confirms an email address from a signed verification token.
   *
   * The previous implementation ignored the token entirely and returned true,
   * which made "verified email" a badge anyone could award themselves.
   */
  async verifyEmail(token: string): Promise<boolean> {
    if (!token) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Jeton de vérification manquant.' });
    }

    let claims;
    try {
      claims = verifyToken(token, config.jwtSecret);
    } catch {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Lien de vérification invalide ou expiré.',
      });
    }

    const user = await this.userRepo.findById(claims.sub);
    if (!user) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Lien de vérification invalide ou expiré.' });
    }

    await this.userRepo.update(user.id, { isEmailVerified: true });
    return true;
  }

  /** Mints the email-confirmation token that verifyEmail consumes. */
  issueEmailVerificationToken(user: UserProfile): string {
    return issueToken(
      { sub: user.id, email: user.email, role: (user.primaryRole || user.role) as PlatformRole },
      config.jwtSecret,
      60 * 60 * 24
    );
  }

  private issueFor(user: UserProfile): string {
    return issueToken(
      {
        sub: user.id,
        email: user.email,
        role: (user.primaryRole || user.role) as PlatformRole,
      },
      config.jwtSecret,
      config.authTokenTtlSeconds
    );
  }
}

export const authService = new AuthService();
