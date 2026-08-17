import { ReviewsServiceContract, SubmitReviewInput } from '../../contracts/reviews.contract';
import { httpClient } from './http-client';
import { ReviewItem } from '../../../types';

export class HttpReviewsService implements ReviewsServiceContract {
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    return httpClient.get<ReviewItem[]>(`/reviews/user/${userId}`);
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewItem> {
    return httpClient.post<ReviewItem>('/reviews/submit', input);
  }
}

export const httpReviewsService = new HttpReviewsService();
