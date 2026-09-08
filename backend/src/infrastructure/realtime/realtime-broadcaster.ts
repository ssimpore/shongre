import { getSupabaseAdminClient } from "../supabase/supabase-client.js";
import { logger } from "../logging/logger.js";
import { isBackendDemoMode } from "../../app/config/index.js";
import { realtimePubSub } from "./realtime-pub-sub.js";

export class RealtimeBroadcaster {
  async broadcastEvent(
    channelName: string,
    event: string,
    payload: Record<string, any>,
  ): Promise<void> {
    try {
      await realtimePubSub.publish({
        schemaVersion: 1,
        channelName,
        event,
        payload,
      });
    } catch (err: any) {
      logger.warn(`Failed to publish realtime event: ${err.message}`);
    }
    // Supabase Broadcast remains the hosted/native compatibility projection;
    // the application WebSocket gateway is fanned out through Redis above.
    if (isBackendDemoMode()) return;
    try {
      const supabase = getSupabaseAdminClient();
      const channel = supabase.channel(channelName);
      await channel.send({
        type: "broadcast",
        event,
        payload,
      });
      logger.debug(`Broadcast event sent to ${channelName}:${event}`);
    } catch (err: any) {
      logger.warn(`Failed to broadcast realtime event: ${err.message}`);
    }
  }
}

export const realtimeBroadcaster = new RealtimeBroadcaster();
