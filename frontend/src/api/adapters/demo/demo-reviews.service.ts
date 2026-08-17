import { ReviewsServiceContract, SubmitReviewInput } from '../../contracts/reviews.contract';
import { userRepository } from '../../../repositories/user.repository';
import { storageService } from '../../../services/storage.service';
import { ReviewItem } from '../../../types';
import { simulateNetworkDelay } from '../../client/api-client.config';

export class DemoReviewsService implements ReviewsServiceContract {
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    await simulateNetworkDelay();
    return userRepository.getReviewsForUser(userId);
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewItem> {
    await simulateNetworkDelay();
    return userRepository.addReview({
      targetUserId: input.targetUserId,
      authorId: input.authorId,
      authorName: input.authorName || storageService.getCurrentUser()?.name || 'Utilisateur Shongre',
      rating: input.rating,
      comment: input.comment,
      listingTitle: input.listingTitle || 'Annonce Marketplace',
    });
  }
}

export const demoReviewsService = new DemoReviewsService();
