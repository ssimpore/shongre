import { isBackendDemoMode } from "../../../app/config/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { authRepository } from "./auth.repository.js";
import { repositories } from "./index.js";
import { databaseFailure } from "./repository-error.js";

interface PresenceAudience {
  conversationId: string;
  userId: string;
  visible: boolean;
}

export interface PresenceRepository {
  audience(
    viewerId: string,
    conversationIds: string[],
  ): Promise<PresenceAudience[]>;
  activeSessions(sessionIds: string[]): Promise<Map<string, string>>;
}

class DatabasePresenceRepository implements PresenceRepository {
  async audience(
    viewerId: string,
    conversationIds: string[],
  ): Promise<PresenceAudience[]> {
    const db = getSupabaseAdminClient();
    const [conversations, blocks] = await Promise.all([
      db
        .from("conversations")
        .select("id,buyer_id,seller_id")
        .in("id", conversationIds)
        .or(`buyer_id.eq.${viewerId},seller_id.eq.${viewerId}`),
      db
        .from("blocked_users")
        .select("blocker_id,blocked_id")
        .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`),
    ]);
    if (conversations.error)
      databaseFailure("presence.audience", conversations.error);
    if (blocks.error) databaseFailure("presence.blocks", blocks.error);
    const blocked = new Set(
      (blocks.data ?? []).map((row) =>
        row.blocker_id === viewerId ? row.blocked_id : row.blocker_id,
      ),
    );
    const counterparts = (conversations.data ?? []).map((row) => ({
      conversationId: row.id,
      userId: row.buyer_id === viewerId ? row.seller_id : row.buyer_id,
    }));
    if (!counterparts.length) return [];
    const ids = [...new Set(counterparts.map((item) => item.userId))];
    const [profiles, staff] = await Promise.all([
      db.from("profiles").select("id,status").in("id", ids),
      db.from("staff_memberships").select("user_id").in("user_id", ids),
    ]);
    if (profiles.error) databaseFailure("presence.profiles", profiles.error);
    if (staff.error) databaseFailure("presence.staff", staff.error);
    const eligible = new Set(
      (profiles.data ?? [])
        .filter((row) => row.status === "active")
        .map((row) => row.id),
    );
    const staffIds = new Set((staff.data ?? []).map((row) => row.user_id));
    return counterparts.map((item) => ({
      ...item,
      visible:
        eligible.has(item.userId) &&
        !staffIds.has(item.userId) &&
        !blocked.has(item.userId),
    }));
  }

  async activeSessions(sessionIds: string[]): Promise<Map<string, string>> {
    if (!sessionIds.length) return new Map();
    const db = getSupabaseAdminClient();
    const chunks = Array.from(
      { length: Math.ceil(sessionIds.length / 200) },
      (_, index) => sessionIds.slice(index * 200, index * 200 + 200),
    );
    const pages = await Promise.all(
      chunks.map((ids) =>
        db
          .from("auth_sessions")
          .select("id,user_id")
          .in("id", ids)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString()),
      ),
    );
    const result = new Map<string, string>();
    for (const page of pages) {
      if (page.error) databaseFailure("presence.sessions", page.error);
      for (const row of page.data ?? []) result.set(row.id, row.user_id);
    }
    return result;
  }
}

/** Uses the existing backend scenario repositories; never a client fallback. */
class TestPresenceRepository implements PresenceRepository {
  async audience(
    viewerId: string,
    conversationIds: string[],
  ): Promise<PresenceAudience[]> {
    const items: PresenceAudience[] = [];
    for (const id of conversationIds) {
      const conversation = await repositories.messaging.getConversationById(id);
      if (
        !conversation ||
        (conversation.buyerId !== viewerId &&
          conversation.sellerId !== viewerId)
      )
        continue;
      const userId =
        conversation.buyerId === viewerId
          ? conversation.sellerId
          : conversation.buyerId;
      const user = await repositories.users.findById(userId);
      items.push({
        conversationId: id,
        userId,
        visible:
          user?.status === "active" &&
          (!user.staffStatus || user.staffStatus === "none") &&
          !(await repositories.messaging.isBlockedBetween(viewerId, userId)),
      });
    }
    return items;
  }

  async activeSessions(sessionIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    for (const id of sessionIds) {
      const session = await authRepository.findSessionById(id);
      if (
        session &&
        !session.revokedAt &&
        Date.parse(session.expiresAt) > Date.now()
      )
        result.set(id, session.userId);
    }
    return result;
  }
}

export const presenceRepository: PresenceRepository = isBackendDemoMode()
  ? new TestPresenceRepository()
  : new DatabasePresenceRepository();
