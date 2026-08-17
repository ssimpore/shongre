/**
 * SHONGRE NOTIFICATION REAL-TIME TRANSPORT CLIENT
 * Contract & Deterministic Demo Implementation for real-time notification subscriptions,
 * deduplication, reconnect states, and scenario broadcasts.
 */

import {
  Notification,
  RealtimeNotificationEvent,
  NotificationRealtimeHandler,
} from './notification.types';

export interface INotificationRealtimeClient {
  subscribe(userId: string, handler: NotificationRealtimeHandler): () => void;
  broadcast(event: RealtimeNotificationEvent): void;
  simulateIncomingNotification(notification: Notification, delayMs?: number): void;
  getConnectionStatus(): 'connecting' | 'connected' | 'reconnecting' | 'offline';
  setConnectionStatus(status: 'connecting' | 'connected' | 'reconnecting' | 'offline'): void;
}

export class DemoNotificationRealtimeClient implements INotificationRealtimeClient {
  private status: 'connecting' | 'connected' | 'reconnecting' | 'offline' = 'connected';
  private userListeners = new Map<string, Set<NotificationRealtimeHandler>>();
  private seenEventIds = new Set<string>();

  getConnectionStatus(): 'connecting' | 'connected' | 'reconnecting' | 'offline' {
    return this.status;
  }

  setConnectionStatus(status: 'connecting' | 'connected' | 'reconnecting' | 'offline'): void {
    this.status = status;
  }

  subscribe(userId: string, handler: NotificationRealtimeHandler): () => void {
    if (!this.userListeners.has(userId)) {
      this.userListeners.set(userId, new Set());
    }
    const handlers = this.userListeners.get(userId)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.userListeners.delete(userId);
      }
    };
  }

  broadcast(event: RealtimeNotificationEvent): void {
    // Deduplication check
    const eventKey = `${event.type}-${event.recipientId}-${event.payload?.id || event.timestamp}`;
    if (this.seenEventIds.has(eventKey)) {
      return;
    }
    this.seenEventIds.add(eventKey);

    const handlers = this.userListeners.get(event.recipientId);
    if (handlers) {
      handlers.forEach((h) => h(event));
    }
  }

  simulateIncomingNotification(notification: Notification, delayMs = 0): void {
    const trigger = () => {
      this.broadcast({
        type: 'notification.created',
        recipientId: notification.recipientId,
        payload: notification,
        timestamp: new Date().toISOString(),
      });
    };

    if (delayMs > 0) {
      setTimeout(trigger, delayMs);
    } else {
      trigger();
    }
  }
}

export const notificationRealtimeClient: INotificationRealtimeClient = new DemoNotificationRealtimeClient();
