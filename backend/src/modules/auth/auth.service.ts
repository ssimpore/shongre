import { UserProfile, UserRole } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { kycProvider } from '../../integrations/kyc/kyc-provider.js';
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

export const DEMO_PROFILES: Record<string, UserProfile> = {
  'thomas.laurent@example.fr': {
    id: 'user_thomas',
    slug: 'thomas-laurent',
    email: 'thomas.laurent@example.fr',
    name: 'Thomas Laurent',
    accountType: 'individual',
    primaryRole: 'individual_buyer',
    role: 'individual_buyer',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    city: 'Paris',
    postalCode: '75011',
    department: '75 - Paris',
    region: 'Île-de-France',
    country: 'FR',
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 4.9,
    reviewCount: 14,
    responseRatePercent: 98,
    responseTimeText: "en moins d'une heure",
  },
  'camille.martin@example.fr': {
    id: 'user_camille',
    slug: 'camille-martin',
    email: 'camille.martin@example.fr',
    name: 'Camille Martin',
    accountType: 'individual',
    primaryRole: 'individual_seller',
    role: 'individual_seller',
    sellerType: 'individual',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    city: 'Lyon',
    postalCode: '69002',
    department: '69 - Rhône',
    region: 'Auvergne-Rhône-Alpes',
    country: 'FR',
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 4.95,
    reviewCount: 42,
    responseRatePercent: 100,
    responseTimeText: 'en quelques minutes',
  },
  'admin@shongre.com': {
    id: 'user_admin',
    slug: 'admin-shongre',
    email: 'admin@shongre.com',
    name: 'Administrateur Shongre',
    accountType: 'internal',
    primaryRole: 'admin',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    city: 'Paris',
    postalCode: '75008',
    department: '75 - Paris',
    region: 'Île-de-France',
    country: 'FR',
    isVerified: true,
    isIdentityVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    rating: 5.0,
    reviewCount: 0,
    responseRatePercent: 100,
  },
};

export class AuthService {
  private currentUser: UserProfile | null = DEMO_PROFILES['thomas.laurent@example.fr'];

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.currentUser;
  }

  async login(credentials: LoginCredentials): Promise<{ user: UserProfile; token: string }> {
    const user = DEMO_PROFILES[credentials.email.toLowerCase()] || {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      slug: credentials.email.split('@')[0],
      email: credentials.email,
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

    this.currentUser = user;
    const token = `jwt_${Math.random().toString(36).substring(2, 15)}`;
    logger.info(`User logged in: ${user.email}`);
    return { user, token };
  }

  async register(input: RegisterInput): Promise<{ user: UserProfile; token: string }> {
    const newUser: UserProfile = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      slug: input.name.toLowerCase().replace(/\s+/g, '-'),
      email: input.email,
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
    const valid = await kycProvider.verifyPhoneOtp(phone, code);
    if (valid && this.currentUser) {
      this.currentUser.isPhoneVerified = true;
    }
    return valid;
  }

  async verifyEmail(token: string): Promise<boolean> {
    if (this.currentUser) {
      this.currentUser.isEmailVerified = true;
    }
    return true;
  }
}

export const authService = new AuthService();
