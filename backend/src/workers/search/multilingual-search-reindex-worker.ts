import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { databaseFailure } from "../../infrastructure/database/repositories/repository-error.js";

export class MultilingualSearchReindexWorker {
  async run(): Promise<Record<string, number>> {
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "reindex_multilingual_search_batch",
      { p_limit: 250 },
    );
    if (error) databaseFailure("search.reindexMultilingualBatch", error);
    return (data || {}) as Record<string, number>;
  }
}

export const multilingualSearchReindexWorker =
  new MultilingualSearchReindexWorker();
