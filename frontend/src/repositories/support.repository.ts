/**
 * SHONGRE SUPPORT REPOSITORY
 * Data-access contract & demo implementation for support cases and timeline messages.
 */

import {
  SupportRequest,
  CreateSupportRequestInput,
  SupportRequestQuery,
  SupportAttachment,
} from "../domains/support/support.types";
import { supportService } from "../domains/support/support.service";
import { storageService } from "../services/storage.service";
import { notificationRepository } from "./notification.repository";
import { notificationCatalogService } from "../domains/notifications/notification.catalog";

export interface ISupportRepository {
  createRequest(input: CreateSupportRequestInput): Promise<SupportRequest>;
  getRequests(
    query?: SupportRequestQuery,
  ): Promise<{ requests: SupportRequest[]; total: number }>;
  getRequestById(id: string): Promise<SupportRequest | null>;
  addReply(
    requestId: string,
    message: string,
    author: { id: string; name: string; type: "user" | "agent" },
    attachments?: SupportAttachment[],
  ): Promise<SupportRequest>;
  resolveRequest(requestId: string): Promise<SupportRequest>;
  closeRequest(requestId: string): Promise<SupportRequest>;
  simulateAgentReply(
    requestId: string,
    replyText?: string,
  ): Promise<SupportRequest>;
}

const INITIAL_SUPPORT_REQUESTS: SupportRequest[] = [
  {
    id: "req-101",
    reference: "SHG-748291",
    requesterId: "user_thomas",
    requesterName: "Thomas Laurent",
    requesterEmail: "thomas@example.fr",
    marketCode: "FR",
    category: "payment",
    reason: "payment_debited_unconfirmed",
    subject: "Paiement débité mais statut en attente",
    description:
      "Bonjour, j'ai effectué le paiement de 360 € pour le Fauteuil Scandinave. Le montant apparaît comme débité sur mon compte bancaire mais la commande indique « Paiement en attente ». Pouvez-vous vérifier ?",
    status: "waiting_for_user",
    priority: "high",
    context: {
      type: "transaction",
      transactionId: "tx-101",
      listingTitle: "Fauteuil Lounge Scandinave",
      amount: 360,
    },
    messages: [
      {
        id: "msg-s-1",
        authorType: "user",
        authorName: "Thomas Laurent",
        content:
          "Bonjour, j'ai effectué le paiement de 360 € pour le Fauteuil Scandinave. Le montant apparaît comme débité sur mon compte bancaire mais la commande indique « Paiement en attente ». Pouvez-vous vérifier ?",
        createdAt: "2026-08-16T14:30:00Z",
      },
      {
        id: "msg-s-2",
        authorType: "agent",
        authorName: "Hugo (Support Shongre)",
        content:
          "Bonjour Thomas, le prestataire a confirmé le paiement après quelques minutes. Pouvez-vous nous confirmer que le statut de la commande s'affiche maintenant à jour ?",
        createdAt: "2026-08-16T15:10:00Z",
      },
    ],
    createdAt: "2026-08-16T14:30:00Z",
    updatedAt: "2026-08-16T15:10:00Z",
    lastActivityAt: "2026-08-16T15:10:00Z",
  },
  {
    id: "req-102",
    reference: "SHG-910283",
    requesterId: "user_thomas",
    requesterName: "Thomas Laurent",
    requesterEmail: "thomas@example.fr",
    marketCode: "FR",
    category: "listing",
    reason: "listing_category_taxonomy",
    subject: "Suggestion de catégorie : Vélos Gravel",
    description:
      "Bonjour, je souhaite vendre un vélo Gravel et il n'y a que « VTT » ou « Vélos de route ». Serait-il possible d'ajouter la sous-catégorie Gravel ?",
    status: "resolved",
    priority: "low",
    messages: [
      {
        id: "msg-s-3",
        authorType: "user",
        authorName: "Thomas Laurent",
        content:
          "Bonjour, je souhaite vendre un vélo Gravel et il n'y a que « VTT » ou « Vélos de route ». Serait-il possible d'ajouter la sous-catégorie Gravel ?",
        createdAt: "2026-08-14T09:00:00Z",
      },
      {
        id: "msg-s-4",
        authorType: "agent",
        authorName: "Clémence (Équipe Taxonomie)",
        content:
          "Bonjour Thomas, merci beaucoup pour votre suggestion ! La sous-catégorie « Vélos Gravel » a été ajoutée à notre taxonomie officielle dans la section Mobilité & Vélos.",
        createdAt: "2026-08-14T11:20:00Z",
      },
    ],
    createdAt: "2026-08-14T09:00:00Z",
    updatedAt: "2026-08-14T11:20:00Z",
    lastActivityAt: "2026-08-14T11:20:00Z",
    resolvedAt: "2026-08-14T11:20:00Z",
  },
];

export class MockSupportRepository implements ISupportRepository {
  private getStorageRequests(): SupportRequest[] {
    return storageService.getSupportRequests<SupportRequest[]>(
      INITIAL_SUPPORT_REQUESTS,
    );
  }

  private saveStorageRequests(list: SupportRequest[]): void {
    storageService.saveSupportRequests<SupportRequest[]>(list);
  }

  async createRequest(
    input: CreateSupportRequestInput,
  ): Promise<SupportRequest> {
    const list = this.getStorageRequests();
    const now = new Date().toISOString();
    const newReq: SupportRequest = {
      id: `req-${Date.now()}`,
      reference: supportService.generateReference(),
      requesterId: input.requesterId,
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      marketCode: input.marketCode || "FR",
      category: input.category,
      reason: input.reason,
      subject: input.subject,
      description: input.description,
      context: input.context,
      attachments: input.attachments,
      status: "submitted",
      priority: input.priority || "normal",
      messages: [
        {
          id: `msg-s-${Date.now()}`,
          authorType: "user",
          authorName: input.requesterName,
          content: input.description,
          createdAt: now,
          attachments: input.attachments,
        },
      ],
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    list.unshift(newReq);
    this.saveStorageRequests(list);

    // Notify user if authenticated
    if (input.requesterId) {
      const notif = notificationCatalogService.createNotificationFromEvent({
        type: "moderation.action_required",
        recipientId: input.requesterId,
        overrides: {
          title: `Demande d'assistance ${newReq.reference} enregistrée`,
          body: `Votre demande « ${newReq.subject} » a bien été transmise à notre service client.`,
          actions: [
            {
              id: "view_req",
              label: "Suivre ma demande",
              destination: `/compte/support/${newReq.id}`,
            },
          ],
        },
      });
      await notificationRepository.createNotification(notif);
    }

    return newReq;
  }

  async getRequests(
    query?: SupportRequestQuery,
  ): Promise<{ requests: SupportRequest[]; total: number }> {
    let list = this.getStorageRequests();

    if (query?.requesterId) {
      list = list.filter((r) => r.requesterId === query.requesterId);
    }

    if (query?.status && query.status !== "all") {
      list = list.filter((r) => r.status === query.status);
    }

    if (query?.category) {
      list = list.filter((r) => r.category === query.category);
    }

    list.sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime(),
    );

    return {
      requests: list,
      total: list.length,
    };
  }

  async getRequestById(id: string): Promise<SupportRequest | null> {
    const list = this.getStorageRequests();
    return list.find((r) => r.id === id || r.reference === id) || null;
  }

  async addReply(
    requestId: string,
    message: string,
    author: { id: string; name: string; type: "user" | "agent" },
    attachments?: SupportAttachment[],
  ): Promise<SupportRequest> {
    const list = this.getStorageRequests();
    const req = list.find((r) => r.id === requestId);
    if (!req) throw new Error("Demande introuvable.");

    const now = new Date().toISOString();
    req.messages.push({
      id: `msg-s-${Date.now()}`,
      authorType: author.type,
      authorName: author.name,
      content: message,
      createdAt: now,
      attachments,
    });

    req.status = author.type === "agent" ? "waiting_for_user" : "in_progress";
    req.updatedAt = now;
    req.lastActivityAt = now;

    this.saveStorageRequests(list);
    return req;
  }

  async resolveRequest(requestId: string): Promise<SupportRequest> {
    const list = this.getStorageRequests();
    const req = list.find((r) => r.id === requestId);
    if (!req) throw new Error("Demande introuvable.");

    const now = new Date().toISOString();
    req.status = "resolved";
    req.resolvedAt = now;
    req.updatedAt = now;
    req.lastActivityAt = now;

    this.saveStorageRequests(list);
    return req;
  }

  async closeRequest(requestId: string): Promise<SupportRequest> {
    const list = this.getStorageRequests();
    const req = list.find((r) => r.id === requestId);
    if (!req) throw new Error("Demande introuvable.");

    const now = new Date().toISOString();
    req.status = "closed";
    req.updatedAt = now;
    req.lastActivityAt = now;

    this.saveStorageRequests(list);
    return req;
  }

  async simulateAgentReply(
    requestId: string,
    replyText = "Bonjour, notre équipe a bien pris en compte votre réponse et finalise le traitement de votre dossier.",
  ): Promise<SupportRequest> {
    return this.addReply(requestId, replyText, {
      id: "agent-hugo",
      name: "Hugo (Support Client Shongre)",
      type: "agent",
    });
  }
}

export const supportRepository: ISupportRepository =
  new MockSupportRepository();
