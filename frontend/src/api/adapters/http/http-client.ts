import { apiClientConfig } from "../../client/api-client.config";
import { AppError, AppErrorCode } from "../../errors/app-error";
import type { ApiPath, ApiPathForMethod } from "@shongre/contracts/openapi";
import { deterministicRuntimeId } from "../../../utilities/deterministic-id";

export interface HttpRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  /** Internal guard against recursive refresh retries. */
  _retried?: boolean;
}

export class HttpClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string = apiClientConfig.apiBaseUrl) {
    this.baseUrl = baseUrl;
  }

  private getCsrfToken(): string | null {
    if (typeof document === "undefined") return null;
    const entry = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith("shongre_csrf="));
    return entry
      ? decodeURIComponent(entry.slice("shongre_csrf=".length))
      : null;
  }

  private async refreshSession(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = fetch(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "{}",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }

  async request<T>(
    endpoint: ApiPath,
    options: HttpRequestOptions = {},
  ): Promise<T> {
    const {
      params,
      headers,
      timeoutMs = 15000,
      _retried = false,
      ...customConfig
    } = options;

    let url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    const method = String(customConfig.method || "GET").toUpperCase();
    const csrfToken = this.getCsrfToken();
    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Request-Id":
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : deterministicRuntimeId("req", [method, endpoint]),
      ...(csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)
        ? { "X-CSRF-Token": csrfToken }
        : {}),
      ...(headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...customConfig,
        credentials: "include",
        signal: controller.signal,
        headers: defaultHeaders,
      });

      clearTimeout(timeoutId);

      if (
        response.status === 401 &&
        !endpoint.startsWith("/auth/login") &&
        !endpoint.startsWith("/auth/register") &&
        !endpoint.startsWith("/auth/refresh") &&
        !_retried &&
        (await this.refreshSession())
      ) {
        return this.request<T>(endpoint, {
          ...options,
          _retried: true,
        });
      }

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // non-json response
        }

        const rawCode = errorData.error?.code || errorData.code;
        const rawMessage = errorData.error?.message || errorData.message;

        const code: AppErrorCode = rawCode
          ? (rawCode as AppErrorCode)
          : response.status === 401
            ? "UNAUTHENTICATED"
            : response.status === 403
              ? "FORBIDDEN"
              : response.status === 404
                ? "NOT_FOUND"
                : response.status === 409
                  ? "CONFLICT"
                  : response.status === 422
                    ? "VALIDATION_ERROR"
                    : "INTERNAL_ERROR";

        throw new AppError({
          code,
          message:
            rawMessage || `HTTP Request failed with status ${response.status}`,
          details: errorData.error || errorData,
        });
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err instanceof AppError) throw err;
      if (err.name === "AbortError") {
        throw new AppError({
          code: "TIMEOUT",
          message:
            "Délai d’attente dépassé lors de la communication avec le serveur.",
        });
      }
      throw new AppError({
        code: "NETWORK_ERROR",
        message: err.message || "Impossible de contacter le serveur Shongre.",
        originalError: err,
      });
    }
  }

  get<T>(
    endpoint: ApiPathForMethod<"get">,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(
    endpoint: ApiPathForMethod<"post">,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(
    endpoint: ApiPathForMethod<"put">,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(
    endpoint: ApiPathForMethod<"patch">,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(
    endpoint: ApiPathForMethod<"delete">,
    options?: HttpRequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const httpClient = new HttpClient();
