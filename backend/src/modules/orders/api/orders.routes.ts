import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { ordersService } from "../orders.service.js";
import { assertOrderParticipant } from "./access-policy.js";
import { reviewsService } from "../../reviews/reviews.service.js";

export function registerOrdersRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/orders/purchases",
    permission("order.read.own"),
    async ({ principal }) => ordersService.getPurchases(principal.userId),
  );
  routes.addRoute(
    "GET",
    "/orders/sales",
    permission("order.manage.seller"),
    async ({ principal }) => ordersService.getSales(principal.userId),
  );
  routes.addRoute(
    "GET",
    "/orders/:id",
    permission("order.read.own"),
    async ({ principal, params }) => {
      const order = await ordersService.getOrderById(params.id);
      return assertOrderParticipant(principal, order);
    },
  );
  routes.addRoute(
    "POST",
    "/orders/direct-purchase/quote",
    permission("order.create"),
    async ({ principal, body }) =>
      ordersService.quoteDirectPurchase({
        listingId: body?.listingId,
        deliveryMethod: body?.deliveryMethod,
        buyerId: principal.userId,
      }),
  );
  routes.addRoute(
    "POST",
    "/orders/direct-purchase",
    permission("order.create"),
    async ({ principal, body }) =>
      ordersService.createDirectPurchase({
        ...body,
        buyerId: principal.userId,
      }),
  );
  routes.addRoute(
    "POST",
    "/orders/reservation",
    permission("order.create"),
    async ({ principal, body }) =>
      ordersService.createReservation({ ...body, buyerId: principal.userId }),
  );
  routes.addRoute(
    "POST",
    "/orders/:id/handover-code",
    permission("marketplace.customer.access"),
    async ({ principal, params }) =>
      ordersService.issueHandoverCode(params.id, principal.userId),
  );
  routes.addRoute(
    "POST",
    "/orders/:id/confirm-pin",
    permission("marketplace.customer.access"),
    async ({ principal, params, body }) =>
      ordersService.confirmHandoverPIN(params.id, principal.userId, body?.pin),
  );
  routes.addRoute(
    "POST",
    "/orders/:id/confirm-delivery",
    permission("marketplace.customer.access"),
    async ({ principal, params }) =>
      ordersService.confirmDeliveryReceived(params.id, principal.userId),
  );
  routes.addRoute(
    "POST",
    "/orders/:id/ship",
    permission("marketplace.customer.access"),
    async ({ principal, params, body }) =>
      ordersService.markShipped(params.id, principal.userId, body),
  );
  routes.addRoute(
    "POST",
    "/orders/:id/cancel",
    permission("marketplace.customer.access"),
    async ({ principal, params }) =>
      ordersService.cancelUnpaidOrder(params.id, principal.userId),
  );
  routes.addRoute(
    "POST",
    "/orders/:id/dispute",
    permission("marketplace.customer.access"),
    async ({ principal, params, body }) =>
      ordersService.openDispute(
        params.id,
        principal.userId,
        body?.reason,
        body?.details,
      ),
  );
  routes.addRoute(
    "POST",
    "/orders/:id/refund",
    permission("order.refund"),
    async ({ params, body }) => ordersService.refundOrder(params.id, body),
  );
  routes.addRoute(
    "GET",
    "/orders/:id/review",
    permission("review.create"),
    async ({ principal, params }) =>
      reviewsService.getOrderEligibility(params.id, principal.userId),
  );
}
