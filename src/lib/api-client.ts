import { useAuthStore } from '../stores/authStore';
import type { ApiError, ApiResponse } from '../types/api';

/**
 * Base HTTP client for MarinMC API with retry logic, auth injection, and timeout.
 */
class ApiClient {
  private baseUrl: string;
  private maxRetries = 3;
  private timeout = 10_000;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    const session = useAuthStore.getState().session;
    return session?.token ?? null;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Version': '0.9.2',
      'Accept': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const res = await fetch(url.toString(), {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          const apiError: ApiError = {
            status: res.status,
            code: errorBody.code ?? 'UNKNOWN',
            message: errorBody.message ?? res.statusText,
          };

          // Only retry on 5xx server errors
          if (res.status >= 500 && attempt < this.maxRetries - 1) {
            lastError = new Error(apiError.message);
            await this.delay(Math.pow(2, attempt) * 1000);
            continue;
          }

          return { success: false, data: null as unknown as T, error: apiError };
        }

        const data = await res.json() as T;
        return { success: true, data };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    return {
      success: false,
      data: null as unknown as T,
      error: {
        status: 0,
        code: 'NETWORK_ERROR',
        message: lastError?.message ?? 'Bağlantı hatası',
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** GET request */
  get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, { params });
  }

  /** POST request */
  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, { body });
  }

  /** PUT request */
  put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, { body });
  }

  /** DELETE request */
  del<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }
}

/** Singleton API client instance */
export const apiClient = new ApiClient('https://api.marinmc.com/v1');
