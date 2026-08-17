import { getSupabaseAdminClient } from '../supabase/supabase-client.js';
import { logger } from '../logging/logger.js';

export class RealtimeBroadcaster {
  async broadcastEvent(channelName: string, event: string, payload: Record<string, any>): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
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
