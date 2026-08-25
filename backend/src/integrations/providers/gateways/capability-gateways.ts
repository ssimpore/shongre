import { createHash } from "node:crypto";
import type {
  AiGateway,
  AiGenerationRequest,
  AiGenerationResult,
  EmailDeliveryGateway,
  MailboxGateway,
  MailboxMessageDraft,
  MailboxMessageResult,
  MailboxThreadMessage,
  ProviderInvocationContext,
} from "@shongre/contracts/provider-gateways";
import { config } from "../../../app/config/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  RemoteEmailDeliveryGateway,
  RemoteGenerativeAiGateway,
} from "./remote-capability-gateways.js";

function deterministicExternalId(prefix: string, values: unknown[]) {
  return `${prefix}_${createHash("sha256")
    .update(JSON.stringify(values))
    .digest("hex")
    .slice(0, 24)}`;
}

function unavailable(capability: string): never {
  throw new AppError({
    code: "NETWORK_ERROR",
    statusCode: 503,
    message: "Aucune connexion fournisseur autorisée n’est disponible.",
    details: { capability, reason: "provider_unavailable" },
  });
}

/** Deterministic demo gateway. It never performs an external call. */
export class DemoGenerativeAiGateway implements AiGateway {
  async generate(
    context: ProviderInvocationContext,
    request: AiGenerationRequest,
  ): Promise<AiGenerationResult> {
    const accountName = String(
      request.safeContext.accountName || "ce prospect",
    );
    const nextStep = String(request.safeContext.nextStep || "faire le point");
    const textByTask: Record<AiGenerationRequest["task"], string> = {
      "crm.follow_up_draft": `Bonjour, je reviens vers vous au sujet de ${accountName}. Nous vous proposons de ${nextStep}. Bien cordialement,`,
      "crm.activity_summary": `Synthèse déterministe : ${accountName} est en suivi commercial. Prochaine action recommandée : ${nextStep}.`,
      "crm.account_enrichment": `Aucune source externe n’a été consultée en mode démonstration pour ${accountName}.`,
      "crm.next_action": `Prochaine action : ${nextStep}.`,
      "crm.duplicate_assistance": `Vérifiez le domaine, l’email et le téléphone avant de fusionner ${accountName}.`,
      "marketing.campaign_draft":
        "Proposition déterministe : une introduction concise, une preuve concrète et un appel à l’action unique.",
      "marketing.subject_generation":
        "Les nouveautés Shongre choisies pour vous",
      "marketing.preview_generation":
        "Découvrez cette semaine nos sélections, conseils et nouveautés.",
      "marketing.content_rewrite":
        "Contenu reformulé en mode démonstration, sans donnée externe.",
      "marketing.ab_generation":
        "Variante B : Découvrez les nouveautés Shongre dès aujourd’hui",
      "marketing.translation":
        "Translation demo output — no external provider was called.",
      "marketing.performance_analysis":
        "Analyse déterministe : privilégier les clics et conversions plutôt que les ouvertures seules.",
      "marketing.segment_suggestion":
        "Segment suggéré : profils abonnés et engagés au cours des 90 derniers jours.",
    };
    return {
      text: textByTask[request.task],
      model: "shongre-demo-deterministic-v1",
      providerRequestId: deterministicExternalId("demo_ai", [
        context.correlationId,
        request.task,
      ]),
      inputUnits: 0,
      outputUnits: 0,
    };
  }
}

export class UnavailableGenerativeAiGateway implements AiGateway {
  async generate(): Promise<AiGenerationResult> {
    return unavailable("ai.generate");
  }
}

/** Demo mailbox supports send/thread contracts without network or secrets. */
export class DemoMailboxGateway implements MailboxGateway {
  async sendMessage(
    context: ProviderInvocationContext,
    draft: MailboxMessageDraft,
  ): Promise<MailboxMessageResult> {
    const id = deterministicExternalId("demo_mail", [
      context.connectionId,
      draft.idempotencyKey,
    ]);
    return {
      externalMessageId: id,
      externalThreadId: draft.replyToMessageId || `thread_${id.slice(-16)}`,
      acceptedAt: "2026-08-25T12:00:00.000Z",
    };
  }

  async syncThread(
    _context: ProviderInvocationContext,
    externalThreadId: string,
  ): Promise<{ items: MailboxThreadMessage[]; nextCursor?: string }> {
    return {
      items: [
        {
          externalMessageId: `demo_sync_${externalThreadId}`,
          externalThreadId,
          direction: "OUTBOUND",
          sender: "lea@demo.shongre.local",
          recipients: ["prospect@example.test"],
          subject: "Suivi de notre échange",
          textPreview: "Message de démonstration — aucun email réel envoyé.",
          occurredAt: "2026-08-25T12:00:00.000Z",
        },
      ],
    };
  }
}

export class UnavailableMailboxGateway implements MailboxGateway {
  async sendMessage(): Promise<MailboxMessageResult> {
    return unavailable("mailbox.send");
  }
  async syncThread(): Promise<{
    items: MailboxThreadMessage[];
    nextCursor?: string;
  }> {
    return unavailable("mailbox.read");
  }
}

export class DemoEmailDeliveryGateway implements EmailDeliveryGateway {
  async testConnection() {
    return {
      status: "HEALTHY" as const,
      checkedAt: "2026-08-25T12:00:00.000Z",
    };
  }

  async getCapabilities() {
    return {
      batch: true,
      providerTemplates: false,
      customHeaders: true,
      webhookEvents: ["ACCEPTED", "DELIVERED", "BOUNCED_HARD", "COMPLAINT"],
      maxBatchSize: 100,
    };
  }

  async send(
    context: ProviderInvocationContext,
    request: Parameters<EmailDeliveryGateway["send"]>[1],
  ) {
    return {
      externalMessageId: deterministicExternalId("demo_delivery", [
        context.connectionId,
        request.idempotencyKey,
      ]),
      acceptedAt: "2026-08-25T12:00:00.000Z",
    };
  }
}

export class UnavailableEmailDeliveryGateway implements EmailDeliveryGateway {
  async testConnection(): Promise<never> {
    return unavailable("email.delivery.health");
  }
  async getCapabilities(): Promise<never> {
    return unavailable("email.delivery.capabilities");
  }
  async send(): Promise<{ externalMessageId: string; acceptedAt: string }> {
    return unavailable("email.delivery");
  }
}

export interface CapabilityGatewayContainer {
  ai: AiGateway;
  mailbox: MailboxGateway;
  emailDelivery: EmailDeliveryGateway;
}

export function createCapabilityGatewayContainer(): CapabilityGatewayContainer {
  if (config.dataMode === "demo") {
    return {
      ai: new DemoGenerativeAiGateway(),
      mailbox: new DemoMailboxGateway(),
      emailDelivery: new DemoEmailDeliveryGateway(),
    };
  }
  // Database/API mode is deliberately fail-closed until a resolved connection
  // is bound to a concrete adapter. It never borrows the demo implementation.
  return {
    ai: new RemoteGenerativeAiGateway(),
    mailbox: new UnavailableMailboxGateway(),
    emailDelivery: new RemoteEmailDeliveryGateway(),
  };
}

export const capabilityGateways = createCapabilityGatewayContainer();
