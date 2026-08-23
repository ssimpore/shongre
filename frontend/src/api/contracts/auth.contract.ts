import { AuthResult, UserProfile, UserRole } from "../../types";

export type AuthProviderId = "password" | "google" | "apple" | "facebook";
export type SocialAuthProvider = Exclude<AuthProviderId, "password">;

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterIndividualInput {
  name: string;
  email: string;
  password: string;
  city: string;
  postalCode: string;
  country?: string;
  termsAccepted: boolean;
  marketingConsent?: boolean;
}

export interface RegisterProfessionalInput {
  name: string;
  email: string;
  password: string;
  companyName: string;
  sirenSiret: string;
  legalForm: string;
  vatNumber?: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  country?: string;
  phone?: string;
  termsAccepted: boolean;
  marketingConsent?: boolean;
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

export interface ConnectedAccountView {
  provider: AuthProviderId;
  connected: boolean;
  email: string | null;
  emailVerified: boolean;
  linkedAt: string | null;
  lastUsedAt: string | null;
  isPrivateRelay: boolean;
}

export interface AuthSessionView {
  id: string;
  provider: AuthProviderId;
  deviceLabel: string;
  ipPrefix: string | null;
  issuedAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AuthSecurityOverview {
  methods: ConnectedAccountView[];
  sessions: AuthSessionView[];
  recentAuthenticationRequired: boolean;
}

export interface SocialAuthStartInput {
  provider: SocialAuthProvider;
  intent?: "sign_in" | "link";
  returnTo?: string;
  accountType?: "individual" | "professional";
}

export interface AuthServiceContract {
  getCurrentUser(): Promise<UserProfile | null>;
  login(credentials: LoginCredentials): Promise<AuthResult>;
  loginWithMFA(tempToken: string, code: string): Promise<AuthResult>;
  registerIndividual(input: RegisterIndividualInput): Promise<AuthResult>;
  registerProfessional(input: RegisterProfessionalInput): Promise<AuthResult>;
  logout(): Promise<void>;
  logoutAll(keepCurrent?: boolean): Promise<void>;
  switchRole(role: UserRole): Promise<UserProfile | null>;
  switchDemoUser(userKey: string): Promise<UserProfile | null>;
  verifyPhone(phone: string, code: string): Promise<boolean>;
  verifyEmail(token: string): Promise<boolean>;
  resendEmailVerification(
    email: string,
  ): Promise<{ success: boolean; message: string }>;
  requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message: string; demoToken?: string }>;
  resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }>;
  getSocialAuthAvailability(): Promise<
    Record<SocialAuthProvider, boolean> & { linking: boolean }
  >;
  startSocialAuth(
    input: SocialAuthStartInput,
  ): Promise<{ authorizationUrl: string }>;
  /** Deterministic callback hook exposed only by the demo adapter. */
  completeDemoSocialAuth?(input: {
    provider: SocialAuthProvider;
    intent?: "sign_in" | "link";
  }): Promise<UserProfile>;
  completeOAuthProfile(input: {
    email: string;
    accountType?: "individual" | "professional";
  }): Promise<void>;
  getSecurityOverview(): Promise<AuthSecurityOverview>;
  reauthenticate(password: string): Promise<void>;
  unlinkProvider(provider: SocialAuthProvider): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  addPassword(newPassword: string): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  deleteAccount(password: string, reason?: string): Promise<void>;
}
