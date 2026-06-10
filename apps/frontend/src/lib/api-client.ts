import { env } from './env';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  requestId: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  path: string;
  timestamp: string;
  requestId: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: ApiError,
  ) {
    super(body.message);
    this.name = 'ApiClientError';
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.body.code === 'POLICY_CONFLICT') {
      return `${error.body.message} Use a different name, country, or role.`;
    }
    return error.body.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  tenantId?: string;
  token?: string;
}

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private buildHeaders(options: RequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    if (options.tenantId) {
      headers['X-Tenant-Id'] = options.tenantId;
    }

    return headers;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { body, tenantId, token, headers: customHeaders, ...fetchOptions } = options;

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...fetchOptions,
      headers: {
        ...this.buildHeaders({ tenantId, token }),
        ...customHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as ApiError;
      throw new ApiClientError(response.status, errorBody);
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  get<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(env.apiUrl);
