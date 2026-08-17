/**
 * SHONGRE MESSAGING SERVICE
 * Pure domain utilities for timeline grouping, date separators,
 * inbox filtering, and unread aggregations.
 */

import {
  TimelineItem,
  UserTimelineMessage,
  SystemTimelineEvent,
  ConversationPreview,
  InboxFilterTab,
} from './messaging.types';
import { Message, Conversation } from '../../types';

export interface TimelineDateGroup {
  dateLabel: string;
  items: TimelineItem[];
}

export class MessagingService {
  /**
   * Formats an ISO date into a localized timeline date separator label.
   */
  getDateSeparatorLabel(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const now = new Date();

      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) return 'Aujourd\'hui';

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      if (isYesterday) return 'Hier';

      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      }).format(date);
    } catch {
      return 'Date récente';
    }
  }

  /**
   * Groups chronological timeline items into date-separated sections.
   */
  groupTimelineByDate(items: TimelineItem[]): TimelineDateGroup[] {
    const groups: TimelineDateGroup[] = [];
    const map = new Map<string, TimelineItem[]>();

    items.forEach((item) => {
      const label = this.getDateSeparatorLabel(item.createdAt);
      if (!map.has(label)) {
        map.set(label, []);
      }
      map.get(label)!.push(item);
    });

    map.forEach((groupedItems, dateLabel) => {
      groups.push({
        dateLabel,
        items: groupedItems,
      });
    });

    return groups;
  }

  /**
   * Filters and searches inbox conversations.
   */
  filterConversations(
    conversations: ConversationPreview[],
    filter: InboxFilterTab,
    searchQuery: string,
    currentUserId: string
  ): ConversationPreview[] {
    let result = [...conversations];

    // 1. Filter by Tab
    if (filter === 'unread') {
      result = result.filter((c) => c.unreadCount > 0);
    } else if (filter === 'purchases') {
      // Viewer is buyer
      result = result.filter((c) => c.context?.type === 'listing' && (c as any).buyerId === currentUserId);
    } else if (filter === 'sales') {
      // Viewer is seller
      result = result.filter((c) => c.context?.type === 'listing' && (c as any).sellerId === currentUserId);
    } else if (filter === 'transactions') {
      result = result.filter((c) => c.context?.type === 'transaction' || (c as any).transactionId);
    }

    // 2. Search Query (Counterpart name or Listing title)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const nameMatch = c.counterpart.name.toLowerCase().includes(q);
        const titleMatch =
          c.context?.type === 'listing'
            ? c.context.listingTitle.toLowerCase().includes(q)
            : (c as any).listingTitle?.toLowerCase().includes(q);
        return nameMatch || titleMatch;
      });
    }

    // 3. Sort most recent first
    return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  /**
   * Calculates total unread message count across conversations.
   */
  calculateTotalUnread(conversations: Array<{ unreadCount?: number }>): number {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }

  /**
   * Converts a raw storage Message into a canonical TimelineItem.
   */
  mapMessageToTimelineItem(msg: Message): TimelineItem {
    if (msg.type === 'system') {
      return {
        itemType: 'system_event',
        id: msg.id,
        conversationId: msg.conversationId,
        eventType: 'safety_notice',
        title: 'Information Système',
        description: msg.content,
        createdAt: msg.createdAt,
      };
    }

    return {
      itemType: 'message',
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.content,
      contentType: msg.type || 'text',
      status: msg.isRead ? 'read' : 'delivered',
      offerAmount: msg.offerAmount,
      attachment: msg.attachmentUrl
        ? {
            id: `att-${msg.id}`,
            type: msg.attachmentType || 'image',
            url: msg.attachmentUrl,
          }
        : undefined,
      isRead: !!msg.isRead,
      createdAt: msg.createdAt,
    };
  }
}

export const messagingService = new MessagingService();
