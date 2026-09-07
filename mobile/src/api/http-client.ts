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

async function readToken(): Promise<string | null> {
  return (await sessionStorage.read())?.token ?? null;
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
): Promise<Response> {
  try {
    return await fetch(`${mobileEnvironment.apiUrl}${path}`, {
      ...init,
      headers: buildRequestHeaders(
        init.headers,
        token,
        marketCode,
        Boolean(init.body),
      ),
    });
  } catch {
    throw new MobileApiError(
      "Connexion impossible. Vérifiez votre réseau puis réessayez.",
      0,
      "NETWORK_ERROR",
    );
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
  const response = await fetchApi(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    null,
    marketCode,
  );
  const payload = (await responsePayload(response)) as RefreshResponse;
  if (!response.ok) return null;
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

export async function apiRequest<T>(
  path: ApiRequestPath,
  init: RequestInit = {},
  requestedMarketCode?: string,
): Promise<T> {
  const marketCode = requestedMarketCode ?? mobileMarketStore.getActive().code;
  const response = await fetchApi(path, init, await readToken(), marketCode);

  if (
    response.status === 401 &&
    path !== "/auth/login" &&
    path !== "/auth/refresh"
  ) {
    const stored = await sessionStorage.read();
    if (stored) {
      let refreshed: StoredSession | null;
      try {
        refreshed = await refreshSession(stored, marketCode);
      } catch (error) {
        if (isMobileApiError(error) && error.code === "NETWORK_ERROR") {
          throw error;
        }
        await sessionStorage.clear();
        throw error;
      }
      if (refreshed) {
        await sessionStorage.write(refreshed);
        const retry = await fetchApi(path, init, refreshed.token, marketCode);
        const retryPayload = await responsePayload(retry);
        if (retry.ok) return retryPayload as T;
        if (retry.status !== 401) throw apiError(retry, retryPayload);
      }
      await sessionStorage.clear();
    }
  }

  const payload = await responsePayload(response);
  if (!response.ok) throw apiError(response, payload);
  return payload as T;
}

export const sessionStorage = {
  key: SESSION_KEY,
  async read(): Promise<StoredSession | null> {
    const raw = await secureStorage.get(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      await secureStorage.remove(SESSION_KEY);
      return null;
    }
  },
  async write(session: StoredSession): Promise<void> {
    await secureStorage.set(SESSION_KEY, JSON.stringify(session));
  },
  async clear(): Promise<void> {
    await secureStorage.remove(SESSION_KEY);
  },
};
