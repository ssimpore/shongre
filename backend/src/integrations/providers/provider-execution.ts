import { AppError } from "../../shared/errors/app-error.js";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ProviderExecutionKey {
  providerId: string;
  capability: string;
  marketCode: string;
}

export interface ProviderExecutionOptions<T> extends ProviderExecutionKey {
  operation: () => Promise<T>;
  mutating: boolean;
  idempotencyKey?: string;
  maxAttempts?: number;
  isRetryable?: (error: unknown) => boolean;
}

interface CircuitRecord {
  state: CircuitState;
  failures: number;
  openedAt?: number;
}

const keyOf = ({ providerId, capability, marketCode }: ProviderExecutionKey) =>
  `${providerId}:${capability}:${marketCode}`;

/**
 * Process-local fast circuit breaker. Durable state/history is represented by
 * provider_circuit_states; this guard prevents a single process from repeatedly
 * hammering a failing upstream while the durable worker integration is rolled
 * out.
 */
export class ProviderExecutionGuard {
  private circuits = new Map<string, CircuitRecord>();

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 30_000,
  ) {}

  async execute<T>(options: ProviderExecutionOptions<T>): Promise<T> {
    const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
    if (options.mutating && maxAttempts > 1 && !options.idempotencyKey) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "A mutating provider operation cannot be retried without an idempotency key.",
      });
    }

    const key = keyOf(options);
    const circuit = this.circuits.get(key) || {
      state: "CLOSED" as const,
      failures: 0,
    };
    if (circuit.state === "OPEN") {
      const elapsed = Date.now() - (circuit.openedAt || 0);
      if (elapsed < this.cooldownMs) {
        throw new AppError({
          code: "NETWORK_ERROR",
          statusCode: 503,
          message: "Provider circuit is open; retry after the cooldown period.",
          details: {
            providerId: options.providerId,
            capability: options.capability,
            marketCode: options.marketCode,
            retryAfterMs: this.cooldownMs - elapsed,
          },
        });
      }
      circuit.state = "HALF_OPEN";
      this.circuits.set(key, circuit);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await options.operation();
        this.circuits.set(key, { state: "CLOSED", failures: 0 });
        return result;
      } catch (error) {
        lastError = error;
        const retryable = options.isRetryable?.(error) ?? false;
        if (!retryable || attempt === maxAttempts) break;
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * 2 ** (attempt - 1)),
        );
      }
    }

    circuit.failures += 1;
    if (circuit.failures >= this.failureThreshold) {
      circuit.state = "OPEN";
      circuit.openedAt = Date.now();
    } else if (circuit.state === "HALF_OPEN") {
      circuit.state = "OPEN";
      circuit.openedAt = Date.now();
    }
    this.circuits.set(key, circuit);
    throw lastError;
  }

  getState(key: ProviderExecutionKey): CircuitRecord {
    return this.circuits.get(keyOf(key)) || { state: "CLOSED", failures: 0 };
  }

  reset(key: ProviderExecutionKey): void {
    this.circuits.delete(keyOf(key));
  }
}

export const providerExecutionGuard = new ProviderExecutionGuard();
