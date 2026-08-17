import { isProSeller } from '../domains/user/user.domain';
import { UserProfile, UserRole, PlatformRole, ReviewItem } from '../types';
import { storageService } from '../services/storage.service';
import { DEMO_USERS, INITIAL_REVIEWS } from '../mocks/initialDemoData';
import { authorizationService } from '../security/authorization.service';
import { auditService } from '../security/audit.service';

export interface IUserRepository {
  getCurrentUser(): Promise<UserProfile | null>;
  getAllUsers(): Promise<UserProfile[]>;
  getUserById(id: string): Promise<UserProfile | null>;
  getUserByStoreSlug(slug: string): Promise<UserProfile | null>;
  getUserBySlug(slug: string): Promise<UserProfile | null>;
  getUserBySlugOrId(slugOrId: string): Promise<UserProfile | null>;
  getProSellerBySlug(slug: string): Promise<UserProfile | null>;
  updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  switchDemoRole(role: UserRole): Promise<UserProfile | null>;
  switchDemoUser(userKey: string): Promise<UserProfile | null>;
  suspendUser(userId: string, reason: string): Promise<UserProfile>;
  reactivateUser(userId: string): Promise<UserProfile>;
  verifyUser(userId: string, options: { approve: boolean; notes?: string }): Promise<UserProfile>;
  updateUserRole(userId: string, newRole: PlatformRole): Promise<UserProfile>;
  getReviewsForUser(userId: string): Promise<ReviewItem[]>;
  addReview(review: Omit<ReviewItem, 'id' | 'createdAt'>): Promise<ReviewItem>;
  getAllProSellers(): Promise<UserProfile[]>;
  isFollowing(sellerId: string): boolean;
  toggleFollow(sellerId: string): boolean;
  isBlocked(userId: string): boolean;
  toggleBlock(userId: string): boolean;
  reportUser(report: { targetUserId: string; targetUserName?: string; reason: string; comment?: string }): Promise<void>;
}

export class MockUserRepository implements IUserRepository {
  async getCurrentUser(): Promise<UserProfile | null> {
    return storageService.getCurrentUser();
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const usersMap = storageService.getUsers();
    return Object.values(usersMap);
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const all = Object.values(storageService.getUsers());
    return all.find((u) => u.id === id) || null;
  }

  async getUserByStoreSlug(slug: string): Promise<UserProfile | null> {
    const all = Object.values(storageService.getUsers());
    const clean = slug.toLowerCase().trim();
    return all.find((u) => u.storeSlug?.toLowerCase() === clean) || null;
  }

  async getUserBySlug(slug: string): Promise<UserProfile | null> {
    const all = Object.values(storageService.getUsers());
    const clean = slug.toLowerCase().trim();
    return (
      all.find(
        (u) =>
          u.slug?.toLowerCase() === clean ||
          u.storeSlug?.toLowerCase() === clean ||
          u.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === clean ||
          u.companyName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === clean
      ) || null
    );
  }

  async getUserBySlugOrId(slugOrId: string): Promise<UserProfile | null> {
    if (!slugOrId) return null;
    const clean = slugOrId.toLowerCase().trim();
    const all = Object.values(storageService.getUsers());

    // 1. Direct ID match
    const byId = all.find((u) => u.id.toLowerCase() === clean);
    if (byId) return byId;

    // 2. Direct storeSlug match
    const byStoreSlug = all.find((u) => u.storeSlug?.toLowerCase() === clean);
    if (byStoreSlug) return byStoreSlug;

    // 3. Direct user slug match
    const bySlug = all.find((u) => u.slug?.toLowerCase() === clean);
    if (bySlug) return bySlug;

    // 4. Normalized name match
    const byNormalizedName = all.find((u) => {
      const nameSlug = u.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const companySlug = u.companyName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return nameSlug === clean || companySlug === clean;
    });
    if (byNormalizedName) return byNormalizedName;

    return null;
  }

  async getProSellerBySlug(slug: string): Promise<UserProfile | null> {
    const user = await this.getUserBySlugOrId(slug);
    return user && isProSeller(user) ? user : user;
  }

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const currentUser = storageService.getCurrentUser();
    const user = await this.getUserById(id);
    if (!user) throw new Error('Utilisateur non trouvé');

    const isStaff = authorizationService.can(currentUser, 'user.manage');
    if (!isStaff) {
      authorizationService.assertCan(currentUser, 'profile.update.own', user);
    }

    const updated = { ...user, ...updates };
    storageService.saveUser(updated);
    DEMO_USERS[id] = updated;
    return updated;
  }

  async switchDemoRole(role: UserRole): Promise<UserProfile | null> {
    storageService.setCurrentRole(role);
    return storageService.getCurrentUser(role);
  }

  async switchDemoUser(userKey: string): Promise<UserProfile | null> {
    storageService.setCurrentUserKey(userKey);
    return storageService.getCurrentUser(userKey);
  }

  async suspendUser(userId: string, reason: string): Promise<UserProfile> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, 'user.suspend');

    const user = await this.getUserById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    const updated: UserProfile = {
      ...user,
      isSuspended: true,
      status: 'suspended',
      suspendedReason: reason,
      suspendedAt: new Date().toISOString(),
    };

    storageService.saveUser(updated);

    auditService.logEvent({
      actorId: currentUser!.id,
      actorName: currentUser!.name,
      actorRole: currentUser!.primaryRole || currentUser!.role,
      targetId: user.id,
      targetName: user.name,
      action: 'user_suspended',
      details: `Suspension du compte utilisateur : "${reason}".`,
      previousValue: { status: user.status },
      newValue: { status: 'suspended', reason },
    });

    return updated;
  }

  async reactivateUser(userId: string): Promise<UserProfile> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, 'user.reactivate');

    const user = await this.getUserById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    const updated: UserProfile = {
      ...user,
      isSuspended: false,
      status: 'active',
      suspendedReason: undefined,
      suspendedAt: undefined,
    };

    storageService.saveUser(updated);

    auditService.logEvent({
      actorId: currentUser!.id,
      actorName: currentUser!.name,
      actorRole: currentUser!.primaryRole || currentUser!.role,
      targetId: user.id,
      targetName: user.name,
      action: 'user_reactivated',
      details: 'Réactivation du compte suite à levée des restrictions.',
      previousValue: { status: 'suspended' },
      newValue: { status: 'active' },
    });

    return updated;
  }

  async verifyUser(userId: string, options: { approve: boolean; notes?: string }): Promise<UserProfile> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, 'user.verify');

    const user = await this.getUserById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    const updated: UserProfile = {
      ...user,
      isVerified: options.approve,
      professionalVerification: isProSeller(user) ? {
        status: options.approve ? 'verified' : 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser!.name,
        notes: options.notes,
      } : undefined,
      identityVerification: {
        status: options.approve ? 'verified' : 'rejected',
        verifiedAt: options.approve ? new Date().toISOString() : undefined,
      },
    };

    storageService.saveUser(updated);

    auditService.logEvent({
      actorId: currentUser!.id,
      actorName: currentUser!.name,
      actorRole: currentUser!.primaryRole || currentUser!.role,
      targetId: user.id,
      targetName: user.name,
      action: options.approve ? 'verification_approved' : 'verification_rejected',
      details: options.approve
        ? `Validation des justificatifs et attribution du badge vérifié. Note : ${options.notes || 'Conforme'}.`
        : `Rejet des justificatifs d'immatriculation / identité. Motif : ${options.notes || 'Non conforme'}.`,
    });

    return updated;
  }

  async updateUserRole(userId: string, newRole: PlatformRole): Promise<UserProfile> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, 'role.manage');

    const user = await this.getUserById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    const updated: UserProfile = {
      ...user,
      primaryRole: newRole,
      role: newRole,
    };

    storageService.saveUser(updated);

    auditService.logEvent({
      actorId: currentUser!.id,
      actorName: currentUser!.name,
      actorRole: currentUser!.primaryRole || currentUser!.role,
      targetId: user.id,
      targetName: user.name,
      action: 'role_assigned',
      details: `Modification du rôle plateforme : de [${user.role}] vers [${newRole}].`,
      previousValue: { role: user.role },
      newValue: { role: newRole },
    });

    return updated;
  }

  async getReviewsForUser(userId: string): Promise<ReviewItem[]> {
    return INITIAL_REVIEWS.filter((r) => r.targetUserId === userId);
  }

  async addReview(review: Omit<ReviewItem, 'id' | 'createdAt'>): Promise<ReviewItem> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, 'review.create');

    const newReview: ReviewItem = {
      ...review,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    INITIAL_REVIEWS.unshift(newReview);

    // Update target user's reviewCount and rating
    const targetUser = await this.getUserById(review.targetUserId);
    if (targetUser) {
      const allTargetReviews = INITIAL_REVIEWS.filter((r) => r.targetUserId === review.targetUserId);
      const totalScore = allTargetReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = Math.round((totalScore / allTargetReviews.length) * 10) / 10;

      const updatedUser: UserProfile = {
        ...targetUser,
        rating: avgRating,
        reviewCount: allTargetReviews.length,
      };
      storageService.saveUser(updatedUser);
    }

    return newReview;
  }

  async getAllProSellers(): Promise<UserProfile[]> {
    const all = Object.values(storageService.getUsers());
    return all.filter((u) => isProSeller(u) || u.role === 'pro_seller');
  }

  isFollowing(sellerId: string): boolean {
    return storageService.isFollowingSeller(sellerId);
  }

  toggleFollow(sellerId: string): boolean {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, 'favorite.manage.own');
    return storageService.toggleFollowSeller(sellerId);
  }

  isBlocked(userId: string): boolean {
    return storageService.isUserBlocked(userId);
  }

  toggleBlock(userId: string): boolean {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, 'message.block');
    return storageService.toggleBlockUser(userId);
  }

  async reportUser(report: { targetUserId: string; targetUserName?: string; reason: string; comment?: string }): Promise<void> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, 'report.create');
    storageService.saveUserReport(report);
  }
}

export const userRepository: IUserRepository = new MockUserRepository();
