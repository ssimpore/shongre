/**
 * SHONGRE CRM REPOSITORY
 * Data-access contract and mock implementation for Contacts, Companies,
 * Commercial Opportunities, Activity Timeline, Tasks, and Universal CRM Search.
 */

import {
  CrmContact,
  CrmCompany,
  CrmOpportunity,
  CrmActivity,
  CrmTask,
  OpportunityStage,
  ProspectResearchCandidate,
} from "../domains/crm/crm.types";
import { storageService } from "../services/storage.service";

export interface CrmOverviewStats {
  totalContacts: number;
  totalCompanies: number;
  activeProspects: number;
  openOpportunities: number;
  pipelineValueMinor: number;
  wonDealsCount: number;
  tasksDueToday: number;
}

export interface UniversalSearchResult {
  type: "contact" | "company" | "opportunity" | "shongre_user";
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant?:
    | "neutral"
    | "primary"
    | "pro"
    | "verified"
    | "urgent"
    | "deal"
    | "warning"
    | "success";
  linkTo: string;
}

export interface ICrmRepository {
  // Contacts
  listContacts(): Promise<CrmContact[]>;
  getContactById(id: string): Promise<CrmContact | null>;
  createContact(contact: Partial<CrmContact>): Promise<CrmContact>;
  updateContact(id: string, updates: Partial<CrmContact>): Promise<CrmContact>;
  deleteContact(id: string): Promise<void>;

  // Companies
  listCompanies(): Promise<CrmCompany[]>;
  getCompanyById(id: string): Promise<CrmCompany | null>;
  createCompany(company: Partial<CrmCompany>): Promise<CrmCompany>;
  updateCompany(id: string, updates: Partial<CrmCompany>): Promise<CrmCompany>;

  // Opportunities & Pipeline
  listOpportunities(): Promise<CrmOpportunity[]>;
  getOpportunityById(id: string): Promise<CrmOpportunity | null>;
  createOpportunity(opp: Partial<CrmOpportunity>): Promise<CrmOpportunity>;
  updateOpportunityStage(
    id: string,
    stage: OpportunityStage,
  ): Promise<CrmOpportunity>;
  updateOpportunity(
    id: string,
    updates: Partial<CrmOpportunity>,
  ): Promise<CrmOpportunity>;

  // Activities & Tasks
  listActivities(
    entityType: "contact" | "company" | "opportunity",
    entityId: string,
  ): Promise<CrmActivity[]>;
  addActivity(activity: Partial<CrmActivity>): Promise<CrmActivity>;
  listTasks(): Promise<CrmTask[]>;
  createTask(task: Partial<CrmTask>): Promise<CrmTask>;
  toggleTaskStatus(id: string): Promise<CrmTask>;

  // AI Prospect Import
  importAiCandidate(
    candidate: ProspectResearchCandidate,
    ownerId?: string,
    ownerName?: string,
  ): Promise<CrmCompany>;

  // Universal Search & Stats
  searchUniversal(query: string): Promise<UniversalSearchResult[]>;
  getOverviewStats(): Promise<CrmOverviewStats>;
}

const INITIAL_COMPANIES: CrmCompany[] = [
  {
    id: "crm-comp-1",
    name: "L'Atelier Nordique SAS",
    legalName: "L'Atelier Nordique SAS",
    domain: "atelier-nordique.fr",
    website: "https://atelier-nordique.fr",
    industry: "Mobilier & Restauration",
    companySize: "5 à 10 salariés",
    location: {
      city: "Paris",
      postalCode: "75011",
      region: "Île-de-France",
      country: "FR",
    },
    linkedSellerId: "user_pro_vintage",
    linkedUserId: "user_pro_vintage",
    lifecycle: "customer",
    contactsCount: 1,
    contactIds: ["crm-c-2"],
    ownerId: "user_admin_antoine",
    ownerName: "Antoine Fabre",
    tags: ["Compte Clé", "Mobilier", "Top Vendeur"],
    marketCode: "FR",
    source: "pro_signup",
    doNotContact: false,
    catalogSizeEstimate: 140,
    aiFitScore: 98,
    aiSummary:
      "Atelier de référence spécialisé dans le mobilier vintage certifié. 140 annonces actives sur Shongre.",
    lastActivityAt: "2026-08-16T14:30:00Z",
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-08-16T14:30:00Z",
  },
  {
    id: "crm-comp-2",
    name: "VoltExpert Mobilité France",
    legalName: "VoltExpert France SAS",
    domain: "voltexpert-france.fr",
    website: "https://voltexpert-france.fr",
    industry: "Bornes de recharge & Énergie",
    companySize: "15 à 25 salariés",
    location: {
      city: "Lyon",
      postalCode: "69002",
      region: "Rhône-Alpes",
      country: "FR",
    },
    lifecycle: "qualified",
    contactsCount: 1,
    contactIds: ["crm-c-3"],
    ownerId: "user_admin_antoine",
    ownerName: "Antoine Fabre",
    tags: ["Mobilité Électrique", "Pro B2B", "Potentiel Fort"],
    marketCode: "FR",
    source: "ai_research",
    doNotContact: false,
    catalogSizeEstimate: 45,
    aiFitScore: 95,
    aiSummary:
      "Distributeur et installateur certifié IRVE. Fort potentiel pour catalogue Matériel Professionnel.",
    lastActivityAt: "2026-08-17T01:00:00Z",
    createdAt: "2026-08-15T11:00:00Z",
    updatedAt: "2026-08-17T01:00:00Z",
  },
  {
    id: "crm-comp-3",
    name: "Maison Déco Paris",
    legalName: "Maison Déco Paris EURL",
    domain: "maison-deco-paris.fr",
    website: "https://maison-deco-paris.fr",
    industry: "Mobilier & Décoration vintage",
    companySize: "3 à 5 salariés",
    location: {
      city: "Paris",
      postalCode: "75011",
      region: "Île-de-France",
      country: "FR",
    },
    lifecycle: "prospect",
    contactsCount: 1,
    contactIds: ["crm-c-4"],
    ownerId: "user_admin_antoine",
    ownerName: "Antoine Fabre",
    tags: ["Design", "Déco", "Paris"],
    marketCode: "FR",
    source: "ai_research",
    doNotContact: false,
    catalogSizeEstimate: 80,
    aiFitScore: 92,
    aiSummary:
      "Boutique renommée du 11e arrondissement. Prise de contact commerciale planifiée.",
    lastActivityAt: "2026-08-17T02:00:00Z",
    createdAt: "2026-08-17T02:00:00Z",
    updatedAt: "2026-08-17T02:00:00Z",
  },
];

const INITIAL_CONTACTS: CrmContact[] = [
  {
    id: "crm-c-1",
    linkedUserId: "user_thomas",
    identity: {
      firstName: "Thomas",
      lastName: "Laurent",
      email: "thomas@example.fr",
      phone: "+33 6 12 34 56 78",
      jobTitle: "Particulier Actif & Acheteur Fréquent",
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    },
    lifecycle: "customer",
    qualification: "high",
    ownerName: "Antoine Fabre",
    marketCode: "FR",
    tags: ["Particulier VIP", "Acheteur en ligne"],
    source: "shongre_signup",
    doNotContact: false,
    notesCount: 2,
    lastActivityAt: "2026-08-16T18:00:00Z",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-08-16T18:00:00Z",
  },
  {
    id: "crm-c-2",
    linkedUserId: "user_pro_vintage",
    linkedSellerId: "user_pro_vintage",
    companyId: "crm-comp-1",
    companyName: "L'Atelier Nordique SAS",
    identity: {
      firstName: "Marc",
      lastName: "Dumont",
      email: "contact@atelier-nordique.fr",
      phone: "+33 1 42 68 00 11",
      jobTitle: "Gérant & Directeur Artistique",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    },
    lifecycle: "customer",
    qualification: "high",
    ownerName: "Antoine Fabre",
    marketCode: "FR",
    tags: ["Vendeur Pro Certifié", "Forfait Pro Business"],
    source: "pro_signup",
    doNotContact: false,
    notesCount: 4,
    lastActivityAt: "2026-08-16T14:30:00Z",
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-08-16T14:30:00Z",
  },
  {
    id: "crm-c-3",
    companyId: "crm-comp-2",
    companyName: "VoltExpert Mobilité France",
    identity: {
      firstName: "Alexandre",
      lastName: "Garnier",
      email: "a.garnier@voltexpert-france.fr",
      phone: "+33 4 78 90 12 34",
      jobTitle: "Directeur Commercial & Partenariats",
    },
    lifecycle: "qualified",
    qualification: "high",
    ownerName: "Antoine Fabre",
    marketCode: "FR",
    tags: ["Décisionnaire", "B2B"],
    source: "ai_research",
    doNotContact: false,
    notesCount: 1,
    lastActivityAt: "2026-08-17T01:00:00Z",
    createdAt: "2026-08-15T11:00:00Z",
    updatedAt: "2026-08-17T01:00:00Z",
  },
  {
    id: "crm-c-4",
    companyId: "crm-comp-3",
    companyName: "Maison Déco Paris",
    identity: {
      firstName: "Sophie",
      lastName: "Mercier",
      email: "sophie.m@maison-deco-paris.fr",
      phone: "+33 1 48 05 99 00",
      jobTitle: "Fondatrice & Responsable Achats",
    },
    lifecycle: "prospect",
    qualification: "medium",
    ownerName: "Antoine Fabre",
    marketCode: "FR",
    tags: ["Contact Découvert IA"],
    source: "ai_research",
    doNotContact: false,
    notesCount: 1,
    lastActivityAt: "2026-08-17T02:00:00Z",
    createdAt: "2026-08-17T02:00:00Z",
    updatedAt: "2026-08-17T02:00:00Z",
  },
];

const INITIAL_OPPORTUNITIES: CrmOpportunity[] = [
  {
    id: "opp-1",
    title: "Adhésion Forfait Pro Entreprise & Import Catalogue",
    companyId: "crm-comp-1",
    companyName: "L'Atelier Nordique SAS",
    contactIds: ["crm-c-2"],
    primaryContactName: "Marc Dumont",
    type: "pro_subscription_upgrade",
    stage: "negotiation",
    estimatedValue: { amountMinor: 118800, currency: "EUR" },
    probability: 80,
    expectedCloseDate: "2026-08-31",
    ownerName: "Antoine Fabre",
    marketCode: "FR",
    notes:
      "Discussion sur l'importation automatique de flux CSV pour 200 nouvelles références.",
    createdAt: "2026-08-10T10:00:00Z",
    updatedAt: "2026-08-16T14:30:00Z",
  },
  {
    id: "opp-2",
    title: "Ouverture Vitrine Pro Mobilité & Bornes de recharge",
    companyId: "crm-comp-2",
    companyName: "VoltExpert Mobilité France",
    contactIds: ["crm-c-3"],
    primaryContactName: "Alexandre Garnier",
    type: "pro_seller_acquisition",
    stage: "proposal",
    estimatedValue: { amountMinor: 58800, currency: "EUR" },
    probability: 60,
    expectedCloseDate: "2026-09-15",
    ownerName: "Antoine Fabre",
    marketCode: "FR",
    notes:
      "Offre Pro Business envoyée avec 1 mois offert pour tester la visibilité.",
    createdAt: "2026-08-15T14:00:00Z",
    updatedAt: "2026-08-17T01:00:00Z",
  },
  {
    id: "opp-3",
    title: "Campagne Sponsorisée Déco & Mobilier Rentrée",
    companyId: "crm-comp-3",
    companyName: "Maison Déco Paris",
    contactIds: ["crm-c-4"],
    primaryContactName: "Sophie Mercier",
    type: "advertising",
    stage: "new",
    estimatedValue: { amountMinor: 35000, currency: "EUR" },
    probability: 30,
    expectedCloseDate: "2026-09-30",
    ownerName: "Antoine Fabre",
    marketCode: "FR",
    notes: "Proposition de mise en avant dans la newsletter hebdomadaire.",
    createdAt: "2026-08-17T02:00:00Z",
    updatedAt: "2026-08-17T02:00:00Z",
  },
];

const INITIAL_ACTIVITIES: CrmActivity[] = [
  {
    id: "act-1",
    entityType: "company",
    entityId: "crm-comp-1",
    type: "note",
    title: "Échange téléphonique positif",
    description:
      "Marc est très satisfait des ventes réalisées via la boutique Shongre. Il souhaite étendre son catalogue aux luminaires.",
    authorName: "Antoine Fabre",
    authorRole: "Admin / Commercial",
    createdAt: "2026-08-16T14:30:00Z",
  },
  {
    id: "act-2",
    entityType: "company",
    entityId: "crm-comp-2",
    type: "ai_discovered",
    title: "Prospect découvert via Prospection IA",
    description:
      'Entreprise identifiée sur requête "Installateurs bornes de recharge France". Fit score Shongre estimé à 95/100.',
    authorName: "Shongre AI Intelligence",
    isAiGenerated: true,
    createdAt: "2026-08-15T11:00:00Z",
  },
];

const INITIAL_TASKS: CrmTask[] = [
  {
    id: "task-crm-1",
    title: "Relancer Marc Dumont pour signature contrat Entreprise",
    dueDate: "2026-08-20",
    assigneeId: "user_admin_antoine",
    assigneeName: "Antoine Fabre",
    relatedType: "opportunity",
    relatedId: "opp-1",
    relatedTitle: "Adhésion Forfait Pro Entreprise",
    priority: "high",
    status: "pending",
    notes: "Vérifier la validation des conditions de paiement trimestriel.",
    createdAt: "2026-08-16T10:00:00Z",
  },
  {
    id: "task-crm-2",
    title: "Envoyer démo personnalisée Vitrine Pro à Alexandre Garnier",
    dueDate: "2026-08-22",
    assigneeId: "user_admin_antoine",
    assigneeName: "Antoine Fabre",
    relatedType: "company",
    relatedId: "crm-comp-2",
    relatedTitle: "VoltExpert Mobilité France",
    priority: "medium",
    status: "pending",
    createdAt: "2026-08-17T01:00:00Z",
  },
];

export class MockCrmRepository implements ICrmRepository {
  private getCompanies(): CrmCompany[] {
    return storageService.get<CrmCompany[]>(
      "shongre_crm_companies",
      INITIAL_COMPANIES,
    );
  }

  private saveCompanies(list: CrmCompany[]): void {
    storageService.set("shongre_crm_companies", list);
  }

  private getContacts(): CrmContact[] {
    return storageService.get<CrmContact[]>(
      "shongre_crm_contacts",
      INITIAL_CONTACTS,
    );
  }

  private saveContacts(list: CrmContact[]): void {
    storageService.set("shongre_crm_contacts", list);
  }

  private getOpportunities(): CrmOpportunity[] {
    return storageService.get<CrmOpportunity[]>(
      "shongre_crm_opportunities",
      INITIAL_OPPORTUNITIES,
    );
  }

  private saveOpportunities(list: CrmOpportunity[]): void {
    storageService.set("shongre_crm_opportunities", list);
  }

  private getActivities(): CrmActivity[] {
    return storageService.get<CrmActivity[]>(
      "shongre_crm_activities",
      INITIAL_ACTIVITIES,
    );
  }

  private saveActivities(list: CrmActivity[]): void {
    storageService.set("shongre_crm_activities", list);
  }

  private getTasks(): CrmTask[] {
    return storageService.get<CrmTask[]>("shongre_crm_tasks", INITIAL_TASKS);
  }

  private saveTasks(list: CrmTask[]): void {
    storageService.set("shongre_crm_tasks", list);
  }

  // CONTACTS
  async listContacts(): Promise<CrmContact[]> {
    return this.getContacts().sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async getContactById(id: string): Promise<CrmContact | null> {
    return this.getContacts().find((c) => c.id === id) || null;
  }

  async createContact(contact: Partial<CrmContact>): Promise<CrmContact> {
    const list = this.getContacts();
    const now = new Date().toISOString();
    const newContact: CrmContact = {
      id: `crm-c-${Date.now()}`,
      identity: contact.identity || {
        firstName: "Contact",
        lastName: "",
        email: "contact@exemple.fr",
      },
      lifecycle: contact.lifecycle || "prospect",
      qualification: contact.qualification || "medium",
      ownerName: contact.ownerName || "Antoine Fabre",
      marketCode: contact.marketCode || "FR",
      tags: contact.tags || [],
      source: contact.source || "manual",
      doNotContact: !!contact.doNotContact,
      notesCount: 0,
      createdAt: now,
      updatedAt: now,
      ...contact,
    };

    list.unshift(newContact);
    this.saveContacts(list);
    return newContact;
  }

  async updateContact(
    id: string,
    updates: Partial<CrmContact>,
  ): Promise<CrmContact> {
    const list = this.getContacts();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Contact introuvable.");

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveContacts(list);
    return list[index];
  }

  async deleteContact(id: string): Promise<void> {
    const list = this.getContacts().filter((c) => c.id !== id);
    this.saveContacts(list);
  }

  // COMPANIES
  async listCompanies(): Promise<CrmCompany[]> {
    return this.getCompanies().sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async getCompanyById(id: string): Promise<CrmCompany | null> {
    return this.getCompanies().find((c) => c.id === id) || null;
  }

  async createCompany(company: Partial<CrmCompany>): Promise<CrmCompany> {
    const list = this.getCompanies();
    const now = new Date().toISOString();
    const newComp: CrmCompany = {
      id: `crm-comp-${Date.now()}`,
      name: company.name || "Entreprise",
      lifecycle: company.lifecycle || "prospect",
      contactsCount: 0,
      contactIds: [],
      ownerName: company.ownerName || "Antoine Fabre",
      tags: company.tags || [],
      marketCode: company.marketCode || "FR",
      source: company.source || "manual",
      doNotContact: !!company.doNotContact,
      createdAt: now,
      updatedAt: now,
      ...company,
    };

    list.unshift(newComp);
    this.saveCompanies(list);
    return newComp;
  }

  async updateCompany(
    id: string,
    updates: Partial<CrmCompany>,
  ): Promise<CrmCompany> {
    const list = this.getCompanies();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Entreprise introuvable.");

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveCompanies(list);
    return list[index];
  }

  // OPPORTUNITIES
  async listOpportunities(): Promise<CrmOpportunity[]> {
    return this.getOpportunities().sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async getOpportunityById(id: string): Promise<CrmOpportunity | null> {
    return this.getOpportunities().find((o) => o.id === id) || null;
  }

  async createOpportunity(
    opp: Partial<CrmOpportunity>,
  ): Promise<CrmOpportunity> {
    const list = this.getOpportunities();
    const now = new Date().toISOString();
    const newOpp: CrmOpportunity = {
      id: `opp-${Date.now()}`,
      title: opp.title || "Nouvelle opportunité",
      contactIds: opp.contactIds || [],
      type: opp.type || "pro_seller_acquisition",
      stage: opp.stage || "new",
      estimatedValue: opp.estimatedValue || {
        amountMinor: 50000,
        currency: "EUR",
      },
      probability: opp.probability ?? 50,
      ownerName: opp.ownerName || "Antoine Fabre",
      marketCode: opp.marketCode || "FR",
      createdAt: now,
      updatedAt: now,
      ...opp,
    };

    list.unshift(newOpp);
    this.saveOpportunities(list);
    return newOpp;
  }

  async updateOpportunityStage(
    id: string,
    stage: OpportunityStage,
  ): Promise<CrmOpportunity> {
    const list = this.getOpportunities();
    const opp = list.find((o) => o.id === id);
    if (!opp) throw new Error("Opportunité introuvable.");

    opp.stage = stage;
    opp.updatedAt = new Date().toISOString();

    // Add activity record
    this.addActivity({
      entityType: "opportunity",
      entityId: id,
      type: "stage_changed",
      title: `Étape changée : ${stage}`,
      authorName: "Antoine Fabre",
      authorRole: "Admin",
    });

    this.saveOpportunities(list);
    return opp;
  }

  async updateOpportunity(
    id: string,
    updates: Partial<CrmOpportunity>,
  ): Promise<CrmOpportunity> {
    const list = this.getOpportunities();
    const index = list.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Opportunité introuvable.");

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveOpportunities(list);
    return list[index];
  }

  // ACTIVITIES
  async listActivities(
    entityType: "contact" | "company" | "opportunity",
    entityId: string,
  ): Promise<CrmActivity[]> {
    return this.getActivities()
      .filter((a) => a.entityType === entityType && a.entityId === entityId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async addActivity(activity: Partial<CrmActivity>): Promise<CrmActivity> {
    const list = this.getActivities();
    const newAct: CrmActivity = {
      id: `act-${Date.now()}`,
      entityType: activity.entityType || "company",
      entityId: activity.entityId || "crm-comp-1",
      type: activity.type || "note",
      title: activity.title || "Note",
      description: activity.description,
      authorName: activity.authorName || "Antoine Fabre",
      authorRole: activity.authorRole || "Commercial",
      isAiGenerated: !!activity.isAiGenerated,
      createdAt: new Date().toISOString(),
    };

    list.unshift(newAct);
    this.saveActivities(list);
    return newAct;
  }

  // TASKS
  async listTasks(): Promise<CrmTask[]> {
    return this.getTasks().sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }

  async createTask(task: Partial<CrmTask>): Promise<CrmTask> {
    const list = this.getTasks();
    const newTask: CrmTask = {
      id: `task-crm-${Date.now()}`,
      title: task.title || "Tâche commerciale",
      dueDate: task.dueDate || new Date().toISOString().split("T")[0],
      assigneeId: task.assigneeId || "user_admin_antoine",
      assigneeName: task.assigneeName || "Antoine Fabre",
      relatedType: task.relatedType || "company",
      relatedId: task.relatedId || "crm-comp-1",
      relatedTitle: task.relatedTitle || "L'Atelier Nordique",
      priority: task.priority || "medium",
      status: "pending",
      notes: task.notes,
      createdAt: new Date().toISOString(),
    };

    list.unshift(newTask);
    this.saveTasks(list);
    return newTask;
  }

  async toggleTaskStatus(id: string): Promise<CrmTask> {
    const list = this.getTasks();
    const task = list.find((t) => t.id === id);
    if (!task) throw new Error("Tâche introuvable.");

    task.status = task.status === "completed" ? "pending" : "completed";
    this.saveTasks(list);
    return task;
  }

  // AI IMPORT
  async importAiCandidate(
    candidate: ProspectResearchCandidate,
    ownerId = "user_admin_antoine",
    ownerName = "Antoine Fabre",
  ): Promise<CrmCompany> {
    const comp = await this.createCompany({
      name: candidate.company.name,
      domain: candidate.company.domain,
      website: candidate.company.website,
      industry: candidate.company.industry,
      companySize: candidate.company.estimatedSize,
      location: { country: "FR", region: candidate.company.location },
      lifecycle: "prospect",
      source: "ai_research",
      aiFitScore: candidate.fit.score,
      aiSummary: candidate.fit.reasons.join(". "),
      ownerId,
      ownerName,
      tags: ["Prospection IA", ...(candidate.suggestedTaxonomySlugs || [])],
    });

    // Add activity
    await this.addActivity({
      entityType: "company",
      entityId: comp.id,
      type: "ai_discovered",
      title: "Importé depuis Prospection IA",
      description: `Prospect importé avec un fit score de ${candidate.fit.score}/100. ${candidate.sources.length} sources publiques analysées.`,
      authorName: "Shongre AI Prospecting",
      isAiGenerated: true,
    });

    return comp;
  }

  // UNIVERSAL SEARCH
  async searchUniversal(query: string): Promise<UniversalSearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: UniversalSearchResult[] = [];

    // 1. Companies
    for (const comp of this.getCompanies()) {
      if (
        comp.name.toLowerCase().includes(q) ||
        (comp.domain && comp.domain.toLowerCase().includes(q))
      ) {
        results.push({
          type: "company",
          id: comp.id,
          title: comp.name,
          subtitle: `${comp.industry || "Entreprise"} • ${comp.location?.city || comp.marketCode}`,
          badgeText: comp.lifecycle,
          badgeVariant: comp.lifecycle === "customer" ? "success" : "primary",
          linkTo: `/admin/crm/entreprises/${comp.id}`,
        });
      }
    }

    // 2. Contacts
    for (const contact of this.getContacts()) {
      const fullName =
        `${contact.identity.firstName} ${contact.identity.lastName}`.toLowerCase();
      if (
        fullName.includes(q) ||
        contact.identity.email.toLowerCase().includes(q)
      ) {
        results.push({
          type: "contact",
          id: contact.id,
          title: `${contact.identity.firstName} ${contact.identity.lastName}`,
          subtitle: `${contact.identity.email} • ${contact.companyName || "Particulier"}`,
          badgeText: contact.lifecycle,
          badgeVariant: contact.lifecycle === "customer" ? "success" : "deal",
          linkTo: `/admin/crm/contacts/${contact.id}`,
        });
      }
    }

    // 3. Opportunities
    for (const opp of this.getOpportunities()) {
      if (
        opp.title.toLowerCase().includes(q) ||
        (opp.companyName && opp.companyName.toLowerCase().includes(q))
      ) {
        results.push({
          type: "opportunity",
          id: opp.id,
          title: opp.title,
          subtitle: `${opp.companyName || ""} • Étape: ${opp.stage}`,
          badgeText: opp.stage,
          badgeVariant: opp.stage === "won" ? "success" : "warning",
          linkTo: `/admin/crm/pipeline?highlight=${opp.id}`,
        });
      }
    }

    return results.slice(0, 8);
  }

  // OVERVIEW STATS
  async getOverviewStats(): Promise<CrmOverviewStats> {
    const contacts = this.getContacts();
    const companies = this.getCompanies();
    const opps = this.getOpportunities();
    const tasks = this.getTasks();

    const openOpps = opps.filter(
      (o) => o.stage !== "won" && o.stage !== "lost",
    );
    const pipelineValue = openOpps.reduce(
      (sum, o) => sum + o.estimatedValue.amountMinor,
      0,
    );

    return {
      totalContacts: contacts.length,
      totalCompanies: companies.length,
      activeProspects: companies.filter((c) => c.lifecycle === "prospect")
        .length,
      openOpportunities: openOpps.length,
      pipelineValueMinor: pipelineValue,
      wonDealsCount: opps.filter((o) => o.stage === "won").length,
      tasksDueToday: tasks.filter((t) => t.status === "pending").length,
    };
  }
}

export const crmRepository: ICrmRepository = new MockCrmRepository();
