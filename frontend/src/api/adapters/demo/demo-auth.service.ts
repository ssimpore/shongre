import {
  AuthServiceContract,
  LoginCredentials,
  RegisterInput,
} from "../../contracts/auth.contract";
import { userRepository } from "../../../repositories/user.repository";
import { storageService } from "../../../services/storage.service";
import { UserProfile, UserRole } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { authService } from "../../../domains/auth/auth.service";

export class DemoAuthService implements AuthServiceContract {
  async getCurrentUser(): Promise<UserProfile | null> {
    await simulateNetworkDelay();
    return storageService.getCurrentUser();
  }

  async login(credentials: LoginCredentials): Promise<UserProfile> {
    await simulateNetworkDelay();
    const allUsers = await userRepository.getAllUsers();
    const found = allUsers.find(
      (u) => u.email.toLowerCase() === credentials.email.toLowerCase(),
    );
    if (!found) {
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        name: credentials.email.split("@")[0],
        email: credentials.email,
        role: "individual_seller",
        accountType: "individual",
        sellerType: "individual",
        status: "active",
        isVerified: true,
        country: "FR",
        city: "Paris",
        postalCode: "75001",
        createdAt: new Date().toISOString(),
        rating: 5.0,
        reviewCount: 0,
        responseRatePercent: 100,
        responseTimeText: "< 1h",
      };
      storageService.saveUser(newUser);
      storageService.setCurrentUserKey(newUser.id);
      return newUser;
    }
    storageService.setCurrentUserKey(found.id);
    return found;
  }

  async register(input: RegisterInput): Promise<UserProfile> {
    await simulateNetworkDelay();
    const isPro = String(input.role).startsWith("pro_");
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.role,
      accountType: isPro ? "professional" : "individual",
      sellerType: isPro ? "pro" : "individual",
      companyName: input.companyName,
      siret: input.siret,
      phone: input.phone,
      status: "active",
      isVerified: false,
      country: "FR",
      city: "Paris",
      postalCode: "75001",
      createdAt: new Date().toISOString(),
      rating: 5.0,
      reviewCount: 0,
      responseRatePercent: 100,
      responseTimeText: "< 1h",
    };
    storageService.saveUser(newUser);
    storageService.setCurrentUserKey(newUser.id);
    return newUser;
  }

  async logout(): Promise<void> {
    await simulateNetworkDelay();
    storageService.setCurrentUserKey("guest");
  }

  async switchRole(role: UserRole): Promise<UserProfile> {
    await simulateNetworkDelay();
    const user = await userRepository.switchDemoRole(role);
    if (user) {
      return user;
    }
    const isPro = String(role).startsWith("pro_");
    const fallback: UserProfile = {
      id: `user_${role}`,
      name: `Utilisateur ${role}`,
      email: `${role}@shongre.com`,
      role,
      accountType: isPro ? "professional" : "individual",
      sellerType: isPro ? "pro" : "individual",
      status: "active",
      isVerified: true,
      country: "FR",
      city: "Paris",
      postalCode: "75001",
      createdAt: new Date().toISOString(),
      rating: 5.0,
      reviewCount: 0,
      responseRatePercent: 100,
      responseTimeText: "< 1h",
    };
    storageService.saveUser(fallback);
    storageService.setCurrentUserKey(fallback.id);
    return fallback;
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    await simulateNetworkDelay();
    if (code === "1234" || code.length === 4 || code.length === 6) {
      const user = storageService.getCurrentUser();
      if (user) {
        user.phone = phone;
        user.isPhoneVerified = true;
        storageService.saveUser(user);
      }
      return true;
    }
    return false;
  }

  async verifyEmail(_token: string): Promise<boolean> {
    await simulateNetworkDelay();
    const user = storageService.getCurrentUser();
    if (user) {
      user.isVerified = true;
      storageService.saveUser(user);
    }
    return true;
  }

  async deleteAccount(password: string, reason?: string): Promise<void> {
    await simulateNetworkDelay();
    const user = storageService.getCurrentUser();
    if (!user)
      throw new Error("Vous devez être connecté pour supprimer votre compte.");
    const result = authService.deleteAccount(user.id, password, reason);
    if (!result.success) throw new Error(result.message);
  }
}

export const demoAuthService = new DemoAuthService();
