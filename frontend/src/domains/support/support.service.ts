/**
 * SHONGRE SUPPORT SERVICE
 * Pure domain utilities for support references, status formatting, and form validation.
 */

import {
  SupportRequestStatus,
  CreateSupportRequestInput,
} from "./support.types";
import type { SupportCaseStatus } from "@shongre/contracts/support";
import { deterministicCode } from "../../utilities/deterministic-id";

export interface SupportStatusInfo {
  label: string;
  variant: "neutral" | "primary" | "warning" | "success" | "urgent";
  description: string;
}

export class SupportService {
  /**
   * Generates a unique, friendly support ticket reference (e.g. SHG-849201).
   */
  generateReference(): string {
    return deterministicCode("SHG-", 6, [], "0123456789");
  }

  /**
   * Localized human-readable status details.
   */
  getStatusInfo(
    status: SupportRequestStatus | SupportCaseStatus,
  ): SupportStatusInfo {
    switch (status) {
      case "open":
      case "submitted":
        return {
          label: "Demande envoyée",
          variant: "primary",
          description:
            "Votre demande a bien été reçue et est en file d'attente.",
        };
      case "assigned":
      case "waiting_internal":
      case "in_progress":
        return {
          label: "En cours de traitement",
          variant: "warning",
          description:
            "Un conseiller du support Shongre examine actuellement votre dossier.",
        };
      case "waiting_customer":
      case "waiting_for_user":
        return {
          label: "Réponse attendue de votre part",
          variant: "urgent",
          description:
            "Le support a répondu et attend des précisions pour finaliser votre demande.",
        };
      case "resolved":
        return {
          label: "Résolue",
          variant: "success",
          description: "Cette demande a été résolue par nos équipes.",
        };
      case "closed":
        return {
          label: "Clôturée",
          variant: "neutral",
          description: "Cette demande est clôturée et archivée.",
        };
    }
  }

  /**
   * Validates support form inputs before submission.
   */
  validateSupportInput(input: Partial<CreateSupportRequestInput>): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    if (!input.category) {
      errors.category = "Veuillez sélectionner une catégorie.";
    }

    if (!input.reason) {
      errors.reason = "Veuillez préciser le motif de votre demande.";
    }

    if (!input.requesterName || !input.requesterName.trim()) {
      errors.requesterName = "Veuillez indiquer votre nom.";
    }

    if (!input.requesterEmail || !input.requesterEmail.trim()) {
      errors.requesterEmail = "Veuillez indiquer votre adresse email.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.requesterEmail.trim())
    ) {
      errors.requesterEmail = "Adresse email invalide.";
    }

    if (!input.subject || !input.subject.trim()) {
      errors.subject = "Veuillez préciser l'objet de votre demande.";
    }

    if (!input.description || input.description.trim().length < 10) {
      errors.description =
        "Veuillez détailler votre situation (au moins 10 caractères).";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export const supportService = new SupportService();
