import {
  getSupabaseAdminClient,
  getSupabaseAnonClient,
} from "../supabase/supabase-client.js";
import { isBackendDemoMode } from "../../app/config/index.js";
import { logger } from "../logging/logger.js";

export class DatabaseClient {
  public get admin() {
    return getSupabaseAdminClient();
  }

  public get client() {
    return getSupabaseAnonClient();
  }

  public async healthCheck(): Promise<boolean> {
    if (isBackendDemoMode()) {
      return true;
    }

    try {
      const timeoutPromise = new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 2000),
      );
      const queryPromise = (async () => {
        const { data, error } = await this.admin
          .from("markets")
          .select("code")
          .limit(1);
        return !error && Boolean(data);
      })();
      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (err: any) {
      logger.error(`Database healthCheck failed: ${err.message}`);
      return false;
    }
  }
}

export const db = new DatabaseClient();
