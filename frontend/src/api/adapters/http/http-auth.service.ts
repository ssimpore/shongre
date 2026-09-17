import {
  type AuthSecurityOverview,
  type AuthServiceContract,
  type LoginCredentials,
  type RegisterIndividualInput,
  type RegisterProfessionalInput,
  type AuthProfileUpdate,
  type ProfessionalAccountUpgradeInput,
  type SocialAuthProvider,
  type SocialAuthStartInput,
  type MfaStatusView,
  type MfaSetupView,
  type DomainHandoffStartInput,
  type DomainHandoffStartResult,
  type DomainHandoffExchangeResult,
  type AccountAwayState,
  type AccountDataExport,
} from "../../contracts/auth.contract";
import { apiOperation } from "./generated-api-operation";
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
    return apiOperation("postAuthDomainHandoffStart", { body: input });
  }

  exchangeDomainHandoff(input: {
    code: string;
    targetCountry: string;
  }): Promise<DomainHandoffExchangeResult> {
    return apiOperation<
      DomainHandoffExchangeResult,
      "postAuthDomainHandoffExchange"
    >("postAuthDomainHandoffExchange", { body: input });
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      return await apiOperation<UserProfile | null, "getAuthMe">(
        "getAuthMe",
        {},
      );
    } catch {
      return null;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response = await apiOperation<BackendAuthResponse, "postAuthLogin">(
        "postAuthLogin",
        { body: credentials },
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
      const response = await apiOperation<
        BackendAuthResponse,
        "postAuthMfaChallenge"
      >("postAuthMfaChallenge", { body: { tempMfaToken, code } });
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
    return apiOperation<MfaStatusView, "getAuthMfa">("getAuthMfa", {});
  }

  beginMfaEnrollment(): Promise<MfaSetupView> {
    return apiOperation<MfaSetupView, "postAuthMfaSetup">(
      "postAuthMfaSetup",
      {},
    );
  }

  async confirmMfaEnrollment(code: string): Promise<void> {
    await apiOperation("postAuthMfaConfirm", { body: { code } });
  }

  async verifySessionMfa(code: string): Promise<void> {
    await apiOperation("postAuthMfaSessionConfirm", { body: { code } });
  }

  async disableMfa(code: string): Promise<void> {
    await apiOperation("deleteAuthMfa", { body: { code } });
  }

  async registerIndividual(
    input: RegisterIndividualInput,
  ): Promise<AuthResult> {
    try {
      const response = await apiOperation<
        BackendAuthResponse,
        "postAuthRegister"
      >("postAuthRegister", {
        body: {
          email: input.email,
          name: input.name,
          password: input.password,
          role: "individual_buyer",
          city: input.city,
          postalCode: input.postalCode,
          country: input.country,
        },
      });
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
      const response = await apiOperation<
        BackendAuthResponse,
        "postAuthRegister"
      >("postAuthRegister", {
        body: {
          email: input.email,
          name: input.name,
          password: input.password,
          role: "pro_seller",
          companyName: input.companyName,
          professionalVertical: input.professionalVertical,
          siret: input.sirenSiret,
          phone: input.phone,
          legalForm: input.legalForm,
          vatNumber: input.vatNumber,
          businessAddress: input.businessAddress,
          city: input.city,
          postalCode: input.postalCode,
          country: input.country,
          productIntent: input.requestedProduct,
        },
      });
      return { success: true, user: response.user };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Inscription impossible.",
      };
    }
  }

  async updateProfile(updates: AuthProfileUpdate): Promise<UserProfile> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error("Vous devez être connecté.");
    return apiOperation<UserProfile, "putUsersById">("putUsersById", {
      path: { id: currentUser.id },
      body: updates,
    });
  }

  async upgradeToProfessional(
    input: ProfessionalAccountUpgradeInput,
  ): Promise<AuthResult> {
    try {
      const user = await apiOperation<
        UserProfile,
        "postAccountUpgradeToProfessional"
      >("postAccountUpgradeToProfessional", {
        body: {
          companyName: input.companyName,
          businessIdentifier: input.sirenSiret,
          legalForm: input.legalForm,
          vatNumber: input.vatNumber,
          businessAddress: input.businessAddress,
          phone: input.phone,
        },
      });
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "La mise à niveau Professionnelle a échoué.",
      };
    }
  }

  async logout(): Promise<void> {
    await apiOperation("postAuthLogout", {});
  }

  async logoutAll(keepCurrent = false): Promise<void> {
    await apiOperation("postAuthLogoutAll", { body: { keepCurrent } });
  }

  async switchRole(role: UserRole): Promise<UserProfile> {
    const response = await apiOperation<
      BackendAuthResponse,
      "postAuthSwitchRole"
    >("postAuthSwitchRole", { body: { role } });
    if (!response.user) throw new Error("Profil utilisateur indisponible.");
    return response.user;
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    const response = await apiOperation<
      { verified: boolean },
      "postAuthVerifyPhone"
    >("postAuthVerifyPhone", { body: { phone, code } });
    return response.verified;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const response = await apiOperation<
      { verified: boolean },
      "postAuthVerifyEmail"
    >("postAuthVerifyEmail", { body: { token } });
    return response.verified;
  }

  async resendEmailVerification(email: string) {
    await apiOperation("postAuthVerifyEmailResend", { body: { email } });
    return {
      success: true,
      message: "Si ce compte existe, un email de validation a été envoyé.",
    };
  }

  async requestPasswordReset(email: string) {
    const response = await apiOperation<
      { accepted: true },
      "postAuthPasswordForgot"
    >("postAuthPasswordForgot", { body: { email } });
    return {
      success: response.accepted,
      message: "Si ce compte existe, un lien de réinitialisation a été envoyé.",
    };
  }

  async resetPassword(token: string, newPassword: string) {
    await apiOperation("postAuthPasswordReset", {
      body: { token, newPassword },
    });
    return { success: true, message: "Votre mot de passe a été modifié." };
  }

  async getSocialAuthAvailability() {
    return apiOperation<
      Record<SocialAuthProvider, boolean> & { linking: boolean },
      "getAuthOauthProviders"
    >("getAuthOauthProviders", {});
  }

  async startSocialAuth(
    input: SocialAuthStartInput,
  ): Promise<{ authorizationUrl: string }> {
    return apiOperation<
      { authorizationUrl: string },
      "postAuthOauthByProviderStart"
    >("postAuthOauthByProviderStart", {
      path: { provider: input.provider },
      body: {
        ...input,
        clientKind: "web",
      },
    });
  }

  async completeOAuthProfile(input: {
    email: string;
    accountType?: "individual" | "professional";
  }): Promise<void> {
    await apiOperation("postAuthOauthCompleteProfile", { body: input });
  }

  async getSecurityOverview(): Promise<AuthSecurityOverview> {
    return apiOperation<AuthSecurityOverview, "getAuthSecurity">(
      "getAuthSecurity",
      {},
    );
  }

  async reauthenticate(password: string): Promise<void> {
    await apiOperation("postAuthReauthenticate", { body: { password } });
  }

  async unlinkProvider(provider: SocialAuthProvider): Promise<void> {
    await apiOperation("deleteAuthIdentitiesByProvider", {
      path: { provider: provider },
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await apiOperation("postAuthPasswordChange", {
      body: {
        currentPassword,
        newPassword,
      },
    });
  }

  async addPassword(newPassword: string): Promise<void> {
    await apiOperation("postAuthPasswordAdd", { body: { newPassword } });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await apiOperation("deleteAuthSessionsById", { path: { id: sessionId } });
  }

  async deleteAccount(password: string, reason?: string): Promise<void> {
    await apiOperation("postAccountDelete", { body: { password, reason } });
  }

  async exportAccountData(): Promise<AccountDataExport> {
    return apiOperation("getAccountExport", {});
  }

  async setAwayMode(input: {
    until: string | null;
    message?: string;
  }): Promise<AccountAwayState> {
    return apiOperation<AccountAwayState, "putAccountAway">("putAccountAway", {
      body: input,
    });
  }
}

export const httpAuthService = new HttpAuthService();
