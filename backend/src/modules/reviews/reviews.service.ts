import { ReviewItem } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { IReviewRepository, repositories } from '../../infrastructure/database/repositories/index.js';

export interface SubmitReviewInput {
  targetUserId: string;
  authorId: string;
  authorName?: string;
  rating: number;
  comment: string;
  listingTitle?: string;
  listingId?: string;
  transactionId?: string;
}

export class ReviewsService {
  constructor(private reviewRepo: IReviewRepository = repositories.reviews) {}

  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    return this.reviewRepo.getUserReviews(userId);
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewItem> {
    if (input.rating < 1 || input.rating > 5) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'La note doit être comprise entre 1 et 5 étoiles.' });
    }

    const review: ReviewItem = {
      id: `rev_${Math.random().toString(36).substring(2, 10)}`,
      targetUserId: input.targetUserId,
      authorId: input.authorId,
      authorName: input.authorName || 'Acheteur Vérifié',
      rating: input.rating,
      comment: input.comment,
      listingTitle: input.listingTitle,
      createdAt: new Date().toISOString(),
    };

    return this.reviewRepo.save(review);
  }
}

export const reviewsService = new ReviewsService();
