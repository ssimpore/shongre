import {
  MessagingServiceContract,
  SendMessageInput,
} from "../../contracts/messaging.contract";
import { httpClient } from "./http-client";
import { Conversation, Message } from "../../../types";

export class HttpMessagingService implements MessagingServiceContract {
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return httpClient.get<Conversation[]>(`/messaging/conversations/${userId}`);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return httpClient.get<Conversation>(
      `/messaging/conversations/detail/${id}`,
    );
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    return httpClient.post<Message>("/messaging/send", input);
  }

  async makeOffer(
    conversationId: string,
    senderId: string,
    senderName: string,
    amount: number,
  ): Promise<Message> {
    return httpClient.post<Message>("/messaging/offer", {
      conversationId,
      senderId,
      senderName,
      amount,
    });
  }

  async respondToOffer(
    conversationId: string,
    userId: string,
    userName: string,
    accept: boolean,
  ): Promise<Message> {
    return httpClient.post<Message>("/messaging/offer-response", {
      conversationId,
      userId,
      userName,
      accept,
    });
  }

  async schedulePickup(
    conversationId: string,
    date: string,
    timeSlot: string,
    address: string,
  ): Promise<Message> {
    return httpClient.post<Message>("/messaging/schedule-pickup", {
      conversationId,
      date,
      timeSlot,
      address,
    });
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    return httpClient.post<void>("/messaging/read", { conversationId, userId });
  }

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    return httpClient.post<void>("/messaging/block", { userId, targetUserId });
  }
}

export const httpMessagingService = new HttpMessagingService();
