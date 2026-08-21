/**
 * SHONGRE MESSAGING CAPABILITY RESOLVER
 * Authoritative determination of participant capabilities, actions, and disabled states.
 */

import { UserProfile } from "../../types";
import { ConversationCapabilities } from "./messaging.types";

export interface ResolveCapabilitiesParams {
  viewer: UserProfile | null;
  counterpartId: string;
  isBlockedByViewer?: boolean;
  isBlockedByCounterpart?: boolean;
  conversationStatus?: "active" | "blocked" | "archived";
  isViewerSuspended?: boolean;
  isListingAvailable?: boolean;
}

export class MessagingCapabilitiesService {
  /**
   * Resolves viewer capabilities within a specific conversation context.
   */
  resolve(params: ResolveCapabilitiesParams): ConversationCapabilities {
    const {
      viewer,
      counterpartId,
      isBlockedByViewer = false,
      isBlockedByCounterpart = false,
      conversationStatus = "active",
      isViewerSuspended = false,
      isListingAvailable = true,
    } = params;

    // 1. Guest user cannot participate in messaging
    if (!viewer) {
      return {
        canRead: false,
        canSend: false,
        canAttach: false,
        canMakeOffer: false,
        canSchedulePickup: false,
        canBlock: false,
        canUnblock: false,
        canReport: false,
        isBlockedByViewer: false,
        isBlockedByCounterpart: false,
        disabledReason:
          "Veuillez vous connecter pour participer à cette conversation.",
      };
    }

    // 2. Suspended user
    if (isViewerSuspended || viewer.status === "suspended") {
      return {
        canRead: true,
        canSend: false,
        canAttach: false,
        canMakeOffer: false,
        canSchedulePickup: false,
        canBlock: false,
        canUnblock: false,
        canReport: false,
        isBlockedByViewer,
        isBlockedByCounterpart,
        disabledReason:
          "Votre compte est actuellement suspendu. Vous ne pouvez pas envoyer de messages.",
      };
    }

    // 3. Blocked relationship
    if (isBlockedByViewer) {
      return {
        canRead: true,
        canSend: false,
        canAttach: false,
        canMakeOffer: false,
        canSchedulePickup: false,
        canBlock: false,
        canUnblock: true,
        canReport: true,
        isBlockedByViewer: true,
        isBlockedByCounterpart,
        disabledReason:
          "Vous avez bloqué cet utilisateur. Débloquez-le pour lui envoyer un message.",
      };
    }

    if (isBlockedByCounterpart || conversationStatus === "blocked") {
      return {
        canRead: true,
        canSend: false,
        canAttach: false,
        canMakeOffer: false,
        canSchedulePickup: false,
        canBlock: true,
        canUnblock: false,
        canReport: true,
        isBlockedByViewer: false,
        isBlockedByCounterpart: true,
        disabledReason:
          "Cet utilisateur n'accepte plus les messages de cette conversation.",
      };
    }

    // 4. Archived / Closed conversation
    if (conversationStatus === "archived") {
      return {
        canRead: true,
        canSend: false,
        canAttach: false,
        canMakeOffer: false,
        canSchedulePickup: false,
        canBlock: true,
        canUnblock: false,
        canReport: true,
        isBlockedByViewer: false,
        isBlockedByCounterpart: false,
        disabledReason:
          "Cette conversation est archivée. Vous pouvez consulter l'historique en lecture seule.",
      };
    }

    // 5. Active normal conversation
    return {
      canRead: true,
      canSend: true,
      canAttach: true,
      canMakeOffer: true,
      canSchedulePickup: true,
      canBlock: true,
      canUnblock: false,
      canReport: true,
      isBlockedByViewer: false,
      isBlockedByCounterpart: false,
      disabledReason: undefined,
    };
  }
}

export const messagingCapabilitiesService = new MessagingCapabilitiesService();
