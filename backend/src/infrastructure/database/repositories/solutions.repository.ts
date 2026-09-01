import { createHash } from "node:crypto";
import {
  solutionDefinitionSchema,
  solutionLifecycleHistoryEntrySchema,
  type CreateSolutionInput,
  type SolutionDefinition,
  type SolutionLifecycle,
  type SolutionLifecycleHistoryEntry,
  type UpdateSolutionInput,
} from "@shongre/contracts/solutions";
import { AppError } from "../../../shared/errors/app-error.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface SolutionMutationActor {
  id: string;
  name: string;
  role: string;
}

export interface SolutionMutationEvidence {
  idempotencyKey: string;
  requestHash: string;
}

export interface ISolutionsRepository {
  list(input: {
    publicOnly: boolean;
    marketCode?: string;
    slug?: string;
  }): Promise<SolutionDefinition[]>;
  getById(solutionId: string): Promise<SolutionDefinition | null>;
  create(
    input: CreateSolutionInput & {
      releaseNotes: SolutionDefinition["releaseNotes"];
    },
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition>;
  update(
    solutionId: string,
    input: UpdateSolutionInput,
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition>;
  reorder(
    solutionIds: readonly string[],
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition[]>;
  transition(
    solutionId: string,
    lifecycle: SolutionLifecycle,
    explanation: string,
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition>;
  listLifecycleHistory(
    solutionId: string,
  ): Promise<SolutionLifecycleHistoryEntry[]>;
}

interface DemoReceipt {
  operation: "create" | "update" | "reorder" | "transition";
  requestHash: string;
  response: SolutionDefinition | SolutionDefinition[];
}

const clone = <T>(value: T): T => structuredClone(value);

function deterministicUuid(namespace: string, value: string): string {
  const hash = createHash("sha256")
    .update(`${namespace}:${value}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const DEMO_SOLUTIONS_EPOCH = Date.parse("2026-09-01T09:00:00.000Z");

export class DemoSolutionsRepository implements ISolutionsRepository {
  private values: SolutionDefinition[];
  private readonly history: SolutionLifecycleHistoryEntry[] = [];
  private readonly receipts = new Map<string, DemoReceipt>();
  private mutationSequence = 0;

  constructor(initialValues: readonly SolutionDefinition[] = []) {
    this.values = clone([...initialValues]);
  }

  async list(input: {
    publicOnly: boolean;
    marketCode?: string;
    slug?: string;
  }): Promise<SolutionDefinition[]> {
    return clone(
      this.values
        .filter((value) => !input.slug || value.slug === input.slug)
        .filter(
          (value) =>
            !input.publicOnly ||
            (value.catalogVisible &&
              [
                "COMING_SOON",
                "BETA",
                "AVAILABLE",
                "MAINTENANCE",
                "DEPRECATED",
              ].includes(value.lifecycle)),
        )
        .filter(
          (value) =>
            !input.marketCode || value.markets.includes(input.marketCode),
        )
        .sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            left.name.localeCompare(right.name) ||
            left.id.localeCompare(right.id),
        ),
    );
  }

  async getById(solutionId: string): Promise<SolutionDefinition | null> {
    const value = this.values.find((candidate) => candidate.id === solutionId);
    return value ? clone(value) : null;
  }

  async create(
    input: CreateSolutionInput & {
      releaseNotes: SolutionDefinition["releaseNotes"];
    },
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition> {
    return this.replayOrRun("create", actor, evidence, () => {
      if (this.values.some((value) => value.slug === input.slug)) {
        throw new AppError({
          code: "CONFLICT",
          message: "Ce slug est déjà utilisé.",
        });
      }
      const timestamp = this.nextTimestamp();
      const value = solutionDefinitionSchema.parse({
        ...input,
        id: deterministicUuid("demo-solution", `${input.slug}:${timestamp}`),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      this.values.push(value);
      this.history.push({
        id: deterministicUuid("demo-solution-history", `${value.id}:created`),
        solutionId: value.id,
        from: null,
        to: value.lifecycle,
        explanation: "Création de la solution.",
        actorId: actor.id,
        actorName: actor.name,
        occurredAt: timestamp,
      });
      return clone(value);
    });
  }

  async update(
    solutionId: string,
    input: UpdateSolutionInput,
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition> {
    return this.replayOrRun("update", actor, evidence, () => {
      const index = this.values.findIndex((value) => value.id === solutionId);
      if (index < 0) throw this.notFound();
      if (
        input.slug &&
        this.values.some(
          (value, candidateIndex) =>
            candidateIndex !== index && value.slug === input.slug,
        )
      ) {
        throw new AppError({
          code: "CONFLICT",
          message: "Ce slug est déjà utilisé.",
        });
      }
      const updated = solutionDefinitionSchema.parse({
        ...this.values[index],
        ...Object.fromEntries(
          Object.entries(input).map(([key, value]) => [
            key,
            value === null ? undefined : value,
          ]),
        ),
        id: this.values[index].id,
        lifecycle: this.values[index].lifecycle,
        createdAt: this.values[index].createdAt,
        updatedAt: this.nextTimestamp(),
      });
      this.values[index] = updated;
      return clone(updated);
    });
  }

  async reorder(
    solutionIds: readonly string[],
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition[]> {
    return this.replayOrRun("reorder", actor, evidence, () => {
      const byId = new Map(this.values.map((value) => [value.id, value]));
      if (
        solutionIds.length !== this.values.length ||
        new Set(solutionIds).size !== this.values.length ||
        solutionIds.some((id) => !byId.has(id))
      ) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "L’ordre doit référencer chaque solution exactement une fois.",
        });
      }
      const timestamp = this.nextTimestamp();
      this.values = solutionIds.map((id, index) => ({
        ...byId.get(id)!,
        sortOrder: (index + 1) * 10,
        updatedAt: timestamp,
      }));
      return clone(this.values);
    });
  }

  async transition(
    solutionId: string,
    lifecycle: SolutionLifecycle,
    explanation: string,
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition> {
    return this.replayOrRun("transition", actor, evidence, () => {
      const index = this.values.findIndex((value) => value.id === solutionId);
      if (index < 0) throw this.notFound();
      const current = this.values[index];
      if (current.lifecycle === lifecycle) {
        throw new AppError({
          code: "CONFLICT",
          message: "La solution utilise déjà ce cycle de vie.",
        });
      }
      if (
        current.lifecycle === "RETIRED" &&
        [
          "COMING_SOON",
          "BETA",
          "AVAILABLE",
          "MAINTENANCE",
          "DEPRECATED",
        ].includes(lifecycle)
      ) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Une solution retirée doit d’abord repasser par un cycle privé.",
        });
      }
      const timestamp = this.nextTimestamp();
      const updated = solutionDefinitionSchema.parse({
        ...current,
        lifecycle,
        updatedAt: timestamp,
      });
      this.values[index] = updated;
      this.history.push({
        id: deterministicUuid(
          "demo-solution-history",
          `${solutionId}:${lifecycle}:${timestamp}`,
        ),
        solutionId,
        from: current.lifecycle,
        to: lifecycle,
        explanation,
        actorId: actor.id,
        actorName: actor.name,
        occurredAt: timestamp,
      });
      return clone(updated);
    });
  }

  async listLifecycleHistory(
    solutionId: string,
  ): Promise<SolutionLifecycleHistoryEntry[]> {
    if (!this.values.some((value) => value.id === solutionId)) {
      throw this.notFound();
    }
    return clone(
      this.history
        .filter((entry) => entry.solutionId === solutionId)
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    );
  }

  private replayOrRun<T extends SolutionDefinition | SolutionDefinition[]>(
    operation: DemoReceipt["operation"],
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
    run: () => T,
  ): T {
    const key = `${actor.id}:${evidence.idempotencyKey}`;
    const receipt = this.receipts.get(key);
    if (receipt) {
      if (
        receipt.operation !== operation ||
        receipt.requestHash !== evidence.requestHash
      ) {
        throw new AppError({
          code: "CONFLICT",
          message: "Cette clé d’idempotence a déjà été utilisée.",
        });
      }
      return clone(receipt.response) as T;
    }
    const response = run();
    this.receipts.set(key, {
      operation,
      requestHash: evidence.requestHash,
      response: clone(response),
    });
    return response;
  }

  private nextTimestamp(): string {
    const timestamp = new Date(
      DEMO_SOLUTIONS_EPOCH + this.mutationSequence * 1000,
    ).toISOString();
    this.mutationSequence += 1;
    return timestamp;
  }

  private notFound(): AppError {
    return new AppError({
      code: "NOT_FOUND",
      message: "Solution introuvable.",
    });
  }
}

function parseSolution(value: unknown): SolutionDefinition {
  return solutionDefinitionSchema.parse(value);
}

export class PostgresSolutionsRepository implements ISolutionsRepository {
  async list(input: {
    publicOnly: boolean;
    marketCode?: string;
    slug?: string;
  }): Promise<SolutionDefinition[]> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase.rpc("get_solution_catalog", {
        p_public_only: input.publicOnly,
        p_market_code: input.marketCode ?? null,
        p_slug: input.slug ?? null,
      });
      if (error) databaseFailure("solutions.list", error);
      return (data ?? []).map(parseSolution);
    } catch (error) {
      databaseFailure("solutions.list", error);
    }
  }

  async getById(solutionId: string): Promise<SolutionDefinition | null> {
    const values = await this.list({ publicOnly: false });
    return values.find((value) => value.id === solutionId) ?? null;
  }

  create(
    input: CreateSolutionInput & {
      releaseNotes: SolutionDefinition["releaseNotes"];
    },
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition> {
    return this.mutate("create", null, input, actor, evidence).then((value) =>
      parseSolution(value),
    );
  }

  update(
    solutionId: string,
    input: UpdateSolutionInput,
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition> {
    return this.mutate("update", solutionId, input, actor, evidence).then(
      parseSolution,
    );
  }

  reorder(
    solutionIds: readonly string[],
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition[]> {
    return this.mutate("reorder", null, { solutionIds }, actor, evidence).then(
      (value) => zodSolutionArray(value),
    );
  }

  transition(
    solutionId: string,
    lifecycle: SolutionLifecycle,
    explanation: string,
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<SolutionDefinition> {
    return this.mutate(
      "transition",
      solutionId,
      { lifecycle, explanation },
      actor,
      evidence,
    ).then(parseSolution);
  }

  async listLifecycleHistory(
    solutionId: string,
  ): Promise<SolutionLifecycleHistoryEntry[]> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data: solution, error: solutionError } = await supabase
        .from("solutions")
        .select("id")
        .eq("id", solutionId)
        .maybeSingle();
      if (solutionError)
        databaseFailure("solutions.history.exists", solutionError);
      if (!solution) throw this.notFound();
      const { data, error } = await supabase
        .from("solution_lifecycle_history")
        .select("*")
        .eq("solution_id", solutionId)
        .order("occurred_at", { ascending: false });
      if (error) databaseFailure("solutions.history", error);
      return (data ?? []).map((row: any) =>
        solutionLifecycleHistoryEntrySchema.parse({
          id: row.id,
          solutionId: row.solution_id,
          from: row.from_lifecycle,
          to: row.to_lifecycle,
          explanation: row.explanation,
          actorId: row.actor_id,
          actorName: row.actor_name,
          occurredAt: row.occurred_at,
        }),
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      databaseFailure("solutions.history", error);
    }
  }

  private async mutate(
    operation: DemoReceipt["operation"],
    solutionId: string | null,
    payload: unknown,
    actor: SolutionMutationActor,
    evidence: SolutionMutationEvidence,
  ): Promise<unknown> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase.rpc("mutate_solution_catalog", {
        p_operation: operation,
        p_solution_id: solutionId,
        p_payload: payload,
        p_actor_id: actor.id,
        p_actor_name: actor.name,
        p_actor_role: actor.role,
        p_idempotency_key: evidence.idempotencyKey,
        p_request_hash: evidence.requestHash,
      });
      if (error) this.mutationFailure(operation, error);
      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      databaseFailure(`solutions.${operation}`, error);
    }
  }

  private mutationFailure(
    operation: string,
    error: { code?: string; message?: string },
  ): never {
    if (error.code === "P0002") throw this.notFound();
    if (["23505", "23514", "23503"].includes(error.code ?? "")) {
      throw new AppError({
        code: "CONFLICT",
        message:
          operation === "create"
            ? "Cette solution existe déjà ou sa configuration est incohérente."
            : "Le catalogue a changé ou la modification est incohérente.",
      });
    }
    if (error.code === "22023" || error.code === "22P02") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La modification du catalogue n’est pas valide.",
      });
    }
    databaseFailure(`solutions.${operation}`, error);
  }

  private notFound(): AppError {
    return new AppError({
      code: "NOT_FOUND",
      message: "Solution introuvable.",
    });
  }
}

function zodSolutionArray(value: unknown): SolutionDefinition[] {
  if (!Array.isArray(value)) {
    throw new AppError({
      code: "INTERNAL_ERROR",
      message: "Réponse de catalogue invalide.",
    });
  }
  return value.map(parseSolution);
}
