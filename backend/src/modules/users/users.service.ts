import { UserProfile } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { IUserRepository, repositories } from '../../infrastructure/database/repositories/index.js';

export class UsersService {
  constructor(private userRepo: IUserRepository = repositories.users) {}

  async getUserById(id: string): Promise<UserProfile | null> {
    return this.userRepo.findById(id);
  }

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new AppError({ code: 'NOT_FOUND', message: `User ${id} not found` });
    }
    return this.userRepo.update(id, updates);
  }
}

export const usersService = new UsersService();
