import {
  apiClientConfig,
  resolveApiRequestBaseUrl,
} from "../../client/api-client.config";
import { AppError, AppErrorCode } from "../../errors/app-error";
import type { ApiPath, ApiPathForMethod } from "@shongre/contracts/openapi";
import { deterministicRuntimeId } from "../../../utilities/deterministic-id";
import { currentBrowserMarketCode } from "../../../domains/market/market-routing";
import { telemetryService } from "../../../services/telemetry.service";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";

type ServerRequestHeaders = () => Promise<Readonly<Record<string, string>>>;

/**
 * Server rendering calls the API directly rather than through the browser
 * relay, so a server-only module supplies the per-request headers the relay
 * would have forwarded. Client bundles never register one.
 */
let serverRequestHeaders: ServerRequestHeaders | null = null;

export function registerServerRequestHeaders(
  provider: ServerRequestHeaders,
): void {
  serverRequestHeaders = provider;
}

interface HttpRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  /** Internal guard against recursive refresh retries. */
  _retried?: boolean;
}

class HttpClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string = apiClientConfig.apiBaseUrl) {
    this.baseUrl = resolveApiRequestBaseUrl(baseUrl);
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
    const marketCode = currentBrowserMarketCode();
    this.refreshPromise = fetch(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(marketCode ? { "X-Shongre-Market": marketCode } : {}),
      },
      body: "{}",
      signal: AbortSignal.timeout(
        SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.frontend.apiRequestTimeoutMs,
      ),
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }

  request = async <T>(
    endpoint: ApiPath,
    options: HttpRequestOptions = {},
  ): Promise<T> => {
    const {
      params,
      headers,
      timeoutMs = SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.frontend
        .apiRequestTimeoutMs,
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
    const marketCode = currentBrowserMarketCode();
    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : deterministicRuntimeId("req", [method, endpoint]);
    const defaultHeaders = new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Request-Id": requestId,
      ...(csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)
        ? { "X-CSRF-Token": csrfToken }
        : {}),
      ...(marketCode ? { "X-Shongre-Market": marketCode } : {}),
    });
    if (typeof window === "undefined" && serverRequestHeaders) {
      for (const [name, value] of Object.entries(await serverRequestHeaders()))
        defaultHeaders.set(name, value);
    }
    new Headers(headers).forEach((value, key) =>
      defaultHeaders.set(key, value),
    );

    const controller = new AbortController();
    const callerSignal = customConfig.signal;
    let timedOut = false;
    const abortFromCaller = () => controller.abort(callerSignal?.reason);
    if (callerSignal?.aborted) abortFromCaller();
    else
      callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const cleanupAbort = () => {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    };

    try {
      const response = await fetch(url, {
        ...customConfig,
        credentials: customConfig.credentials ?? "include",
        signal: controller.signal,
        headers: defaultHeaders,
      });

      if (
        response.status === 401 &&
        !endpoint.startsWith("/auth/login") &&
        !endpoint.startsWith("/auth/register") &&
        !endpoint.startsWith("/auth/refresh") &&
        !_retried
      ) {
        // A guest response can arrive after login, refresh, or logout. Retry
        // with a newly issued session without rotating it; never refresh an
        // anonymous request or resurrect a session that has just logged out.
        const currentCsrfToken = this.getCsrfToken();
        const recovered =
          currentCsrfToken &&
          (currentCsrfToken !== csrfToken
            ? ["GET", "HEAD", "OPTIONS"].includes(method)
            : await this.refreshSession());
        if (recovered) {
          cleanupAbort();
          return this.request<T>(endpoint, {
            ...options,
            _retried: true,
          });
        }
      }

      if (!response.ok) {
        telemetryService.captureOperationalFailure(
          new Error("Shongre API request failed"),
          "api-request",
          { requestId, route: endpoint, statusCode: response.status },
        );
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (error) {
          if (controller.signal.aborted) throw error;
        }

        const rawCode = errorData.error?.code || errorData.code;
        const rawMessage =
          errorData.error?.message || errorData.detail || errorData.message;

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
                  : response.status === 429
                    ? "RATE_LIMITED"
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

      const result =
        response.status === 204 ? undefined : await response.json();
      return result as T;
    } catch (err: any) {
      cleanupAbort();
      if (err instanceof AppError) throw err;
      if (callerSignal?.aborted && !timedOut) throw err;
      if (err.name === "AbortError") {
        telemetryService.captureOperationalFailure(
          new Error("Shongre API request timed out"),
          "api-timeout",
          { requestId, route: endpoint },
        );
        throw new AppError({
          code: "TIMEOUT",
          message:
            "Délai d’attente dépassé lors de la communication avec le serveur.",
        });
      }
      telemetryService.captureOperationalFailure(
        new Error("Shongre API network request failed"),
        "api-network",
        { requestId, route: endpoint },
      );
      throw new AppError({
        code: "NETWORK_ERROR",
        message: "Impossible de contacter le serveur Shongre.",
        originalError: err,
      });
    } finally {
      cleanupAbort();
    }
  };

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
