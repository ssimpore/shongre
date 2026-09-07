import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import type { ApiPath, operations } from "@shongre/contracts/openapi";
import { mobileEnvironment } from "@/config/environment";
import { mobileMarketStore } from "@/features/market/market.store";
import { secureStorage } from "@/services/secure-storage/secure-storage";

const SESSION_KEY = "shongre.mobile.session.v1";

export interface StoredSession {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  sessionId?: string;
  user: unknown;
}

export class MobileApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "API_ERROR",
  ) {
    super(message);
    this.name = "MobileApiError";
  }
}

export function isMobileApiError(error: unknown): error is MobileApiError {
  return error instanceof MobileApiError;
}

function buildRequestHeaders(
  input: HeadersInit | undefined,
  token: string | null,
  marketCode: string,
  hasBody: boolean,
): Headers {
  const headers = new Headers(input);
  headers.set("Accept", "application/json");
  headers.set("X-Shongre-Client", "native");
  headers.set("X-Shongre-Market", marketCode);
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

type ApiRequestPath = ApiPath | `${ApiPath}?${string}`;
type RefreshRequest =
  operations["postAuthRefresh"]["requestBody"]["content"]["application/json"];
type RefreshResponse =
  operations["postAuthRefresh"]["responses"][200]["content"]["application/json"];

async function fetchApi(
  path: ApiRequestPath,
  init: RequestInit,
  token: string | null,
  marketCode: string,
): Promise<{ response: Response; payload: unknown }> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener("abort", abortFromCaller, { once: true });
  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.frontend.apiRequestTimeoutMs);
  try {
    if (controller.signal.aborted) throw controller.signal.reason;
    const response = await fetch(`${mobileEnvironment.apiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: buildRequestHeaders(
        init.headers,
        token,
        marketCode,
        Boolean(init.body),
      ),
    });
    const payload = await responsePayload(response);
    return { response, payload };
  } catch (error) {
    if (init.signal?.aborted && !timedOut) throw error;
    if (isMobileApiError(error)) throw error;
    throw new MobileApiError(
      timedOut
        ? "Le service met trop de temps à répondre. Réessayez."
        : "Connexion impossible. Vérifiez votre réseau puis réessayez.",
      0,
      timedOut ? "TIMEOUT" : "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(deadline);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}

async function responsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new MobileApiError(
      "La réponse du service est invalide. Réessayez.",
      response.status,
      "INVALID_API_RESPONSE",
    );
  }
}

function apiError(response: Response, payload: unknown): MobileApiError {
  const error =
    payload && typeof payload === "object" && "error" in payload
      ? (payload.error as { code?: string; message?: string } | undefined)
      : undefined;
  return new MobileApiError(
    error?.message || "La demande n’a pas pu aboutir.",
    response.status,
    error?.code,
  );
}

async function refreshSession(
  stored: StoredSession,
  marketCode: string,
): Promise<StoredSession | null> {
  if (!stored.refreshToken) return null;
  const body: RefreshRequest = { refreshToken: stored.refreshToken };
  const { response, payload: rawPayload } = await fetchApi(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    null,
    marketCode,
  );
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw apiError(response, rawPayload);
  const payload = rawPayload as RefreshResponse;
  if (
    !payload ||
    typeof payload !== "object" ||
    !("token" in payload) ||
    typeof payload.token !== "string" ||
    !("user" in payload)
  ) {
    throw new MobileApiError(
      "La session renouvelée est invalide.",
      response.status,
      "INVALID_API_RESPONSE",
    );
  }
  return payload as unknown as StoredSession;
}

// Login/logout advance the generation synchronously. Refresh may update only
// the generation that requested it, even while SecureStore writes are pending.
let sessionGeneration = 0;
let mutationTail: Promise<void> = Promise.resolve();
let refreshFlight: {
  generation: number;
  promise: Promise<StoredSession | null>;
} | null = null;

function mutateSession(operation: () => Promise<void>): Promise<void> {
  const result = mutationTail.then(operation);
  mutationTail = result.catch(() => undefined);
  return result;
}

function assertSameSession(generation: number): void {
  if (generation !== sessionGeneration) {
    throw new MobileApiError(
      "La session a changé. Réessayez.",
      401,
      "SESSION_CHANGED",
    );
  }
}

async function clearSessionIfCurrent(generation: number): Promise<void> {
  if (generation === sessionGeneration) await sessionStorage.clear();
}

function recoverSession(
  stored: StoredSession,
  marketCode: string,
  generation: number,
): Promise<StoredSession | null> {
  assertSameSession(generation);
  if (refreshFlight?.generation === generation) return refreshFlight.promise;
  const promise = (async () => {
    const current = await sessionStorage.read();
    assertSameSession(generation);
    if (!current) return null;
    // A delayed 401 may arrive after another request already rotated the token.
    if (current.token !== stored.token) return current;
    let refreshed: StoredSession | null;
    try {
      refreshed = await refreshSession(current, marketCode);
    } catch (error) {
      if (isMobileApiError(error) && error.code === "INVALID_API_RESPONSE") {
        await clearSessionIfCurrent(generation);
      }
      throw error;
    }
    assertSameSession(generation);
    if (!refreshed) {
      await clearSessionIfCurrent(generation);
      return null;
    }
    await mutateSession(async () => {
      assertSameSession(generation);
      await secureStorage.set(SESSION_KEY, JSON.stringify(refreshed));
    });
    assertSameSession(generation);
    return refreshed;
  })();
  const flight = { generation, promise };
  refreshFlight = flight;
  void promise
    .finally(() => {
      if (refreshFlight === flight) refreshFlight = null;
    })
    .catch(() => undefined);
  return promise;
}

export async function apiRequest<T>(
  path: ApiRequestPath,
  init: RequestInit = {},
  requestedMarketCode?: string,
): Promise<T> {
  const marketCode = requestedMarketCode ?? mobileMarketStore.getActive().code;
  const generation = sessionGeneration;
  const stored = await sessionStorage.read();
  assertSameSession(generation);
  const { response, payload } = await fetchApi(
    path,
    init,
    stored?.token ?? null,
    marketCode,
  );
  assertSameSession(generation);

  if (
    response.status === 401 &&
    stored &&
    path !== "/auth/login" &&
    path !== "/auth/refresh"
  ) {
    const refreshed = await recoverSession(stored, marketCode, generation);
    if (refreshed) {
      assertSameSession(generation);
      if (init.signal?.aborted) throw init.signal.reason;
      const retry = await fetchApi(path, init, refreshed.token, marketCode);
      assertSameSession(generation);
      if (retry.response.ok) return retry.payload as T;
      if (retry.response.status === 401)
        await clearSessionIfCurrent(generation);
      throw apiError(retry.response, retry.payload);
    }
  }
  if (!response.ok) throw apiError(response, payload);
  return payload as T;
}

export const sessionStorage = {
  key: SESSION_KEY,
  async read(): Promise<StoredSession | null> {
    await mutationTail;
    const raw = await secureStorage.get(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  },
  write(session: StoredSession): Promise<void> {
    sessionGeneration += 1;
    return mutateSession(() =>
      secureStorage.set(SESSION_KEY, JSON.stringify(session)),
    );
  },
  clear(): Promise<void> {
    sessionGeneration += 1;
    return mutateSession(() => secureStorage.remove(SESSION_KEY));
  },
};
