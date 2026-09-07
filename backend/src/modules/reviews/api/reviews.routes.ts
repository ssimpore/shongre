import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { reviewsService } from "../reviews.service.js";

export function registerReviewsRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/reviews/user/:userId", PUBLIC, async ({ params }) =>
    reviewsService.getUserReviews(params.userId),
  );
  routes.addRoute(
    "POST",
    "/reviews/submit",
    permission("review.create"),
    async ({ principal, body }) =>
      reviewsService.submitReview(principal.userId, body),
  );
}
