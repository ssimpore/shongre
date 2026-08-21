import {
  AuthServiceContract,
  LoginCredentials,
  RegisterInput,
} from "../../contracts/auth.contract";
import { httpClient } from "./http-client";
import { UserProfile, UserRole } from "../../../types";

export class HttpAuthService implements AuthServiceContract {
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      return await httpClient.get<UserProfile>("/auth/me");
    } catch {
      return null;
    }
  }

  async login(credentials: LoginCredentials): Promise<UserProfile> {
    const res = await httpClient.post<{ user: UserProfile; token: string }>(
      "/auth/login",
      credentials,
    );
    if (res.token && typeof localStorage !== "undefined") {
      localStorage.setItem("shongre_auth_token", res.token);
    }
    return res.user;
  }

  async register(input: RegisterInput): Promise<UserProfile> {
    const res = await httpClient.post<{ user: UserProfile; token: string }>(
      "/auth/register",
      input,
    );
    if (res.token && typeof localStorage !== "undefined") {
      localStorage.setItem("shongre_auth_token", res.token);
    }
    return res.user;
  }

  async logout(): Promise<void> {
    try {
      await httpClient.post("/auth/logout");
    } finally {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("shongre_auth_token");
      }
    }
  }

  async switchRole(role: UserRole): Promise<UserProfile> {
    // The backend re-issues the token when the acting role changes, because the
    // role is a signed claim: keeping the old token would leave the session
    // asserting the role it just moved away from.
    const res = await httpClient.post<{ user: UserProfile; token: string }>(
      "/auth/switch-role",
      { role },
    );
    if (res.token && typeof localStorage !== "undefined") {
      localStorage.setItem("shongre_auth_token", res.token);
    }
    return res.user;
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    const res = await httpClient.post<{ verified: boolean }>(
      "/auth/verify-phone",
      { phone, code },
    );
    return res.verified;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const res = await httpClient.post<{ verified: boolean }>(
      "/auth/verify-email",
      { token },
    );
    return res.verified;
  }

  async deleteAccount(password: string, reason?: string): Promise<void> {
    await httpClient.post("/account/delete", { password, reason });
    if (typeof localStorage !== "undefined")
      localStorage.removeItem("shongre_auth_token");
  }
}

export const httpAuthService = new HttpAuthService();
