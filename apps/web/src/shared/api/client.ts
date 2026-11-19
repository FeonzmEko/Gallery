import {
  AppError,
  ErrorCode,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  InternalServerError,
  type ApiResponse,
  type ApiErrorResponse,
  type ApiErrorDetail,
} from '@archive/contracts';
import { generateUlid } from '@archive/shared';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  token?: string | null;
}

const TOKEN_STORAGE_KEY = 'archive_auth_token';

let currentToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (!currentToken) {
    currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return currentToken;
}

export function setStoredToken(token: string | null): void {
  currentToken = token;
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function onUnauthorized(callback: () => void): void {
  onUnauthorizedCallback = callback;
}

/**
 * Builds full URL with query parameters.
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  const base = endpoint.startsWith('http') ? endpoint : endpoint;
  if (!params) return base;

  const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  // If base was relative, return pathname + search
  return endpoint.startsWith('http') ? url.toString() : `${url.pathname}${url.search}`;
}

/**
 * Maps server API error responses to strongly-typed AppError hierarchy.
 */
function mapToAppError(
  status: number,
  payload?: { code?: string; message?: string; details?: ApiErrorDetail[] }
): AppError {
  const message = payload?.message || `网络请求失败 (${status})`;
  const code = payload?.code || ErrorCode.INTERNAL_ERROR;
  const details = payload?.details;

  switch (code) {
    case ErrorCode.UNAUTHORIZED:
      return new UnauthorizedError(message);
    case ErrorCode.FORBIDDEN:
      return new ForbiddenError(message);
    case ErrorCode.NOT_FOUND:
      return new NotFoundError(message);
    case ErrorCode.VALIDATION_ERROR:
      return new ValidationError(message, details);
    case ErrorCode.CONFLICT:
      return new ConflictError(message);
    case ErrorCode.INTERNAL_ERROR:
      return new InternalServerError(message);
    default:
      if (status === 401) return new UnauthorizedError(message);
      if (status === 403) return new ForbiddenError(message);
      if (status === 404) return new NotFoundError(message);
      if (status === 400) return new ValidationError(message, details);
      return new AppError(message, { code, statusCode: status, details });
  }
}

/**
 * Base HTTP request executor.
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, token = getStoredToken(), headers: customHeaders, body, ...fetchOptions } = options;

  const url = buildUrl(endpoint, params);
  const requestId = `req_${generateUlid()}`;

  const headers = new Headers(customHeaders);
  headers.set('x-request-id', requestId);
  headers.set('Accept', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Handle body JSON encoding if not FormData or URLSearchParams
  let requestBody = body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...fetchOptions,
      headers,
      body: requestBody,
      credentials: 'include', // Include cookies for same-origin or CORS
    });
  } catch (networkError) {
    throw new AppError(
      networkError instanceof Error ? networkError.message : '网络连接失败，请检查网络设置',
      {
        code: 'NETWORK_ERROR',
        statusCode: 0,
        cause: networkError,
      }
    );
  }

  // Handle 401 Unauthorized
  if (res.status === 401) {
    setStoredToken(null);
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  // Parse JSON response
  let json: ApiResponse<T> | ApiErrorResponse | null = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  }

  if (!res.ok || (json && !json.success)) {
    const errorPayload = json && 'error' in json ? json.error : undefined;
    throw mapToAppError(res.status, errorPayload);
  }

  if (json && 'data' in json) {
    return json.data;
  }

  return (json as unknown as T) ?? ({} as T);
}

export const apiClient = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'GET' }),

  post: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'POST', body: data as any }),

  put: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'PUT', body: data as any }),

  patch: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'PATCH', body: data as any }),

  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),

  request,
};
