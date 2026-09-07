import type { ReviewItem } from "../../../shared/types/index.js";
import type { Database } from "../../../generated/database.types.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

type ReviewRecord = ReviewItem & { orderId: string };
export interface IReviewRepository {
  getUserReviews(userId: string): Promise<ReviewItem[]>;
  getOrderReview(orderId: string, authorId: string): Promise<ReviewItem | null>;
  save(review: ReviewRecord): Promise<ReviewItem>;
}

const publicReview = ({
  orderId: _orderId,
  ...review
}: ReviewRecord): ReviewItem => review;
const duplicateReview = () =>
  new AppError({
    code: "CONFLICT",
    message: "Vous avez déjà laissé un avis pour cette commande.",
  });

export class DemoReviewRepository implements IReviewRepository {
  private reviews = new Map<string, ReviewItem | ReviewRecord>();
  constructor(initialReviews: ReviewItem[] = []) {
    this.reset(initialReviews);
  }
  reset(initialReviews: ReviewItem[] = []) {
    this.reviews.clear();
    initialReviews.forEach((review) =>
      this.reviews.set(review.id, { ...review }),
    );
  }
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    return [...this.reviews.values()]
      .filter((review) => review.targetUserId === userId)
      .map((review) =>
        "orderId" in review ? publicReview(review) : { ...review },
      );
  }
  async getOrderReview(
    orderId: string,
    authorId: string,
  ): Promise<ReviewItem | null> {
    const review = [...this.reviews.values()].find(
      (review) =>
        "orderId" in review &&
        review.orderId === orderId &&
        review.authorId === authorId,
    );
    return review && "orderId" in review ? publicReview(review) : null;
  }
  async save(review: ReviewRecord): Promise<ReviewItem> {
    if (
      [...this.reviews.values()].some(
        (existing) =>
          "orderId" in existing &&
          existing.orderId === review.orderId &&
          existing.authorId === review.authorId,
      )
    )
      throw duplicateReview();
    this.reviews.set(review.id, { ...review });
    return publicReview(review);
  }
}

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"] & {
  author: { name: string } | null;
  purchase: { buyer_id: string; seller_id: string; status: string } | null;
};
const projection =
  "id,target_user_id,author_id,rating,comment,listing_title,created_at,order_id,author:profiles!reviews_author_id_fkey(name),purchase:orders!reviews_order_id_fkey(buyer_id,seller_id,status)";

export class PostgresReviewRepository implements IReviewRepository {
  private mapReview(row: ReviewRow): ReviewItem {
    const purchase = row.purchase;
    const verified = Boolean(
      purchase &&
      purchase.status === "completed" &&
      purchase.buyer_id !== purchase.seller_id &&
      ((row.author_id === purchase.buyer_id &&
        row.target_user_id === purchase.seller_id) ||
        (row.author_id === purchase.seller_id &&
          row.target_user_id === purchase.buyer_id)),
    );
    return {
      id: row.id,
      targetUserId: row.target_user_id,
      authorId: row.author_id,
      authorName: row.author?.name || "Utilisateur Shongre",
      rating: row.rating,
      comment: row.comment,
      listingTitle: row.listing_title || "",
      createdAt: row.created_at,
      verifiedTransaction: verified,
      ...(verified
        ? {
            reviewerRole:
              row.author_id === purchase!.buyer_id
                ? ("buyer" as const)
                : ("seller" as const),
          }
        : {}),
    };
  }
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    const { data, error } = await getSupabaseAdminClient()
      .from("reviews")
      .select(projection)
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data) databaseFailure("reviews.getUserReviews", error);
    return data.map((row) => this.mapReview(row));
  }
  async getOrderReview(
    orderId: string,
    authorId: string,
  ): Promise<ReviewItem | null> {
    const { data, error } = await getSupabaseAdminClient()
      .from("reviews")
      .select(projection)
      .eq("order_id", orderId)
      .eq("author_id", authorId)
      .maybeSingle();
    if (error) databaseFailure("reviews.getOrderReview", error);
    return data ? this.mapReview(data) : null;
  }
  async save(review: ReviewRecord): Promise<ReviewItem> {
    const { data, error } = await getSupabaseAdminClient()
      .from("reviews")
      .insert({
        id: review.id,
        order_id: review.orderId,
        target_user_id: review.targetUserId,
        author_id: review.authorId,
        rating: review.rating,
        comment: review.comment,
        listing_title: review.listingTitle,
        created_at: review.createdAt,
      })
      .select(projection)
      .single();
    if (error?.code === "23505") throw duplicateReview();
    if (error?.code === "23514")
      throw new AppError({
        code: "CONFLICT",
        message: "Cette commande ne permet plus de publier un avis.",
      });
    if (error || !data) databaseFailure("reviews.save", error);
    return this.mapReview(data);
  }
}
