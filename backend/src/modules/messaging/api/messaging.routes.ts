import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { messagingService } from "../messaging.service.js";
import { presenceService } from "../presence.service.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";
import {
  assertConversationParticipant,
  assertConversationAccess,
} from "./access-policy.js";

export function registerMessagingRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/messaging/presence",
    permission("message.read.own"),
    async ({ principal, body }) => presenceService.heartbeat(principal, body),
  );
  routes.addRoute(
    "GET",
    "/messaging/presence",
    permission("message.read.own"),
    async ({ principal, query }) =>
      presenceService.read(principal, query.get("conversationIds")),
  );
  routes.addRoute(
    "GET",
    "/messaging/conversations",
    permission("message.read.own"),
    async ({ principal, query }) =>
      messagingService.getUserConversations(principal.userId, {
        cursor: query.get("cursor") || undefined,
        limit: Number(query.get("limit") || 50),
      }),
  );
  routes.addRoute(
    "POST",
    "/messaging/conversations",
    permission("message.send"),
    async ({ principal, body, marketCode }) =>
      messagingService.createConversationForListing({
        listingId: body?.listingId,
        marketCode: requireApiRequestMarket(marketCode),
        buyerId: principal.userId,
        initialMessage: body?.initialMessage,
      }),
  );
  routes.addRoute(
    "GET",
    "/messaging/conversations/:id/messages",
    permission("message.read.own"),
    async ({ principal, params, query }) =>
      messagingService.getMessages(params.id, principal.userId, {
        cursor: query.get("cursor") || undefined,
        limit: query.get("limit") ? Number(query.get("limit")) : undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/messaging/conversations/:id/messages",
    permission("message.send"),
    async ({ principal, params, body }) =>
      messagingService.sendMessage({
        conversationId: params.id,
        senderId: principal.userId,
        text: body?.text,
        attachments: body?.attachments,
        offerPrice: body?.offerPrice,
      }),
  );
  routes.addRoute(
    "GET",
    "/messaging/conversations/:id",
    permission("message.read.own"),
    async ({ principal, params }) => {
      const conversation = await messagingService.getConversationById(
        params.id,
      );
      return assertConversationParticipant(principal, conversation);
    },
  );
  routes.addRoute(
    "POST",
    "/messaging/offer",
    permission("message.send"),
    async ({ principal, body }) => {
      await assertConversationAccess(principal, body?.conversationId);
      return messagingService.makeOffer({
        conversationId: body?.conversationId,
        senderId: principal.userId,
        amountMinor: body?.amountMinor,
      });
    },
  );
  routes.addRoute(
    "POST",
    "/messaging/offer-response",
    permission("message.send"),
    async ({ principal, body }) => {
      return messagingService.respondToOffer({
        offerId: body?.offerId,
        userId: principal.userId,
        accept: body?.accept,
      });
    },
  );
  routes.addRoute(
    "POST",
    "/messaging/offers/:id/counter",
    permission("message.send"),
    async ({ principal, params, body }) =>
      messagingService.makeOffer({
        conversationId: body?.conversationId,
        senderId: principal.userId,
        amountMinor: body?.amountMinor,
        parentOfferId: params.id,
      }),
  );
  routes.addRoute(
    "POST",
    "/messaging/offers/:id/withdraw",
    permission("message.send"),
    async ({ principal, params }) =>
      messagingService.withdrawOffer(params.id, principal.userId),
  );
  routes.addRoute(
    "POST",
    "/messaging/schedule-pickup",
    permission("message.send"),
    async ({ principal, body }) => {
      await assertConversationAccess(principal, body?.conversationId);
      return messagingService.schedulePickup(
        body?.conversationId,
        principal.userId,
        body?.date,
        body?.timeSlot,
        body?.address,
      );
    },
  );
  routes.addRoute(
    "POST",
    "/messaging/read",
    permission("message.read.own"),
    async ({ principal, body }) => {
      await assertConversationAccess(principal, body?.conversationId);
      await messagingService.markAsRead(body?.conversationId, principal.userId);
      return { success: true };
    },
  );
  routes.addRoute(
    "GET",
    "/messaging/blocked",
    permission("message.block"),
    async ({ principal }) => ({
      userIds: await messagingService.getBlockedUserIds(principal.userId),
    }),
  );
  routes.addRoute(
    "POST",
    "/messaging/block",
    permission("message.block"),
    async ({ principal, body }) => {
      await messagingService.blockUser(principal.userId, body?.targetUserId);
      return { success: true };
    },
  );
  routes.addRoute(
    "POST",
    "/messaging/unblock",
    permission("message.block"),
    async ({ principal, body }) => {
      await messagingService.unblockUser(principal.userId, body?.targetUserId);
      return { success: true };
    },
  );
}
