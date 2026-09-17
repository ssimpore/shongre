import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { reviewsService } from "../reviews.service.js";

export function registerReviewsRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/reviews/user/:userId",
    PUBLIC,
    async ({ params, principal }) =>
      // A signed-in reader also learns which reviews they already found
      // helpful; the list itself is the same public projection for everyone.
      reviewsService.getUserReviews(
        params.userId,
        principal.userId || undefined,
      ),
  );
  routes.addRoute(
    "POST",
    "/reviews/submit",
    permission("review.create"),
    async ({ principal, body }) =>
      reviewsService.submitReview(principal.userId, body),
  );
  routes.addRoute(
    "POST",
    "/reviews/:id/reply",
    permission("review.update.own"),
    async ({ principal, params, body }) =>
      reviewsService.replyToReview(principal.userId, params.id, body),
  );
  routes.addRoute(
    "PUT",
    "/reviews/:id/helpful",
    permission("review.create"),
    async ({ principal, params, body }) =>
      reviewsService.markHelpful(principal.userId, params.id, body),
  );
}
