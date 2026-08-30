import { describe, expect, it } from "vitest";
import { DemoSupportRepository } from "../../src/infrastructure/database/repositories/support.repository.js";
import { SupportService } from "../../src/modules/support/support.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const customer: Principal = {
  userId: "customer-1",
  email: "customer@example.test",
  role: "buyer",
  accountType: "individual",
  status: "active",
  capabilities: ["marketplace.customer.access"],
};

const otherCustomer: Principal = {
  ...customer,
  userId: "customer-2",
  email: "other@example.test",
};

const supportAgent: Principal = {
  userId: "support-1",
  email: "support@example.test",
  role: "buyer",
  accountType: "individual",
  staffStatus: "active",
  staffRole: "support_agent",
  status: "active",
  mfaVerified: true,
  capabilities: ["support.case.read", "support.case.manage"],
};

const moderator: Principal = {
  ...supportAgent,
  userId: "moderator-1",
  email: "moderator@example.test",
  staffRole: "moderator",
  capabilities: ["moderation.review"],
};

function createService() {
  return new SupportService(new DemoSupportRepository());
}

describe("SupportService", () => {
  it("creates an account-owned case with server-derived priority and SLA", async () => {
    const service = createService();
    const created = await service.createCase(customer, {
      category: "payment",
      subject: "Paiement débité deux fois",
      description:
        "Le paiement de la commande apparaît deux fois sur mon relevé bancaire.",
      orderId: "order-1",
    });

    expect(created).toMatchObject({
      requesterId: customer.userId,
      category: "payment",
      priority: "high",
      status: "open",
    });
    expect(new Date(created.slaDueAt).getTime()).toBeGreaterThan(
      new Date(created.createdAt).getTime(),
    );
  });

  it("prevents an unrelated customer from enumerating a support case", async () => {
    const service = createService();
    const created = await service.createCase(customer, {
      category: "account",
      subject: "Accès à mon compte",
      description:
        "Je ne parviens plus à modifier les informations de mon profil Shongre.",
    });

    await expect(
      service.getCase(otherCustomer, created.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps internal notes invisible to the requester", async () => {
    const service = createService();
    const created = await service.createCase(customer, {
      category: "listing",
      subject: "Annonce en cours d’examen",
      description:
        "Mon annonce reste en cours d’examen et je souhaite connaître son statut.",
    });
    await service.addNote(supportAgent, created.id, {
      visibility: "internal",
      body: "Vérifier la pièce jointe dans la file de modération.",
    });
    await service.addNote(supportAgent, created.id, {
      visibility: "customer",
      body: "Votre annonce est toujours en cours de vérification.",
    });

    const customerView = await service.getCase(customer, created.id);
    const staffView = await service.getCase(supportAgent, created.id);
    expect(customerView.notes).toHaveLength(1);
    expect(customerView.notes[0]?.visibility).toBe("customer");
    expect(staffView.notes).toHaveLength(2);
  });

  it("requires support permission and an audited reason for queue changes", async () => {
    const service = createService();
    const created = await service.createCase(customer, {
      category: "technical",
      subject: "Erreur lors du chargement",
      description:
        "La page de mes annonces ne termine pas son chargement sur mon appareil.",
    });

    await expect(
      service.updateCase(customer, created.id, {
        status: "assigned",
        reason: "Attribution de la demande au support",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      service.updateCase(supportAgent, created.id, {
        status: "assigned",
        assigneeId: supportAgent.userId,
        reason: "Attribution de la demande au support technique",
      }),
    ).resolves.toMatchObject({
      status: "assigned",
      assigneeId: supportAgent.userId,
    });
  });

  it("does not let Staff fall back to customer support-case authority", async () => {
    const service = createService();
    const created = await service.createCase(customer, {
      category: "account",
      subject: "Question de compte client",
      description:
        "Je souhaite obtenir de l’aide au sujet de mon espace de compte client.",
    });

    await expect(
      service.createCase(supportAgent, {
        category: "account",
        subject: "Demande Staff interdite",
        description:
          "Une identité Staff ne doit jamais créer une demande comme cliente.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.getCase(moderator, created.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      service.addNote(moderator, created.id, {
        visibility: "customer",
        body: "Réponse non autorisée.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
