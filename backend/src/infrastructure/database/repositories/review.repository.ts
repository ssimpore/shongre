import { ReviewItem } from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface IReviewRepository {
  getUserReviews(userId: string): Promise<ReviewItem[]>;
  save(review: ReviewItem): Promise<ReviewItem>;
}

export const CANONICAL_DEMO_REVIEWS: ReviewItem[] = [
  {
    id: "rev_1",
    targetUserId: "user_camille",
    authorId: "user_thomas",
    authorName: "Thomas Laurent",
    rating: 5,
    comment: "Transaction parfaite, envoi soigné et très rapide !",
    listingTitle: "Vélo Gravel Specialized Diverge",
    createdAt: new Date().toISOString(),
  },
];

export class DemoReviewRepository implements IReviewRepository {
  private reviews: Map<string, ReviewItem> = new Map();

  constructor(initialReviews: ReviewItem[] = CANONICAL_DEMO_REVIEWS) {
    this.reset(initialReviews);
  }

  reset(initialReviews: ReviewItem[] = CANONICAL_DEMO_REVIEWS) {
    this.reviews.clear();
    initialReviews.forEach((r) => this.reviews.set(r.id, { ...r }));
  }

  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    const userReviews = Array.from(this.reviews.values()).filter(
      (r) => r.targetUserId === userId,
    );
    if (userReviews.length === 0) {
      return [
        {
          id: `rev_init_${userId}`,
          targetUserId: userId,
          authorId: "user_thomas",
          authorName: "Thomas Laurent",
          rating: 5,
          comment:
            "Très bonne expérience, vendeur réactif et produit conforme.",
          listingTitle: "Article de qualité",
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return userReviews.map((r) => ({ ...r }));
  }

  async save(review: ReviewItem): Promise<ReviewItem> {
    this.reviews.set(review.id, { ...review });
    return { ...review };
  }
}

export class PostgresReviewRepository implements IReviewRepository {
  private mapRowToReview(row: any): ReviewItem {
    return {
      id: row.id,
      targetUserId: row.target_user_id,
      authorId: row.author_id,
      authorName: row.author?.name || "Acheteur Vérifié",
      rating: Number(row.rating),
      comment: row.comment,
      listingTitle: row.listing_title || undefined,
      createdAt: row.created_at,
    };
  }

  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("*, author:author_id(name)")
        .eq("target_user_id", userId)
        .order("created_at", { ascending: false });

      if (error || !data) databaseFailure("reviews.getUserReviews", error);
      return data.map((r: any) => this.mapRowToReview(r));
    } catch (error) {
      databaseFailure("reviews.getUserReviews", error);
    }
  }

  async save(review: ReviewItem): Promise<ReviewItem> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: review.id.includes("-") ? review.id : undefined,
      target_user_id: review.targetUserId,
      author_id: review.authorId,
      rating: review.rating,
      comment: review.comment,
      listing_title: review.listingTitle || null,
      created_at: review.createdAt,
    };

    const { data, error } = await (supabase
      .from("reviews")
      .insert(payload as any)
      .select("*, author:author_id(name)")
      .single() as any);
    if (error || !data) {
      throw new Error(`Failed to save review: ${error?.message}`);
    }
    return this.mapRowToReview(data);
  }
}
