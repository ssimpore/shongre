import { UserProfile, UserRole } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { IUserRepository, repositories, CANONICAL_DEMO_USERS } from '../../infrastructure/database/repositories/index.js';
import { IKYCProvider, providers } from '../../integrations/providers/index.js';
import { logger } from '../../infrastructure/logging/logger.js';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  role: UserRole;
  companyName?: string;
  siret?: string;
  phone?: string;
}

export const DEMO_PROFILES = CANONICAL_DEMO_USERS;

export class AuthService {
  private currentUser: UserProfile | null = CANONICAL_DEMO_USERS['thomas.laurent@example.fr'];

  constructor(
    private userRepo: IUserRepository = repositories.users,
    private kyc: IKYCProvider = providers.kyc
  ) {}

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.currentUser;
  }

  async login(credentials: LoginCredentials): Promise<{ user: UserProfile; token: string }> {
    const existing = await this.userRepo.findByEmail(credentials.email);
    const user: UserProfile = existing || {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      slug: credentials.email.split('@')[0],
      email: credentials.email.toLowerCase(),
      name: credentials.email.split('@')[0],
      accountType: 'individual',
      primaryRole: 'individual_buyer',
      role: 'individual_buyer',
      status: 'active',
      country: 'FR',
      isVerified: true,
      isIdentityVerified: false,
      isPhoneVerified: false,
      isEmailVerified: true,
      rating: 5.0,
      reviewCount: 0,
      responseRatePercent: 100,
    };

    if (!existing) {
      try {
        await this.userRepo.save(user);
      } catch (err: any) {
        logger.debug(`User save error on login: ${err.message}`);
      }
    }

    this.currentUser = user;
    const token = `jwt_${Math.random().toString(36).substring(2, 15)}`;
    logger.info(`User logged in: ${user.email}`);
    return { user, token };
  }

  async register(input: RegisterInput): Promise<{ user: UserProfile; token: string }> {
    const newUser: UserProfile = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      slug: input.name.toLowerCase().replace(/\s+/g, '-'),
      email: input.email.toLowerCase(),
      name: input.name,
      accountType: input.siret ? 'professional' : 'individual',
      primaryRole: input.role,
      role: input.role,
      sellerType: input.siret ? 'pro' : 'individual',
      status: 'active',
      phone: input.phone,
      country: 'FR',
      isVerified: false,
      isIdentityVerified: false,
      isPhoneVerified: false,
      isEmailVerified: false,
      isBusinessVerified: Boolean(input.siret),
      rating: 5.0,
      reviewCount: 0,
      responseRatePercent: 100,
    };

    try {
      await this.userRepo.save(newUser);
    } catch (err: any) {
      logger.debug(`User save error on register: ${err.message}`);
    }

    this.currentUser = newUser;
    const token = `jwt_${Math.random().toString(36).substring(2, 15)}`;
    logger.info(`New user registered: ${newUser.email} (${newUser.role})`);
    return { user: newUser, token };
  }

  async logout(): Promise<void> {
    logger.info(`User logged out`);
    this.currentUser = null;
  }

  async switchRole(role: UserRole): Promise<UserProfile> {
    if (!this.currentUser) {
      throw new AppError({ code: 'UNAUTHENTICATED', message: 'Non connecté' });
    }
    this.currentUser = {
      ...this.currentUser,
      role,
      primaryRole: role,
    };
    return this.currentUser;
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    const valid = await this.kyc.verifyPhoneOtp(phone, code);
    if (valid && this.currentUser) {
      this.currentUser.isPhoneVerified = true;
      try {
        await this.userRepo.update(this.currentUser.id, { isPhoneVerified: true });
      } catch {}
    }
    return valid;
  }

  async verifyEmail(token: string): Promise<boolean> {
    if (this.currentUser) {
      this.currentUser.isEmailVerified = true;
      try {
        await this.userRepo.update(this.currentUser.id, { isEmailVerified: true });
      } catch {}
    }
    return true;
  }
}

export const authService = new AuthService();
