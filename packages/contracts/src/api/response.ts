/**
 * Standard API Response Contracts
 *
 * Adheres to REST API specification defined in docs/architecture.md#6.2.
 */

export interface PaginationMeta {
  /**
   * Next page cursor (null if no more records).
   */
  cursor?: string | null;
  /**
   * Whether more records exist beyond the current page.
   */
  hasMore: boolean;
  /**
   * Page size limit.
   */
  limit: number;
  /**
   * Total count (optional, typically used in admin management lists).
   */
  total?: number;
}

export interface ApiMeta {
  /**
   * Traceable unique request identifier (e.g. "req_01J...").
   */
  requestId?: string;
  /**
   * Response generation timestamp (Unix ms).
   */
  timestamp?: number;
  /**
   * Cursor or page pagination metadata.
   */
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
  meta?: ApiMeta;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Helper to construct a standard successful API response.
 */
export function successResponse<T>(data: T, meta?: ApiMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      ...meta,
    },
  };
}

/**
 * Helper to construct a standard error API response.
 */
export function errorResponse(
  code: string,
  message: string,
  details?: ApiErrorDetail[],
  meta?: ApiMeta
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: Date.now(),
      ...meta,
    },
  };
}
