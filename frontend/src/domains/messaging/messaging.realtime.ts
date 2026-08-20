/**
 * SHONGRE MESSAGING REAL-TIME TRANSPORT CLIENT
 * Contract & Demo Implementation for real-time WebSocket / SSE simulation.
 *
 * ARCHITECTURAL RULE:
 * UI components interact with IMessagingRealtimeClient, NOT raw WebSockets.
 * Future backends can swap DemoMessagingRealtimeClient for WebSocketMessagingRealtimeClient
 * with ZERO changes to the messaging views.
 */

import {
  RealtimeConnectionStatus,
  MessagingRealtimeEvent,
  RealtimeEventHandler,
  UserTimelineMessage,
  SystemTimelineEvent,
  TypingState,
} from './messaging.types';

export interface IMessagingRealtimeClient {
  getConnectionStatus(): RealtimeConnectionStatus;
  onConnectionStatusChange(handler: (status: RealtimeConnectionStatus) => void): () => void;
  subscribeToConversation(conversationId: string, handler: RealtimeEventHandler): () => void;
  subscribeToInbox(userId: string, handler: RealtimeEventHandler): () => void;
  sendTyping(conversationId: string, userId: string, userName: string, isTyping: boolean): void;
  broadcastMessage(message: UserTimelineMessage): void;
  broadcastSystemEvent(event: SystemTimelineEvent): void;
  simulateSellerAutoReply(conversationId: string, sellerId: string, sellerName: string, promptText?: string): void;
}

export class DemoMessagingRealtimeClient implements IMessagingRealtimeClient {
  private status: RealtimeConnectionStatus = 'connected';
  private statusListeners = new Set<(status: RealtimeConnectionStatus) => void>();
  private conversationListeners = new Map<string, Set<RealtimeEventHandler>>();
  private inboxListeners = new Map<string, Set<RealtimeEventHandler>>();

  getConnectionStatus(): RealtimeConnectionStatus {
    return this.status;
  }

  setConnectionStatus(newStatus: RealtimeConnectionStatus): void {
    this.status = newStatus;
    this.statusListeners.forEach((fn) => fn(newStatus));
  }

  onConnectionStatusChange(handler: (status: RealtimeConnectionStatus) => void): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  subscribeToConversation(conversationId: string, handler: RealtimeEventHandler): () => void {
    if (!this.conversationListeners.has(conversationId)) {
      this.conversationListeners.set(conversationId, new Set());
    }
    const handlers = this.conversationListeners.get(conversationId)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.conversationListeners.delete(conversationId);
      }
    };
  }

  subscribeToInbox(userId: string, handler: RealtimeEventHandler): () => void {
    if (!this.inboxListeners.has(userId)) {
      this.inboxListeners.set(userId, new Set());
    }
    const handlers = this.inboxListeners.get(userId)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.inboxListeners.delete(userId);
      }
    };
  }

  sendTyping(conversationId: string, userId: string, userName: string, isTyping: boolean): void {
    const event: MessagingRealtimeEvent = {
      type: 'typing',
      conversationId,
      payload: { userId, userName, isTyping } as TypingState,
      timestamp: new Date().toISOString(),
    };

    this.dispatchToConversation(conversationId, event);
  }

  broadcastMessage(message: UserTimelineMessage): void {
    const event: MessagingRealtimeEvent = {
      type: 'new_message',
      conversationId: message.conversationId,
      payload: message,
      timestamp: message.createdAt,
    };

    this.dispatchToConversation(message.conversationId, event);
    this.dispatchToAllInboxes(event);
  }

  broadcastSystemEvent(systemEvent: SystemTimelineEvent): void {
    const event: MessagingRealtimeEvent = {
      type: 'system_event',
      conversationId: systemEvent.conversationId,
      payload: systemEvent,
      timestamp: systemEvent.createdAt,
    };

    this.dispatchToConversation(systemEvent.conversationId, event);
    this.dispatchToAllInboxes(event);
  }

  /**
   * Simulates an intelligent, realistic seller reply for demo testing.
   */
  simulateSellerAutoReply(
    conversationId: string,
    sellerId: string,
    sellerName: string,
    promptText = 'Bonjour, oui, l\'article est bien disponible !'
  ): void {
    // 1. Trigger typing indicator after 800ms
    setTimeout(() => {
      this.sendTyping(conversationId, sellerId, sellerName, true);
    }, 800);

    // 2. Deliver message after 2400ms and turn off typing
    setTimeout(() => {
      this.sendTyping(conversationId, sellerId, sellerName, false);

      const replyMessage: UserTimelineMessage = {
        itemType: 'message',
        id: `msg-sim-${Date.now()}`,
        conversationId,
        senderId: sellerId,
        senderName: sellerName,
        content: promptText,
        contentType: 'text',
        status: 'delivered',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      this.broadcastMessage(replyMessage);
    }, 2400);
  }

  private dispatchToConversation(conversationId: string, event: MessagingRealtimeEvent): void {
    const handlers = this.conversationListeners.get(conversationId);
    if (handlers) {
      handlers.forEach((h) => h(event));
    }
  }

  private dispatchToAllInboxes(event: MessagingRealtimeEvent): void {
    this.inboxListeners.forEach((handlers) => {
      handlers.forEach((h) => h(event));
    });
  }
}

export const messagingRealtimeClient: IMessagingRealtimeClient = new DemoMessagingRealtimeClient();
