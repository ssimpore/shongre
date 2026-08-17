import { apiClientConfig } from '../../client/api-client.config';
import { AppError } from '../../errors/app-error';

export interface HttpRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
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
    const { params, headers, ...customConfig } = options;

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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...customConfig,
        headers: defaultHeaders,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // ignore non-json error responses
        }

        throw new AppError({
          code: response.status === 401 ? 'UNAUTHENTICATED' : response.status === 403 ? 'FORBIDDEN' : response.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: errorData.message || `HTTP Request failed with status ${response.status}`,
          details: errorData,
        });
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
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
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
