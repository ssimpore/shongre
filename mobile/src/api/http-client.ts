import { mobileEnvironment } from "@/config/environment";
import { secureStorage } from "@/services/secure-storage/secure-storage";

const SESSION_KEY = "shongre.mobile.session.v1";

export interface StoredSession {
  token: string;
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

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!mobileEnvironment.apiUrl) {
    throw new MobileApiError(
      "L’API mobile n’est pas configurée.",
      0,
      "CONFIG_ERROR",
    );
  }
  const token = await readToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

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
