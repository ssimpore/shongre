import { mobileEnvironment } from "@/config/environment";
import { secureStorage } from "@/services/secure-storage/secure-storage";
import type { ApiPath } from "@shongre/contracts/openapi";
import { mobileMarketStore } from "@/features/market/market.store";

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

async function readToken(): Promise<string | null> {
  const raw = await secureStorage.get(SESSION_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as StoredSession).token || null;
  } catch {
    await secureStorage.remove(SESSION_KEY);
    return null;
  }
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
  if (hasBody && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export async function apiRequest<T>(
  path: ApiPath,
  init: RequestInit = {},
  requestedMarketCode?: string,
): Promise<T> {
  if (!mobileEnvironment.apiUrl) {
    throw new MobileApiError(
      "L’API mobile n’est pas configurée.",
      0,
      "CONFIG_ERROR",
    );
  }
  const token = await readToken();
  const marketCode = requestedMarketCode ?? mobileMarketStore.getActive().code;
  const headers = buildRequestHeaders(
    init.headers,
    token,
    marketCode,
    Boolean(init.body),
  );

  let response: Response;
  try {
    response = await fetch(`${mobileEnvironment.apiUrl}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new MobileApiError(
      "Connexion impossible. Vérifiez votre réseau puis réessayez.",
      0,
      "NETWORK_ERROR",
    );
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (
    response.status === 401 &&
    path !== "/auth/login" &&
    path !== "/auth/refresh"
  ) {
    const stored = await sessionStorage.read();
    if (stored?.refreshToken) {
      const refreshResponse = await fetch(
        `${mobileEnvironment.apiUrl}/auth/refresh`,
        {
          method: "POST",
          headers: buildRequestHeaders(undefined, null, marketCode, true),
          body: JSON.stringify({ refreshToken: stored.refreshToken }),
        },
      );
      const refreshText = await refreshResponse.text();
      const refreshed = refreshText
        ? (JSON.parse(refreshText) as StoredSession)
        : null;
      if (refreshResponse.ok && refreshed?.token && refreshed.user) {
        await sessionStorage.write(refreshed);
        const retryHeaders = buildRequestHeaders(
          init.headers,
          refreshed.token,
          marketCode,
          Boolean(init.body),
        );
        const retry = await fetch(`${mobileEnvironment.apiUrl}${path}`, {
          ...init,
          headers: retryHeaders,
        });
        const retryText = await retry.text();
        const retryPayload = retryText ? JSON.parse(retryText) : null;
        if (retry.ok) return retryPayload as T;
      }
      await sessionStorage.clear();
    }
  }
  if (!response.ok) {
    throw new MobileApiError(
      payload?.error?.message || "La demande n’a pas pu aboutir.",
      response.status,
      payload?.error?.code,
    );
  }
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
