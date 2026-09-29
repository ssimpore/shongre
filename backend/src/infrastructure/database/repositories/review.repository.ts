import type { ReviewItem } from "../../../shared/types/index.js";
import type { Database } from "../../../generated/database.types.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";
import { DemoOrderRepository } from "./order.repository.js";

/** A stored review: the public projection plus the facts the service decides on. */
export type ReviewRecord = ReviewItem & {
  orderId: string;
  /** Set by moderation; a removed review is invisible and uncounted. */
  removedAt?: string;
};

/** A participant of a completed exchange who is still owed a review reminder. */
export interface DueReviewReminder {
  orderId: string;
  listingId: string;
  recipientId: string;
  counterpartId: string;
  recipientRole: "buyer" | "seller";
}

export interface IReviewRepository {
  /**
   * Visible reviews left for a person, newest first. `viewerId` marks which
   * of them the signed-in reader already found helpful.
   */
  getUserReviews(userId: string, viewerId?: string): Promise<ReviewItem[]>;
  getOrderReview(orderId: string, authorId: string): Promise<ReviewItem | null>;
  findById(reviewId: string): Promise<ReviewRecord | null>;
  save(review: ReviewRecord): Promise<ReviewItem>;
  /** The recipient's one answer; a second call replaces the first. */
  saveReply(input: {
    reviewId: string;
    comment: string;
    at: string;
  }): Promise<ReviewItem>;
  /**
   * Idempotent: the caller states the vote it wants. Rejects the review's
   * author and recipient. Returns the resulting count.
   */
  setHelpful(input: {
    reviewId: string;
    userId: string;
    helpful: boolean;
  }): Promise<number>;
  /** Moderation removal: soft, so an appeal can still read the review. */
  remove(input: {
    reviewId: string;
    actorId: string;
    at: string;
  }): Promise<void>;
  /**
   * Records that a review reminder for this participant and order is being
   * sent. Answers false when one was already recorded, which is what keeps a
   * second worker from sending it again.
   */
  claimReminder(input: { orderId: string; userId: string }): Promise<boolean>;
  /**
   * Participants of exchanges completed within the window who have neither
   * been reminded nor written a review of that exchange — buyer before
   * seller, oldest exchange first. A claimed reminder leaves the list.
   */
  listDueReminders(input: {
    notBeforeIso: string;
    notAfterIso: string;
    limit: number;
  }): Promise<DueReviewReminder[]>;
}

const publicReview = (
  { orderId: _orderId, removedAt: _removedAt, ...review }: ReviewRecord,
  viewerMarkedHelpful?: boolean,
): ReviewItem => ({
  ...review,
  ...(viewerMarkedHelpful === undefined ? {} : { viewerMarkedHelpful }),
});
const duplicateReview = () =>
  new AppError({
    code: "CONFLICT",
    message: "Vous avez déjà laissé un avis pour cette commande.",
  });
const reviewNotFound = () =>
  new AppError({ code: "NOT_FOUND", message: "Avis introuvable." });
const participantVote = () =>
  new AppError({
    code: "VALIDATION_ERROR",
    message:
      "Vous ne pouvez pas évaluer un avis concernant votre propre échange.",
  });

export class DemoReviewRepository implements IReviewRepository {
  private reviews = new Map<string, ReviewItem | ReviewRecord>();
  private helpfulVotes = new Map<string, Set<string>>();
  private reminders = new Set<string>();
  constructor(
    initialReviews: ReviewItem[] = [],
    private readonly orders: DemoOrderRepository = new DemoOrderRepository(),
  ) {
    this.reset(initialReviews);
  }
  reset(initialReviews: ReviewItem[] = []) {
    this.reviews.clear();
    this.helpfulVotes.clear();
    this.reminders.clear();
    initialReviews.forEach((review) =>
      this.reviews.set(review.id, { ...review }),
    );
  }
  private project(
    review: ReviewItem | ReviewRecord,
    viewerId?: string,
  ): ReviewItem {
    const viewerMarkedHelpful = viewerId
      ? this.helpfulVotes.get(review.id)?.has(viewerId) === true
      : undefined;
    return "orderId" in review
      ? publicReview(review, viewerMarkedHelpful)
      : {
          ...review,
          ...(viewerMarkedHelpful === undefined ? {} : { viewerMarkedHelpful }),
        };
  }
  private isVisible(review: ReviewItem | ReviewRecord): boolean {
    return !("removedAt" in review && review.removedAt);
  }
  async getUserReviews(
    userId: string,
    viewerId?: string,
  ): Promise<ReviewItem[]> {
    return [...this.reviews.values()]
      .filter(
        (review) => review.targetUserId === userId && this.isVisible(review),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((review) => this.project(review, viewerId));
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
  async findById(reviewId: string): Promise<ReviewRecord | null> {
    const review = this.reviews.get(reviewId);
    if (!review) return null;
    return { orderId: "", ...review };
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
    this.reviews.set(review.id, { ...review, helpfulCount: 0 });
    return publicReview({ ...review, helpfulCount: 0 });
  }
  async saveReply(input: {
    reviewId: string;
    comment: string;
    at: string;
  }): Promise<ReviewItem> {
    const review = this.reviews.get(input.reviewId);
    if (!review || !this.isVisible(review)) throw reviewNotFound();
    const updated = {
      ...review,
      reply: {
        comment: input.comment,
        createdAt: review.reply?.createdAt ?? input.at,
        updatedAt: input.at,
      },
    };
    this.reviews.set(review.id, updated);
    return this.project(updated);
  }
  async setHelpful(input: {
    reviewId: string;
    userId: string;
    helpful: boolean;
  }): Promise<number> {
    const review = this.reviews.get(input.reviewId);
    if (!review || !this.isVisible(review)) throw reviewNotFound();
    if ([review.authorId, review.targetUserId].includes(input.userId))
      throw participantVote();
    const votes = this.helpfulVotes.get(review.id) ?? new Set<string>();
    if (input.helpful) votes.add(input.userId);
    else votes.delete(input.userId);
    this.helpfulVotes.set(review.id, votes);
    const updated = { ...review, helpfulCount: votes.size };
    this.reviews.set(review.id, updated);
    return votes.size;
  }
  async remove(input: {
    reviewId: string;
    actorId: string;
    at: string;
  }): Promise<void> {
    const review = this.reviews.get(input.reviewId);
    if (!review) throw reviewNotFound();
    this.reviews.set(review.id, {
      orderId: "",
      ...review,
      removedAt: input.at,
    });
  }
  async claimReminder(input: {
    orderId: string;
    userId: string;
  }): Promise<boolean> {
    const key = `${input.orderId}:${input.userId}`;
    if (this.reminders.has(key)) return false;
    this.reminders.add(key);
    return true;
  }
  async listDueReminders(input: {
    notBeforeIso: string;
    notAfterIso: string;
    limit: number;
  }): Promise<DueReviewReminder[]> {
    const due: DueReviewReminder[] = [];
    for (const order of this.orders.completedBetween(
      input.notBeforeIso,
      input.notAfterIso,
    )) {
      for (const [recipientRole, recipientId, counterpartId] of [
        ["buyer", order.buyerId, order.sellerId],
        ["seller", order.sellerId, order.buyerId],
      ] as const) {
        if (
          this.reminders.has(`${order.id}:${recipientId}`) ||
          (await this.getOrderReview(order.id, recipientId))
        )
          continue;
        due.push({
          orderId: order.id,
          listingId: order.listingId,
          recipientId,
          counterpartId,
          recipientRole,
        });
      }
    }
    return due.slice(0, Math.max(1, Math.min(input.limit, 500)));
  }
}

type ReviewRow = Omit<
  Database["public"]["Tables"]["reviews"]["Row"],
  "removed_by"
> & {
  author: { name: string } | null;
  purchase: { buyer_id: string; seller_id: string; status: string } | null;
};
const projection =
  "id,target_user_id,author_id,rating,comment,listing_title,created_at,order_id,removed_at,reply_comment,reply_created_at,reply_updated_at,helpful_count,author:profiles!reviews_author_id_fkey(name),purchase:orders!reviews_order_id_fkey(buyer_id,seller_id,status)";

export class PostgresReviewRepository implements IReviewRepository {
  private mapReview(row: ReviewRow, viewerMarkedHelpful?: boolean): ReviewItem {
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
      helpfulCount: Number(row.helpful_count || 0),
      ...(viewerMarkedHelpful === undefined ? {} : { viewerMarkedHelpful }),
      ...(row.reply_comment && row.reply_created_at
        ? {
            reply: {
              comment: row.reply_comment,
              createdAt: row.reply_created_at,
              updatedAt: row.reply_updated_at ?? row.reply_created_at,
            },
          }
        : {}),
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
  private mapRecord(row: ReviewRow): ReviewRecord {
    return {
      ...this.mapReview(row),
      orderId: row.order_id ?? "",
      ...(row.removed_at ? { removedAt: row.removed_at } : {}),
    };
  }
  async getUserReviews(
    userId: string,
    viewerId?: string,
  ): Promise<ReviewItem[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("reviews")
      .select(projection)
      .eq("target_user_id", userId)
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data) databaseFailure("reviews.getUserReviews", error);
    if (!viewerId || !data.length) {
      return data.map((row) => this.mapReview(row));
    }
    const { data: votes, error: votesError } = await supabase
      .from("review_helpful_votes")
      .select("review_id")
      .eq("user_id", viewerId)
      .in(
        "review_id",
        data.map((row) => row.id),
      );
    if (votesError) databaseFailure("reviews.getUserReviews.votes", votesError);
    const voted = new Set((votes || []).map((vote) => vote.review_id));
    return data.map((row) => this.mapReview(row, voted.has(row.id)));
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
  async findById(reviewId: string): Promise<ReviewRecord | null> {
    const { data, error } = await getSupabaseAdminClient()
      .from("reviews")
      .select(projection)
      .eq("id", reviewId)
      .maybeSingle();
    if (error) databaseFailure("reviews.findById", error);
    return data ? this.mapRecord(data) : null;
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
  async saveReply(input: {
    reviewId: string;
    comment: string;
    at: string;
  }): Promise<ReviewItem> {
    const supabase = getSupabaseAdminClient();
    const { data: current, error: readError } = await supabase
      .from("reviews")
      .select("reply_created_at")
      .eq("id", input.reviewId)
      .is("removed_at", null)
      .maybeSingle();
    if (readError) databaseFailure("reviews.saveReply", readError);
    if (!current) throw reviewNotFound();
    const { data, error } = await supabase
      .from("reviews")
      .update({
        reply_comment: input.comment,
        reply_created_at: current.reply_created_at ?? input.at,
        reply_updated_at: input.at,
      })
      .eq("id", input.reviewId)
      .is("removed_at", null)
      .select(projection)
      .maybeSingle();
    if (error) databaseFailure("reviews.saveReply", error);
    if (!data) throw reviewNotFound();
    return this.mapReview(data);
  }
  async setHelpful(input: {
    reviewId: string;
    userId: string;
    helpful: boolean;
  }): Promise<number> {
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "set_review_helpful_vote",
      {
        p_review_id: input.reviewId,
        p_user_id: input.userId,
        p_helpful: input.helpful,
      },
    );
    if (error?.code === "P0002") throw reviewNotFound();
    if (error?.code === "23514") throw participantVote();
    if (error) databaseFailure("reviews.setHelpful", error);
    return Number(data || 0);
  }
  async remove(input: {
    reviewId: string;
    actorId: string;
    at: string;
  }): Promise<void> {
    const { data, error } = await getSupabaseAdminClient()
      .from("reviews")
      .update({ removed_at: input.at, removed_by: input.actorId })
      .eq("id", input.reviewId)
      .select("id")
      .maybeSingle();
    if (error) databaseFailure("reviews.remove", error);
    if (!data) throw reviewNotFound();
  }
  async claimReminder(input: {
    orderId: string;
    userId: string;
  }): Promise<boolean> {
    const { data, error } = await getSupabaseAdminClient()
      .from("order_review_reminders")
      .upsert(
        { order_id: input.orderId, user_id: input.userId },
        { onConflict: "order_id,user_id", ignoreDuplicates: true },
      )
      .select("order_id");
    if (error) databaseFailure("reviews.claimReminder", error);
    return (data || []).length > 0;
  }
  async listDueReminders(input: {
    notBeforeIso: string;
    notAfterIso: string;
    limit: number;
  }): Promise<DueReviewReminder[]> {
    const { data, error } = await getSupabaseAdminClient().rpc(
      "list_due_review_reminders",
      {
        p_not_before: input.notBeforeIso,
        p_not_after: input.notAfterIso,
        p_limit: input.limit,
      },
    );
    if (error) databaseFailure("reviews.listDueReminders", error);
    return (data || []).map((row) => ({
      orderId: row.order_id,
      listingId: row.listing_id,
      recipientId: row.recipient_id,
      counterpartId: row.counterpart_id,
      recipientRole: row.recipient_role === "seller" ? "seller" : "buyer",
    }));
  }
}
