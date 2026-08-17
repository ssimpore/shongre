import { UserProfile } from '../../shared/types/index.js';
import { DEMO_PROFILES } from '../auth/auth.service.js';
import { AppError } from '../../shared/errors/app-error.js';

export class UsersService {
  async getUserById(id: string): Promise<UserProfile | null> {
    const user = Object.values(DEMO_PROFILES).find((u) => u.id === id);
    return user || null;
  }

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new AppError({ code: 'NOT_FOUND', message: `User ${id} not found` });
    }
    return { ...existing, ...updates };
  }
}

export const usersService = new UsersService();
