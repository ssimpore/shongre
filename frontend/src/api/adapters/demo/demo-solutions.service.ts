import type { SolutionsServiceContract } from "../../contracts/solutions.contract";
import { PUBLIC_SOLUTION_LIFECYCLES } from "../../../domains/solutions/solutions.presentation";
import {
  MIN_SOLUTION_SORT_ORDER,
  SOLUTION_LIFECYCLES,
} from "../../../domains/solutions/solutions.types";
import type {
  CreateSolutionInput,
  SolutionDefinition,
  SolutionLifecycle,
  SolutionLifecycleHistoryEntry,
  SolutionListOptions,
  SolutionsAdminActor,
  SolutionsDemoScenario,
  UpdateSolutionInput,
} from "../../../domains/solutions/solutions.types";
import {
  demoSolutionsStore,
  type DemoSolutionsStore,
} from "./demo-solutions.store";
import {
  forbidDemoStaffMarketplaceAccess,
  requireDemoCapability,
} from "./demo-authorization";

const DEMO_NOW = "2026-08-28T12:00:00.000Z";
const clone = <T>(value: T): T => structuredClone(value);

function assertAdmin(actor: SolutionsAdminActor): void {
  requireDemoCapability("admin.configuration.manage");
  if (!actor.canManage) {
    throw new Error("Vous n’avez pas la capacité de gérer les solutions.");
  }
}

function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      "Le slug doit utiliser des minuscules, chiffres et tirets.",
    );
  }
}

function validateOptionalIsoDate(
  value: string | undefined,
  label: string,
): void {
  if (value && Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} doit être une date et une heure valides.`);
  }
}

function validateLaunchPath(value: string | undefined): void {
  if (!value) return;
  if (!value.startsWith("/") || value.startsWith("//")) {
    throw new Error("Le chemin de lancement doit être un chemin local sûr.");
  }
  const target = new URL(value, "https://routing.shongre.invalid");
  if (target.origin !== "https://routing.shongre.invalid") {
    throw new Error("Le chemin de lancement doit rester dans l’application.");
  }
}

function validateSolution(solution: SolutionDefinition): void {
  validateSlug(solution.slug);
  if (
    !solution.name.trim() ||
    !solution.shortDescription.trim() ||
    !solution.description.trim()
  ) {
    throw new Error("Le nom et les descriptions sont obligatoires.");
  }
  if (solution.markets.length === 0 || solution.languages.length === 0) {
    throw new Error("Sélectionnez au moins un marché et une langue.");
  }
  if (
    !Number.isInteger(solution.sortOrder) ||
    solution.sortOrder < MIN_SOLUTION_SORT_ORDER
  ) {
    throw new Error("L’ordre d’affichage doit être un entier positif ou nul.");
  }
  if (
    solution.launchApplicationId &&
    !["marketplace", "prospects", "facturation"].includes(
      solution.launchApplicationId,
    )
  ) {
    throw new Error("La destination applicative n’est pas autorisée.");
  }
  validateLaunchPath(solution.launchPath);
  if (solution.lifecycle === "AVAILABLE" && !solution.launchApplicationId) {
    throw new Error("Une solution disponible exige une destination valide.");
  }
  if (solution.requiresEntitlement && !solution.entitlementKey?.trim()) {
    throw new Error(
      "Un accès soumis à entitlement exige une clé d’entitlement.",
    );
  }
  if (solution.requiresEntitlement && !solution.requiresAuthentication) {
    throw new Error("Un entitlement ne peut être vérifié sans connexion.");
  }
  if (
    solution.lifecycle === "MAINTENANCE" &&
    !solution.maintenanceMessage?.trim()
  ) {
    throw new Error("La maintenance exige une explication publique.");
  }
  if (
    solution.documentationUrl &&
    !/^https:\/\/[^\s]+$/i.test(solution.documentationUrl)
  ) {
    throw new Error("Le lien de documentation doit utiliser HTTPS.");
  }
  if (solution.replacementSlug) validateSlug(solution.replacementSlug);
  validateOptionalIsoDate(solution.availableFrom, "La date de début");
  validateOptionalIsoDate(solution.availableUntil, "La date de fin");
  if (
    solution.availableFrom &&
    solution.availableUntil &&
    Date.parse(solution.availableFrom) > Date.parse(solution.availableUntil)
  ) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }
  for (const note of solution.releaseNotes) {
    if (!note.id.trim() || !note.title.trim() || !note.body.trim()) {
      throw new Error("Chaque note de version exige un titre et un contenu.");
    }
    validateOptionalIsoDate(note.publishedAt, "La date de publication");
  }
}

function applyScenario(
  values: SolutionDefinition[],
  scenario: SolutionsDemoScenario,
): SolutionDefinition[] {
  if (scenario === "empty") return [];
  const solutions = clone(values);
  const facturation = solutions.find(
    (solution) => solution.slug === "facturation",
  );
  if (facturation && scenario === "maintenance") {
    facturation.lifecycle = "MAINTENANCE";
    facturation.maintenanceMessage = "Maintenance planifiée jusqu’à 16 h 00.";
  }
  if (facturation && scenario === "coming_soon") {
    facturation.lifecycle = "COMING_SOON";
  }
  if (facturation && scenario === "beta_restricted") {
    facturation.lifecycle = "BETA";
    facturation.requiresAuthentication = true;
  }
  if (facturation && scenario === "entitlement_required") {
    facturation.requiresAuthentication = true;
    facturation.requiresEntitlement = true;
  }
  if (facturation && scenario === "market_unavailable") {
    facturation.markets = ["BE", "LU"];
  }
  if (facturation && scenario === "retired") {
    facturation.lifecycle = "RETIRED";
  }
  return solutions;
}

export class DemoSolutionsService implements SolutionsServiceContract {
  constructor(
    private readonly scenario: SolutionsDemoScenario = "default",
    private readonly store: DemoSolutionsStore = demoSolutionsStore,
  ) {}

  private async values(): Promise<SolutionDefinition[]> {
    if (this.scenario === "error") {
      throw new Error("Le catalogue de démonstration est indisponible.");
    }
    return applyScenario(this.store.list(), this.scenario);
  }

  async listPublicSolutions(
    options: SolutionListOptions = {},
  ): Promise<SolutionDefinition[]> {
    forbidDemoStaffMarketplaceAccess();
    const market = options.marketCode?.toUpperCase();
    const language = options.language?.toLowerCase();
    return (await this.values())
      .filter((solution) =>
        PUBLIC_SOLUTION_LIFECYCLES.includes(solution.lifecycle),
      )
      .filter((solution) => solution.catalogVisible)
      .filter((solution) => !market || solution.markets.includes(market))
      .filter(
        (solution) =>
          !language ||
          solution.languages.some((value) =>
            value.toLowerCase().startsWith(language.split("-")[0]),
          ),
      )
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
  }

  async getSolutionBySlug(
    slug: string,
    options: SolutionListOptions & { includeAdminOnly?: boolean } = {},
  ): Promise<SolutionDefinition | null> {
    if (!options.includeAdminOnly) forbidDemoStaffMarketplaceAccess();
    const solution = (await this.values()).find((value) => value.slug === slug);
    if (!solution) return null;
    if (
      !options.includeAdminOnly &&
      !PUBLIC_SOLUTION_LIFECYCLES.includes(solution.lifecycle)
    ) {
      return null;
    }
    if (
      options.marketCode &&
      !solution.markets.includes(options.marketCode.toUpperCase())
    ) {
      return solution;
    }
    return clone(solution);
  }

  async listAdminSolutions(actor: SolutionsAdminActor) {
    assertAdmin(actor);
    return (await this.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }

  async createSolution(input: CreateSolutionInput, actor: SolutionsAdminActor) {
    assertAdmin(actor);
    const values = this.store.list();
    validateSlug(input.slug);
    if (values.some((solution) => solution.slug === input.slug)) {
      throw new Error("Ce slug est déjà utilisé.");
    }
    const solution: SolutionDefinition = {
      ...clone(input),
      id: `solution-${input.slug}`,
      releaseNotes: clone(input.releaseNotes || []),
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    validateSolution(solution);
    this.store.save([...values, solution]);
    this.recordHistory(solution, null, solution.lifecycle, "Création", actor);
    return clone(solution);
  }

  async updateSolution(
    solutionId: string,
    input: UpdateSolutionInput,
    actor: SolutionsAdminActor,
  ) {
    assertAdmin(actor);
    const values = this.store.list();
    const index = values.findIndex((solution) => solution.id === solutionId);
    if (index < 0) throw new Error("Solution introuvable.");
    const updated: SolutionDefinition = {
      ...values[index],
      ...clone(input),
      id: values[index].id,
      lifecycle: values[index].lifecycle,
      createdAt: values[index].createdAt,
      updatedAt: DEMO_NOW,
    };
    if (
      values.some(
        (solution, candidateIndex) =>
          candidateIndex !== index && solution.slug === updated.slug,
      )
    ) {
      throw new Error("Ce slug est déjà utilisé.");
    }
    validateSolution(updated);
    values[index] = updated;
    this.store.save(values);
    return clone(updated);
  }

  async reorderSolutions(
    solutionIds: readonly string[],
    actor: SolutionsAdminActor,
  ): Promise<SolutionDefinition[]> {
    assertAdmin(actor);
    const values = this.store.list();
    const uniqueIds = new Set(solutionIds);
    const knownIds = new Set(values.map((solution) => solution.id));
    if (
      solutionIds.length !== values.length ||
      uniqueIds.size !== values.length ||
      solutionIds.some((solutionId) => !knownIds.has(solutionId))
    ) {
      throw new Error(
        "L’ordre doit référencer chaque solution exactement une fois.",
      );
    }

    const byId = new Map(values.map((solution) => [solution.id, solution]));
    const reordered = solutionIds.map((solutionId, index) => ({
      ...byId.get(solutionId)!,
      sortOrder: (index + 1) * 10,
      updatedAt: DEMO_NOW,
    }));
    this.store.save(reordered);
    return clone(reordered);
  }

  async transitionLifecycle(
    solutionId: string,
    lifecycle: SolutionLifecycle,
    options: { explanation: string; actor: SolutionsAdminActor },
  ) {
    assertAdmin(options.actor);
    if (this.scenario === "transition_error") {
      throw new Error("La transition de démonstration a été refusée.");
    }
    if (!SOLUTION_LIFECYCLES.includes(lifecycle)) {
      throw new Error("Cycle de vie invalide.");
    }
    if (options.explanation.trim().length < 10) {
      throw new Error("Indiquez un motif d’au moins 10 caractères.");
    }
    const values = this.store.list();
    const index = values.findIndex((solution) => solution.id === solutionId);
    if (index < 0) throw new Error("Solution introuvable.");
    const current = values[index];
    if (current.lifecycle === lifecycle) {
      throw new Error("La solution utilise déjà ce cycle de vie.");
    }
    if (
      current.lifecycle === "RETIRED" &&
      PUBLIC_SOLUTION_LIFECYCLES.includes(lifecycle)
    ) {
      throw new Error(
        "Une solution retirée doit d’abord repasser en brouillon ou en accès interne.",
      );
    }
    const updated = { ...current, lifecycle, updatedAt: DEMO_NOW };
    validateSolution(updated);
    values[index] = updated;
    this.store.save(values);
    this.recordHistory(
      updated,
      current.lifecycle,
      lifecycle,
      options.explanation.trim(),
      options.actor,
    );
    return clone(updated);
  }

  async listLifecycleHistory(solutionId: string, actor: SolutionsAdminActor) {
    assertAdmin(actor);
    return this.store
      .history()
      .filter((entry) => entry.solutionId === solutionId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  private recordHistory(
    solution: SolutionDefinition,
    from: SolutionLifecycle | null,
    to: SolutionLifecycle,
    explanation: string,
    actor: SolutionsAdminActor,
  ): void {
    const history = this.store.history();
    const entry: SolutionLifecycleHistoryEntry = {
      id: `history-${solution.id}-${history.length + 1}`,
      solutionId: solution.id,
      from,
      to,
      explanation,
      actorId: actor.id,
      actorName: actor.name,
      occurredAt: DEMO_NOW,
    };
    this.store.saveHistory([...history, entry]);
  }
}

export const demoSolutionsService = new DemoSolutionsService();
