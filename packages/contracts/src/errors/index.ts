import type { ApiErrorDetail } from '../api/response.js';

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  MEDIA_TYPE_NOT_ALLOWED: 'MEDIA_TYPE_NOT_ALLOWED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode] | (string & {});

/**
 * Base Application Error class for domain and application level errors.
 * Cleanly mapped to HTTP status codes and API error response format in workers/api.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ApiErrorDetail[];

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      details?: ApiErrorDetail[];
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? ErrorCode.INTERNAL_ERROR;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = '数据校验失败', details?: ApiErrorDetail[]) {
    super(message, {
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 400,
      details,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未认证或凭证已失效') {
    super(message, {
      code: ErrorCode.UNAUTHORIZED,
      statusCode: 401,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足，禁止访问') {
    super(message, {
      code: ErrorCode.FORBIDDEN,
      statusCode: 403,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = '请求的资源不存在', id?: string) {
    const msg = id ? `${resource} (ID: ${id}) 不存在` : resource;
    super(msg, {
      code: ErrorCode.NOT_FOUND,
      statusCode: 404,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突或已存在') {
    super(message, {
      code: ErrorCode.CONFLICT,
      statusCode: 409,
    });
  }
}

export class MediaTypeNotAllowedError extends AppError {
  constructor(message: string = '不支持该媒体文件类型') {
    super(message, {
      code: ErrorCode.MEDIA_TYPE_NOT_ALLOWED,
      statusCode: 415,
    });
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxSizeBytes: number) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    super(`文件大小超出限制，最大允许 ${sizeMb} MB`, {
      code: ErrorCode.FILE_TOO_LARGE,
      statusCode: 413,
    });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = '服务器内部发生意外错误', cause?: unknown) {
    super(message, {
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: 500,
      cause,
    });
  }
}

/**
 * Type guard to check if an unknown error is an instance of AppError.
 */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
