import { z } from "zod";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";
import {
  taxonomyPrivateBundleSchema,
  type TaxonomyV4PrivateBundle,
} from "../../../modules/taxonomy/taxonomy.bundle.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { Json } from "../../../generated/database.types.js";

export interface TaxonomyPublication {
  revision: number;
  checksum: string;
  bundle: TaxonomyV4PrivateBundle;
}

const publicationSchema = z.object({
  revision: z.number().int().positive(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  bundle: z.unknown(),
});

type TaxonomyDraft = {
  revision: number;
  publishedRevision: number | null;
  checksum: string;
  bundle: TaxonomyV4PrivateBundle;
};
export class PostgresTaxonomyPublicationRepository {
  private cached?: TaxonomyPublication;
  private pending?: Promise<TaxonomyPublication>;

  private pendingDraft?: Promise<TaxonomyDraft>;
  private cachedDraft?: { key: string; draft: TaxonomyDraft };

  getDraft(): Promise<TaxonomyDraft> {
    return (this.pendingDraft ??= this.readDraft().finally(() => {
      this.pendingDraft = undefined;
    }));
  }

  private async readDraft(): Promise<TaxonomyDraft> {
    const pointer = await getSupabaseAdminClient()
      .from("taxonomy_configuration")
      .select("draft_revision,published_revision,updated_at")
      .eq("singleton", true)
      .single();
    if (pointer.error || !pointer.data)
      databaseFailure("taxonomy.draftRevision", pointer.error);
    const key = JSON.stringify(pointer.data);
    // The bootstrap importer may rewrite revision zero. Authored revisions only
    // change through commands that atomically advance this database fingerprint.
    if (pointer.data.draft_revision > 0 && this.cachedDraft?.key === key)
      return this.cachedDraft.draft;
    const { data, error } =
      await getSupabaseAdminClient().rpc("get_taxonomy_draft");
    if (error || !data) databaseFailure("taxonomy.getDraft", error);
    const parsed = z
      .object({
        revision: z.number().int().nonnegative(),
        publishedRevision: z.number().nullable(),
        checksum: z.string(),
        bundle: taxonomyPrivateBundleSchema,
      })
      .safeParse(data);
    if (!parsed.success) databaseFailure("taxonomy.invalidDraft", parsed.error);
    if (
      pointer.data.draft_revision > 0 &&
      parsed.data.revision === pointer.data.draft_revision &&
      parsed.data.publishedRevision === pointer.data.published_revision
    )
      this.cachedDraft = { key, draft: parsed.data };
    return parsed.data;
  }

  async update(input: {
    expectedRevision: number;
    changes: { table: string; values: Json }[];
    actorId: string;
    reason: string;
    requestId?: string;
  }) {
    const { error } = await getSupabaseAdminClient().rpc(
      "update_taxonomy_draft",
      {
        p_expected_revision: input.expectedRevision,
        p_changes: input.changes,
        p_actor_profile_id: input.actorId,
        p_change_reason: input.reason,
        p_request_id: input.requestId,
      },
    );
    this.checkCommand(error);
  }

  async publish(input: {
    expectedRevision: number;
    checksum: string;
    actorId: string;
    reason: string;
    requestId?: string;
  }) {
    const { error } = await getSupabaseAdminClient().rpc(
      "publish_taxonomy_revision",
      {
        p_expected_revision: input.expectedRevision,
        p_expected_checksum: input.checksum,
        p_actor_profile_id: input.actorId,
        p_change_reason: input.reason,
        p_request_id: input.requestId,
      },
    );
    this.checkCommand(error);
  }

  async rollback(input: {
    expectedRevision: number;
    targetRevision: number;
    actorId: string;
    reason: string;
    requestId?: string;
  }) {
    const { error } = await getSupabaseAdminClient().rpc(
      "rollback_taxonomy_revision",
      {
        p_expected_revision: input.expectedRevision,
        p_target_revision: input.targetRevision,
        p_actor_profile_id: input.actorId,
        p_change_reason: input.reason,
        p_request_id: input.requestId,
      },
    );
    this.checkCommand(error);
  }

  async history() {
    const { data, error } = await getSupabaseAdminClient()
      .from("taxonomy_publications")
      .select("revision,draft_revision,checksum,published_at,change_reason")
      .order("revision", { ascending: false })
      .limit(100);
    if (error || !data) databaseFailure("taxonomy.history", error);
    const audit = await getSupabaseAdminClient()
      .from("taxonomy_audit_events")
      .select("action,created_at,safe_payload")
      .order("created_at", { ascending: false })
      .limit(100);
    if (audit.error) databaseFailure("taxonomy.auditHistory", audit.error);
    return {
      events: (audit.data ?? []).map((event) => ({
        action: event.action,
        createdAt: event.created_at,
        reason:
          typeof event.safe_payload === "object" &&
          event.safe_payload &&
          "reason" in event.safe_payload
            ? String(event.safe_payload.reason ?? "")
            : "",
      })),
      records: data.map((row) => ({
        revision: row.revision,
        draftRevision: row.draft_revision,
        checksum: row.checksum,
        publishedAt: row.published_at,
        changeReason: row.change_reason,
      })),
    };
  }

  private checkCommand(error: { code: string } | null) {
    if (error?.code === "40001")
      throw new AppError({
        code: "CONFLICT",
        statusCode: 409,
        message:
          "La taxonomie a changé. Rechargez la révision avant de réessayer.",
      });
    if (error) databaseFailure("taxonomy.command", error);
  }

  getPublished(): Promise<TaxonomyPublication> {
    // Concurrent reads share one database snapshot, including cold-start hydration.
    // The promise is cleared on both success and failure; no failed read uses stale data.
    return (this.pending ??= this.readPublished().finally(() => {
      this.pending = undefined;
    }));
  }

  private async readPublished(): Promise<TaxonomyPublication> {
    // Always check the authoritative pointer. A failed database read must not
    // serve a previous revision, and a concurrent publication cannot mix rows.
    const { data, error } = await getSupabaseAdminClient().rpc(
      "get_taxonomy_publication",
      {
        p_if_revision: this.cached?.revision,
      },
    );
    if (error) databaseFailure("taxonomy.getPublication", error);
    if (!data)
      throw new AppError({
        code: "NETWORK_ERROR",
        statusCode: 503,
        message: "La taxonomie publiée est temporairement indisponible.",
      });
    const envelope = publicationSchema.safeParse(data);
    if (!envelope.success)
      databaseFailure("taxonomy.invalidPublication", envelope.error);
    if (
      envelope.data.bundle === null &&
      this.cached?.revision === envelope.data.revision &&
      this.cached.checksum === envelope.data.checksum
    ) {
      return this.cached;
    }
    const parsed = taxonomyPrivateBundleSchema.safeParse(envelope.data.bundle);
    if (!parsed.success)
      databaseFailure("taxonomy.invalidPublicationBundle", parsed.error);
    const publication = { ...envelope.data, bundle: parsed.data };
    this.cached = publication;
    return publication;
  }
}
