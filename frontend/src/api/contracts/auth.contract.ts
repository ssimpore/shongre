import { UserProfile, UserRole } from '../../types';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  role: UserRole;
  /** Required by the API backend, which stores a scrypt hash of it. */
  password?: string;
  companyName?: string;
  siret?: string;
  phone?: string;
}

export interface AuthServiceContract {
  getCurrentUser(): Promise<UserProfile | null>;
  login(credentials: LoginCredentials): Promise<UserProfile>;
  register(input: RegisterInput): Promise<UserProfile>;
  logout(): Promise<void>;
  switchRole(role: UserRole): Promise<UserProfile>;
  verifyPhone(phone: string, code: string): Promise<boolean>;
  verifyEmail(token: string): Promise<boolean>;
}
