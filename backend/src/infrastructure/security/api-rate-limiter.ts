import { createHash } from "node:crypto";
import { config } from "../../app/config/index.js";
import { getSupabaseAdminClient } from "../supabase/supabase-client.js";
import { AppError } from "../../shared/errors/app-error.js";

const demoBuckets = new Map<string, { attempts: number; resetAt: number }>();

export class ApiRateLimiter {
  async consume(input: {
    subject: string;
    authenticated: boolean;
  }): Promise<void> {
    const limit = input.authenticated
      ? config.authenticatedApiRateLimit
      : config.publicApiRateLimit;
    const action = input.authenticated ? "api_authenticated" : "api_public";
    const keyHash = createHash("sha256")
      .update(`${config.environment.environmentId}:${action}:${input.subject}`)
      .digest("hex");

    if (config.dataMode === "demo") {
      const now = Date.now();
      const current = demoBuckets.get(`${action}:${keyHash}`);
      if (!current || current.resetAt <= now) {
        demoBuckets.set(`${action}:${keyHash}`, {
          attempts: 1,
          resetAt: now + config.apiRateLimitWindowSeconds * 1_000,
        });
        return;
      }
      current.attempts += 1;
      if (current.attempts <= limit) return;
      this.reject(Math.max(1, Math.ceil((current.resetAt - now) / 1_000)));
    }

    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "consume_auth_rate_limit",
      {
        p_key_hash: keyHash,
        p_action: action,
        p_limit: limit,
        p_window_seconds: config.apiRateLimitWindowSeconds,
        p_lock_seconds: config.apiRateLimitLockSeconds,
      },
    );
    if (error) throw error;
    const decision = Array.isArray(data) ? data[0] : data;
    if (decision?.allowed !== true) {
      this.reject(Number(decision?.retry_after_seconds || 1));
    }
  }

  private reject(retryAfterSeconds: number): never {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Trop de requêtes. Réessayez dans quelques instants.",
      details: { retryAfterSeconds },
    });
  }
}

export const apiRateLimiter = new ApiRateLimiter();
