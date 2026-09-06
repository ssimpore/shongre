const SERIALIZATION_FAILURE_CODE = "40001";
const MAX_SERIALIZATION_ATTEMPTS = 3;
const SERIALIZATION_RETRY_DELAYS_MS = [10, 20] as const;

type DatabaseErrorLike = {
  code?: unknown;
};

type DatabaseMutationResult = {
  error?: unknown;
};

function isSerializationFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as DatabaseErrorLike).code === SERIALIZATION_FAILURE_CODE
  );
}

function resultError(result: unknown): unknown {
  return typeof result === "object" && result !== null
    ? (result as DatabaseMutationResult).error
    : undefined;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Retries one idempotent database statement only when PostgreSQL reports a
 * serialization failure. Every other returned or thrown error is preserved,
 * and the third 40001 result is returned/thrown unchanged to the caller.
 */
export async function retryDatabaseSerializationFailure<T>(
  mutation: () => PromiseLike<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      const result = await mutation();
      if (
        !isSerializationFailure(resultError(result)) ||
        attempt === MAX_SERIALIZATION_ATTEMPTS
      ) {
        return result;
      }
    } catch (error) {
      if (
        !isSerializationFailure(error) ||
        attempt === MAX_SERIALIZATION_ATTEMPTS
      ) {
        throw error;
      }
    }

    await wait(SERIALIZATION_RETRY_DELAYS_MS[attempt - 1]);
  }

  throw new Error("Unreachable database serialization retry state.");
}
