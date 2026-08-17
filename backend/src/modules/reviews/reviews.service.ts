import { ReviewItem } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';

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
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    return [
      {
        id: 'rev_1',
        targetUserId: userId,
        authorId: 'user_thomas',
        authorName: 'Thomas Laurent',
        rating: 5,
        comment: 'Transaction parfaite, envoi soigné et très rapide !',
        listingTitle: 'Vélo Gravel Specialized Diverge',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewItem> {
    if (input.rating < 1 || input.rating > 5) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'La note doit être comprise entre 1 et 5 étoiles.' });
    }

    return {
      id: `rev_${Math.random().toString(36).substring(2, 10)}`,
      targetUserId: input.targetUserId,
      authorId: input.authorId,
      authorName: input.authorName || 'Acheteur Vérifié',
      rating: input.rating,
      comment: input.comment,
      listingTitle: input.listingTitle,
      createdAt: new Date().toISOString(),
    };
  }
}

export const reviewsService = new ReviewsService();
