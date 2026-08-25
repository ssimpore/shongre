import {
  type AuthSecurityOverview,
  type AuthServiceContract,
  type LoginCredentials,
  type RegisterIndividualInput,
  type RegisterProfessionalInput,
  type SocialAuthProvider,
  type SocialAuthStartInput,
  type MfaStatusView,
  type MfaSetupView,
  type DomainHandoffStartInput,
  type DomainHandoffStartResult,
  type DomainHandoffExchangeResult,
} from "../../contracts/auth.contract";
import { httpClient } from "./http-client";
import {
  type AuthResult,
  type UserProfile,
  type UserRole,
} from "../../../types";

interface BackendAuthResponse {
  user?: UserProfile;
  token?: string;
  requiresMfa?: boolean;
  tempMfaToken?: string;
}

export class HttpAuthService implements AuthServiceContract {
  beginDomainHandoff(
    input: DomainHandoffStartInput,
  ): Promise<DomainHandoffStartResult> {
    return httpClient.post("/auth/domain-handoff/start", input);
  }

  exchangeDomainHandoff(input: {
    code: string;
    targetCountry: string;
  }): Promise<DomainHandoffExchangeResult> {
    return httpClient.post("/auth/domain-handoff/exchange", input);
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      return await httpClient.get<UserProfile | null>("/auth/me");
    } catch {
      return null;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response = await httpClient.post<BackendAuthResponse>(
        "/auth/login",
        credentials,
      );
      if (response.requiresMfa && response.tempMfaToken) {
        return {
          success: false,
          requiresMfa: true,
          tempMfaToken: response.tempMfaToken,
        };
      }
      if (!response.user) throw new Error("Réponse de connexion incomplète.");
      return { success: true, user: response.user };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Connexion impossible.",
      };
    }
  }

  async loginWithMFA(tempMfaToken: string, code: string): Promise<AuthResult> {
    try {
      const response = await httpClient.post<BackendAuthResponse>(
        "/auth/mfa/challenge",
        { tempMfaToken, code },
      );
      if (!response.user) throw new Error("Réponse de connexion incomplète.");
      return { success: true, user: response.user };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Code MFA invalide.",
      };
    }
  }

  getMfaStatus(): Promise<MfaStatusView> {
    return httpClient.get<MfaStatusView>("/auth/mfa");
  }

  beginMfaEnrollment(): Promise<MfaSetupView> {
    return httpClient.post<MfaSetupView>("/auth/mfa/setup");
  }

  async confirmMfaEnrollment(code: string): Promise<void> {
    await httpClient.post("/auth/mfa/confirm", { code });
  }

  async verifySessionMfa(code: string): Promise<void> {
    await httpClient.post("/auth/mfa/session-confirm", { code });
  }

  async disableMfa(code: string): Promise<void> {
    await httpClient.request("/auth/mfa", {
      method: "DELETE",
      body: JSON.stringify({ code }),
    });
  }

  async registerIndividual(
    input: RegisterIndividualInput,
  ): Promise<AuthResult> {
    try {
      const response = await httpClient.post<BackendAuthResponse>(
        "/auth/register",
        {
          email: input.email,
          name: input.name,
          password: input.password,
          role: "individual_buyer",
        },
      );
      return { success: true, user: response.user };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Inscription impossible.",
      };
    }
  }

  async registerProfessional(
    input: RegisterProfessionalInput,
  ): Promise<AuthResult> {
    try {
      const response = await httpClient.post<BackendAuthResponse>(
        "/auth/register",
        {
          email: input.email,
          name: input.name,
          password: input.password,
          role: "pro_seller",
          companyName: input.companyName,
          professionalVertical: input.professionalVertical,
          siret: input.sirenSiret,
          phone: input.phone,
        },
      );
      return { success: true, user: response.user };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Inscription impossible.",
      };
    }
  }

  async logout(): Promise<void> {
    await httpClient.post("/auth/logout");
  }

  async logoutAll(keepCurrent = false): Promise<void> {
    await httpClient.post("/auth/logout-all", { keepCurrent });
  }

  async switchRole(role: UserRole): Promise<UserProfile> {
    const response = await httpClient.post<BackendAuthResponse>(
      "/auth/switch-role",
      { role },
    );
    if (!response.user) throw new Error("Profil utilisateur indisponible.");
    return response.user;
  }

  async switchDemoUser(): Promise<UserProfile | null> {
    return null;
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    const response = await httpClient.post<{ verified: boolean }>(
      "/auth/verify-phone",
      { phone, code },
    );
    return response.verified;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const response = await httpClient.post<{ verified: boolean }>(
      "/auth/verify-email",
      { token },
    );
    return response.verified;
  }

  async resendEmailVerification(email: string) {
    await httpClient.post("/auth/verify-email/resend", { email });
    return {
      success: true,
      message: "Si ce compte existe, un email de validation a été envoyé.",
    };
  }

  async requestPasswordReset(email: string) {
    const response = await httpClient.post<{ accepted: true }>(
      "/auth/password/forgot",
      { email },
    );
    return {
      success: response.accepted,
      message: "Si ce compte existe, un lien de réinitialisation a été envoyé.",
    };
  }

  async resetPassword(token: string, newPassword: string) {
    await httpClient.post("/auth/password/reset", { token, newPassword });
    return { success: true, message: "Votre mot de passe a été modifié." };
  }

  async getSocialAuthAvailability() {
    return httpClient.get<
      Record<SocialAuthProvider, boolean> & { linking: boolean }
    >("/auth/oauth/providers");
  }

  async startSocialAuth(
    input: SocialAuthStartInput,
  ): Promise<{ authorizationUrl: string }> {
    return httpClient.post(`/auth/oauth/${input.provider}/start`, {
      ...input,
      clientKind: "web",
    });
  }

  async completeOAuthProfile(input: {
    email: string;
    accountType?: "individual" | "professional";
  }): Promise<void> {
    await httpClient.post("/auth/oauth/complete-profile", input);
  }

  async getSecurityOverview(): Promise<AuthSecurityOverview> {
    return httpClient.get("/auth/security");
  }

  async reauthenticate(password: string): Promise<void> {
    await httpClient.post("/auth/reauthenticate", { password });
  }

  async unlinkProvider(provider: SocialAuthProvider): Promise<void> {
    await httpClient.delete(`/auth/identities/${provider}`);
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await httpClient.post("/auth/password/change", {
      currentPassword,
      newPassword,
    });
  }

  async addPassword(newPassword: string): Promise<void> {
    await httpClient.post("/auth/password/add", { newPassword });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await httpClient.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`);
  }

  async deleteAccount(password: string, reason?: string): Promise<void> {
    await httpClient.post("/account/delete", { password, reason });
  }
}

export const httpAuthService = new HttpAuthService();
