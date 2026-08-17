import { apiClientConfig } from '../../client/api-client.config';
import { AppError, AppErrorCode } from '../../errors/app-error';

export interface HttpRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = apiClientConfig.apiBaseUrl) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('shongre_auth_token');
    }
    return null;
  }

  async request<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<T> {
    const { params, headers, timeoutMs = 15000, ...customConfig } = options;

    let url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const token = this.getAuthToken();
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Request-Id': `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...customConfig,
        signal: controller.signal,
        headers: defaultHeaders,
      });

      clearTimeout(timeoutId);

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
          ? 'UNAUTHENTICATED'
          : response.status === 403
          ? 'FORBIDDEN'
          : response.status === 404
          ? 'NOT_FOUND'
          : response.status === 409
          ? 'CONFLICT'
          : response.status === 422
          ? 'VALIDATION_ERROR'
          : 'INTERNAL_ERROR';

        throw new AppError({
          code,
          message: rawMessage || `HTTP Request failed with status ${response.status}`,
          details: errorData.error || errorData,
        });
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err instanceof AppError) throw err;
      if (err.name === 'AbortError') {
        throw new AppError({
          code: 'TIMEOUT',
          message: 'Délai d’attente dépassé lors de la communication avec le serveur.',
        });
      }
      throw new AppError({
        code: 'NETWORK_ERROR',
        message: err.message || 'Impossible de contacter le serveur Shongre.',
        originalError: err,
      });
    }
  }

  get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
