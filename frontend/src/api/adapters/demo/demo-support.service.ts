import type {
  SupportCase,
  SupportCaseCreate,
  SupportCaseFilter,
  SupportCaseMetrics,
  SupportCaseNote,
  SupportCaseNoteCreate,
  SupportCaseUpdate,
} from "@shongre/contracts/support";
import type {
  SupportCaseDetail,
  SupportServiceContract,
} from "../../contracts/support.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { storageService } from "../../../services/storage.service";
import { isStaffSeparatedSubject } from "@shongre/contracts/access-control";
import { requireDemoCapability } from "./demo-authorization";

const CASES_KEY = "shongre_demo_support_cases_v2";
const NOTES_KEY = "shongre_demo_support_notes_v2";
const COUNTER_KEY = "shongre_demo_support_counter_v2";

const SEEDED_CASES: SupportCase[] = [
  {
    id: "support-case-payment-101",
    reference: "SHG-00748291",
    requesterId: "user_thomas",
    category: "payment",
    priority: "high",
    status: "waiting_customer",
    subject: "Paiement débité mais statut en attente",
    description:
      "Le paiement de la commande apparaît comme débité, mais son statut reste en attente.",
    orderId: "tx-101",
    slaDueAt: "2026-08-26T14:30:00.000Z",
    lastCustomerReplyAt: "2026-08-25T14:30:00.000Z",
    lastStaffReplyAt: "2026-08-25T15:10:00.000Z",
    createdAt: "2026-08-25T14:30:00.000Z",
    updatedAt: "2026-08-25T15:10:00.000Z",
  },
  {
    id: "support-case-taxonomy-102",
    reference: "SHG-00910283",
    requesterId: "user_thomas",
    assigneeId: "user_support_hugo",
    category: "listing",
    priority: "low",
    status: "resolved",
    subject: "Suggestion de catégorie : Vélos Gravel",
    description:
      "Je souhaite vendre un vélo Gravel et proposer une catégorie plus précise aux acheteurs.",
    slaDueAt: "2026-08-28T09:00:00.000Z",
    lastCustomerReplyAt: "2026-08-24T09:00:00.000Z",
    lastStaffReplyAt: "2026-08-24T11:20:00.000Z",
    resolvedAt: "2026-08-24T11:20:00.000Z",
    createdAt: "2026-08-24T09:00:00.000Z",
    updatedAt: "2026-08-24T11:20:00.000Z",
  },
];

const SEEDED_NOTES: SupportCaseNote[] = [
  {
    id: "support-note-payment-customer",
    caseId: "support-case-payment-101",
    authorId: "user_thomas",
    visibility: "customer",
    body: "Pouvez-vous vérifier la confirmation de ce paiement ?",
    createdAt: "2026-08-25T14:30:00.000Z",
  },
  {
    id: "support-note-payment-agent",
    caseId: "support-case-payment-101",
    authorId: "user_support_hugo",
    visibility: "customer",
    body: "Le prestataire a confirmé le paiement. Pouvez-vous vérifier le statut de la commande ?",
    createdAt: "2026-08-25T15:10:00.000Z",
  },
];

function readCases(): SupportCase[] {
  return storageService.get(CASES_KEY, SEEDED_CASES);
}

function writeCases(cases: SupportCase[]) {
  storageService.set(CASES_KEY, cases);
}

function readNotes(): SupportCaseNote[] {
  return storageService.get(NOTES_KEY, SEEDED_NOTES);
}

function writeNotes(notes: SupportCaseNote[]) {
  storageService.set(NOTES_KEY, notes);
}

function currentActor() {
  const user = storageService.getCurrentUser();
  return {
    id: user?.id ?? "guest",
    isStaff: isStaffSeparatedSubject(user),
  };
}

function nextIdentity(prefix: string) {
  const next = storageService.get(COUNTER_KEY, 0) + 1;
  storageService.set(COUNTER_KEY, next);
  return `${prefix}-${String(next).padStart(6, "0")}`;
}

function priorityFor(category: SupportCaseCreate["category"]) {
  return category === "payment" || category === "safety" ? "high" : "normal";
}

function resolutionMinutes(priority: SupportCase["priority"]) {
  return { low: 4320, normal: 2880, high: 720, urgent: 240 }[priority];
}

export class DemoSupportService implements SupportServiceContract {
  async createCase(input: SupportCaseCreate): Promise<SupportCase> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    const actor = currentActor();
    const now = new Date();
    const priority = priorityFor(input.category);
    const value: SupportCase = {
      ...input,
      id: nextIdentity("support-case"),
      reference: nextIdentity("SHG"),
      requesterId: actor.id,
      priority,
      status: "open",
      slaDueAt: new Date(
        now.getTime() + resolutionMinutes(priority) * 60_000,
      ).toISOString(),
      lastCustomerReplyAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    writeCases([value, ...readCases()]);
    const note: SupportCaseNote = {
      id: nextIdentity("support-note"),
      caseId: value.id,
      authorId: actor.id,
      visibility: "customer",
      body: input.description,
      createdAt: now.toISOString(),
    };
    writeNotes([...readNotes(), note]);
    return structuredClone(value);
  }

  async listOwnCases(): Promise<SupportCase[]> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    const actor = currentActor();
    return readCases()
      .filter((item) => item.requesterId === actor.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getCase(caseId: string): Promise<SupportCaseDetail> {
    await simulateNetworkDelay();
    const actor = currentActor();
    requireDemoCapability(
      actor.isStaff ? "support.case.read" : "marketplace.customer.access",
    );
    const supportCase = readCases().find((item) => item.id === caseId);
    if (
      !supportCase ||
      (!actor.isStaff && supportCase.requesterId !== actor.id)
    ) {
      throw new Error("Demande d’assistance introuvable.");
    }
    const notes = readNotes().filter(
      (note) =>
        note.caseId === caseId &&
        (actor.isStaff || note.visibility === "customer"),
    );
    return {
      case: structuredClone(supportCase),
      notes: structuredClone(notes),
    };
  }

  async listCases(filter: SupportCaseFilter = {}): Promise<SupportCase[]> {
    await simulateNetworkDelay();
    requireDemoCapability("support.case.read");
    return readCases()
      .filter(
        (item) =>
          (!filter.requesterId || item.requesterId === filter.requesterId) &&
          (!filter.assigneeId || item.assigneeId === filter.assigneeId) &&
          (!filter.status || item.status === filter.status) &&
          (!filter.priority || item.priority === filter.priority),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async updateCase(caseId: string, input: SupportCaseUpdate) {
    await simulateNetworkDelay();
    requireDemoCapability("support.case.manage");
    const cases = readCases();
    const index = cases.findIndex((item) => item.id === caseId);
    if (index < 0) throw new Error("Demande d’assistance introuvable.");
    const now = new Date().toISOString();
    const previous = cases[index];
    const status = input.status ?? previous.status;
    const updated: SupportCase = {
      ...previous,
      status,
      priority: input.priority ?? previous.priority,
      assigneeId:
        input.assigneeId === null
          ? undefined
          : (input.assigneeId ?? previous.assigneeId),
      resolvedAt:
        status === "resolved" || status === "closed"
          ? (previous.resolvedAt ?? now)
          : undefined,
      updatedAt: now,
    };
    cases[index] = updated;
    writeCases(cases);
    return structuredClone(updated);
  }

  async addNote(caseId: string, input: SupportCaseNoteCreate) {
    await simulateNetworkDelay();
    const actor = currentActor();
    requireDemoCapability(
      actor.isStaff ? "support.case.manage" : "marketplace.customer.access",
    );
    const cases = readCases();
    const index = cases.findIndex((item) => item.id === caseId);
    const supportCase = cases[index];
    if (
      !supportCase ||
      (!actor.isStaff && supportCase.requesterId !== actor.id) ||
      (!actor.isStaff && input.visibility === "internal")
    ) {
      throw new Error("Demande d’assistance introuvable.");
    }
    if (supportCase.status === "closed") {
      throw new Error("Cette demande d’assistance est clôturée.");
    }
    const now = new Date().toISOString();
    const note: SupportCaseNote = {
      id: nextIdentity("support-note"),
      caseId,
      authorId: actor.id,
      visibility: input.visibility,
      body: input.body,
      createdAt: now,
    };
    writeNotes([...readNotes(), note]);
    cases[index] = {
      ...supportCase,
      status: actor.isStaff
        ? input.visibility === "customer"
          ? "waiting_customer"
          : supportCase.status
        : "waiting_internal",
      lastCustomerReplyAt: actor.isStaff
        ? supportCase.lastCustomerReplyAt
        : now,
      lastStaffReplyAt:
        actor.isStaff && input.visibility === "customer"
          ? now
          : supportCase.lastStaffReplyAt,
      updatedAt: now,
    };
    writeCases(cases);
    return structuredClone(note);
  }

  async getMetrics(): Promise<SupportCaseMetrics> {
    await simulateNetworkDelay();
    requireDemoCapability("support.case.read");
    const now = new Date().toISOString();
    const open = readCases().filter(
      (item) => item.status !== "resolved" && item.status !== "closed",
    );
    return {
      open: open.length,
      urgent: open.filter((item) => item.priority === "urgent").length,
      overdue: open.filter((item) => item.slaDueAt < now).length,
      unassigned: open.filter((item) => !item.assigneeId).length,
      resolvedToday: readCases().filter((item) =>
        item.resolvedAt?.startsWith(now.slice(0, 10)),
      ).length,
      averageFirstResponseMinutes: 40,
    };
  }
}

export const demoSupportService = new DemoSupportService();
