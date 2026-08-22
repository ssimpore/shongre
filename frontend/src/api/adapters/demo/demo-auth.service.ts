import {
  type AuthSecurityOverview,
  type AuthServiceContract,
  type LoginCredentials,
  type RegisterIndividualInput,
  type RegisterProfessionalInput,
  type SocialAuthStartInput,
  type SocialAuthProvider,
} from "../../contracts/auth.contract";
import { userRepository } from "../../../repositories/user.repository";
import { storageService } from "../../../services/storage.service";
import { type AuthResult, type UserProfile, type UserRole } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import {
  authService as demoEngine,
  hashPassword,
  verifyPasswordHash,
} from "../../../domains/auth/auth.service";
import { resolveSafeReturn } from "../../../security/safe-return";

const IDENTITIES_KEY = "shongre_demo_auth_identities_v2";
const RECENT_AUTH_KEY = "shongre_demo_recent_auth_v1";

type DemoIdentityState = Record<string, Partial<Record<SocialAuthProvider, string>>>;

function readIdentities(): DemoIdentityState {
  try {
    return JSON.parse(localStorage.getItem(IDENTITIES_KEY) || "{}") as DemoIdentityState;
  } catch {
    return {};
  }
}

function writeIdentities(value: DemoIdentityState): void {
  localStorage.setItem(IDENTITIES_KEY, JSON.stringify(value));
}

function currentUserOrThrow(): UserProfile {
  const user = storageService.getCurrentUser();
  if (!user) throw new Error("Vous devez être connecté.");
  return user;
}

export class DemoAuthService implements AuthServiceContract {
  async getCurrentUser(): Promise<UserProfile | null> {
    await simulateNetworkDelay();
    return storageService.getCurrentUser();
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    await simulateNetworkDelay();
    return demoEngine.login(credentials.email, credentials.password, {
      rememberMe: credentials.rememberMe,
    });
  }

  async loginWithMFA(tempToken: string, code: string): Promise<AuthResult> {
    await simulateNetworkDelay();
    return demoEngine.verifyMFALogin(tempToken, code);
  }

  async registerIndividual(input: RegisterIndividualInput): Promise<AuthResult> {
    await simulateNetworkDelay();
    return demoEngine.registerIndividual(input);
  }

  async registerProfessional(input: RegisterProfessionalInput): Promise<AuthResult> {
    await simulateNetworkDelay();
    return demoEngine.registerProfessional(input);
  }

  async logout(): Promise<void> {
    await simulateNetworkDelay();
    demoEngine.logout();
  }

  async logoutAll(keepCurrent = false): Promise<void> {
    await simulateNetworkDelay();
    const user = storageService.getCurrentUser();
    if (!user) return;
    demoEngine.revokeAllOtherSessions(user.id);
    if (!keepCurrent) demoEngine.logout();
  }

  async switchRole(role: UserRole): Promise<UserProfile> {
    await simulateNetworkDelay();
    const user = await userRepository.switchDemoRole(role);
    if (!user) throw new Error("Ce rôle de démonstration n’est pas disponible.");
    return user;
  }

  async switchDemoUser(userKey: string): Promise<UserProfile | null> {
    await simulateNetworkDelay();
    storageService.setCurrentUserKey(userKey);
    return storageService.getCurrentUser(userKey);
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    await simulateNetworkDelay();
    const user = currentUserOrThrow();
    return demoEngine.verifyPhoneCode(user.id, code).success || code === "123456";
  }

  async verifyEmail(token: string): Promise<boolean> {
    await simulateNetworkDelay();
    return demoEngine.verifyEmail(token).success;
  }

  async resendEmailVerification(email: string) {
    await simulateNetworkDelay();
    return demoEngine.resendEmailVerification(email);
  }

  async requestPasswordReset(email: string) {
    await simulateNetworkDelay();
    return demoEngine.requestPasswordReset(email);
  }

  async resetPassword(token: string, newPassword: string) {
    await simulateNetworkDelay();
    return demoEngine.resetPassword(token, newPassword);
  }

  async getSocialAuthAvailability() {
    await simulateNetworkDelay();
    return { google: true, apple: true, facebook: true, linking: true };
  }

  async startSocialAuth(input: SocialAuthStartInput): Promise<{ authorizationUrl: string }> {
    await simulateNetworkDelay();
    const returnTo = resolveSafeReturn(input.returnTo, "/compte");
    const params = new URLSearchParams({
      status: "success",
      provider: input.provider,
      demo: "true",
      returnTo,
    });
    if (input.intent === "link") params.set("intent", "link");
    if (input.accountType) params.set("accountType", input.accountType);
    return { authorizationUrl: `/auth/callback?${params.toString()}` };
  }

  /** Completes the deterministic provider callback used by OAuthCallbackPage. */
  async completeDemoSocialAuth(input: {
    provider: SocialAuthProvider;
    intent?: "sign_in" | "link";
  }): Promise<UserProfile> {
    await simulateNetworkDelay();
    const identities = readIdentities();
    const signedIn = storageService.getCurrentUser();
    if (input.intent === "link") {
      const user = currentUserOrThrow();
      if (Date.now() - Number(localStorage.getItem(RECENT_AUTH_KEY) || 0) > 10 * 60 * 1000) {
        throw new Error("Confirmez votre identité avant de connecter un compte.");
      }
      identities[user.id] = { ...(identities[user.id] || {}), [input.provider]: `${input.provider}-${user.id}` };
      writeIdentities(identities);
      return user;
    }

    const existingUserId = Object.entries(identities).find(([, providers]) => providers[input.provider])?.[0];
    if (existingUserId) {
      const existing = await userRepository.getUserById(existingUserId);
      if (existing) {
        const accountEntry = Object.entries(storageService.getUsers())
          .find(([, candidate]) => candidate.id === existing.id);
        if (accountEntry) storageService.setCurrentUserKey(accountEntry[0]);
        return existing;
      }
    }

    const providerUser = signedIn || (await userRepository.getAllUsers())[0];
    if (!providerUser) throw new Error("Aucun profil de démonstration disponible.");
    identities[providerUser.id] = {
      ...(identities[providerUser.id] || {}),
      [input.provider]: `${input.provider}-${providerUser.id}`,
    };
    writeIdentities(identities);
    const providerEntry = Object.entries(storageService.getUsers())
      .find(([, candidate]) => candidate.id === providerUser.id);
    if (providerEntry) storageService.setCurrentUserKey(providerEntry[0]);
    return providerUser;
  }

  async completeOAuthProfile(): Promise<void> {
    await simulateNetworkDelay();
  }

  async getSecurityOverview(): Promise<AuthSecurityOverview> {
    await simulateNetworkDelay();
    const user = currentUserOrThrow();
    const identities = readIdentities()[user.id] || {};
    const sessions = demoEngine.getUserSessions(user.id).map((session) => ({
      id: session.id,
      provider: "password" as const,
      deviceLabel: `${session.browser} sur ${session.os}`,
      ipPrefix: session.ipAddress,
      issuedAt: session.createdAt,
      lastUsedAt: session.lastActiveAt,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: Boolean(session.isCurrent),
    }));
    return {
      methods: (["password", "google", "apple", "facebook"] as const).map(
        (provider) => {
          const socialIdentity = provider === "password" ? undefined : identities[provider];
          return {
            provider,
            // Seeded demo personas use the deterministic engine's standard
            // password even when the legacy profile fixture omits a hash.
            connected: provider === "password" ? true : Boolean(socialIdentity),
            email: provider === "password" || socialIdentity ? user.email : null,
            emailVerified: Boolean(user.isEmailVerified),
            linkedAt: socialIdentity ? user.createdAt || new Date().toISOString() : null,
            lastUsedAt: socialIdentity ? user.lastLoginAt || null : null,
            isPrivateRelay: provider === "apple" && user.email.endsWith("@privaterelay.appleid.com"),
          };
        },
      ),
      sessions,
      recentAuthenticationRequired:
        Date.now() - Number(localStorage.getItem(RECENT_AUTH_KEY) || 0) > 10 * 60 * 1000,
    };
  }

  async reauthenticate(password: string): Promise<void> {
    await simulateNetworkDelay();
    const user = currentUserOrThrow();
    if (!verifyPasswordHash(password, user.passwordHash)) {
      throw new Error("Identifiants invalides.");
    }
    localStorage.setItem(RECENT_AUTH_KEY, String(Date.now()));
  }

  async unlinkProvider(provider: SocialAuthProvider): Promise<void> {
    await simulateNetworkDelay();
    const user = currentUserOrThrow();
    if (Date.now() - Number(localStorage.getItem(RECENT_AUTH_KEY) || 0) > 10 * 60 * 1000) {
      throw new Error("Confirmez votre identité avant de modifier vos méthodes de connexion.");
    }
    const identities = readIdentities();
    const providers = identities[user.id] || {};
    const remainingSocial = Object.keys(providers).filter((key) => key !== provider);
    if (!user.passwordHash && remainingSocial.length === 0) {
      throw new Error("Ajoutez d’abord une autre méthode de connexion.");
    }
    delete providers[provider];
    identities[user.id] = providers;
    writeIdentities(identities);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await simulateNetworkDelay();
    const user = currentUserOrThrow();
    const result = demoEngine.changePassword(user.id, currentPassword, newPassword);
    if (!result.success) throw new Error(result.message);
  }

  async addPassword(newPassword: string): Promise<void> {
    await simulateNetworkDelay();
    const user = currentUserOrThrow();
    if (newPassword.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    user.passwordHash = hashPassword(newPassword);
    storageService.saveUser(user);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await simulateNetworkDelay();
    demoEngine.revokeSession(sessionId);
  }

  async deleteAccount(password: string, reason?: string): Promise<void> {
    await simulateNetworkDelay();
    const user = currentUserOrThrow();
    const result = demoEngine.deleteAccount(user.id, password, reason);
    if (!result.success) throw new Error(result.message);
  }
}

export const demoAuthService = new DemoAuthService();
