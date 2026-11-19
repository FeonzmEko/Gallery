import { Hono, type Context } from 'hono';
import {
  type AuthUser,
  isAppError,
  ErrorCode,
  errorResponse,
  successResponse,
  UnauthorizedError,
  ForbiddenError,
  hasAdminPrivileges,
} from '@archive/contracts';
import { CommentService, hashIp } from '../application/comment.service.js';
import {
  CreateCommentInputSchema,
  UpdateCommentStatusInputSchema,
  CommentPaginationQuerySchema,
} from './schema.js';

export interface CommentVariables {
  user?: AuthUser | null;
  services?: any;
  requestId?: string;
  [key: string]: unknown;
}

export interface CommentEnv {
  Variables: CommentVariables;
}

export interface CommentRouteDependencies {
  comment?: CommentService;
  getCommentService?: (c: Context<CommentEnv>) => CommentService;
}

/**
 * Mounts Comment module REST API routes on Hono router.
 */
export function mountCommentRoutes(
  app: Hono<any>,
  deps: CommentRouteDependencies
): void {
  const router = new Hono<CommentEnv>();

  router.onError((err, c) => {
    if (isAppError(err)) {
      return c.json(
        errorResponse(err.code, err.message, err.details),
        err.statusCode as any
      );
    }
    return c.json(
      errorResponse(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '服务器内部发生意外错误'),
      500
    );
  });

  const resolveService = (c: Context<CommentEnv>): CommentService => {
    if (deps.comment) return deps.comment;
    if (deps.getCommentService) return deps.getCommentService(c);
    const services = c.get('services') as Record<string, any> | undefined;
    if (services?.comment) return services.comment as CommentService;
    throw new Error('CommentService not configured in AppServices');
  };

  const requireAdmin = async (c: Context<CommentEnv>, next: () => Promise<void>) => {
    const user = c.get('user');
    if (!user) {
      throw new UnauthorizedError('未认证或凭证已失效');
    }
    if (!hasAdminPrivileges(user.role)) {
      throw new ForbiddenError('权限不足，仅管理员可执行该操作');
    }
    await next();
  };

  // 1. List Approved Comments for an Entry (Public read with CDN Cache header)
  router.get('/entries/:entryId/comments', async (c) => {
    const service = resolveService(c);
    const entryId = c.req.param('entryId')!;
    const query = c.req.query();
    const parsedQuery = CommentPaginationQuerySchema.parse(query);

    const result = await service.listComments(entryId, {
      cursor: parsedQuery.cursor,
      limit: parsedQuery.limit,
    });

    c.header('Cache-Control', 'public, max-age=30, s-maxage=300');
    return c.json(
      successResponse(result.items, {
        pagination: result.pagination,
      })
    );
  });

  // 2. Post a New Comment for an Entry (Public visitor submission with IP hashing)
  router.post('/entries/:entryId/comments', async (c) => {
    const service = resolveService(c);
    const entryId = c.req.param('entryId')!;
    const body = await c.req.json().catch(() => ({}));
    const validated = CreateCommentInputSchema.parse(body);

    const clientIp =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      '127.0.0.1';

    const userAgent = c.req.header('user-agent');
    const ipHash = await hashIp(clientIp);

    const created = await service.createComment(entryId, validated, ipHash, userAgent);
    return c.json(successResponse(created), 201);
  });

  // 3. Moderate Comment Status (Admin only)
  router.put('/comments/:id/status', requireAdmin, async (c) => {
    const service = resolveService(c);
    const id = c.req.param('id')!;
    const body = await c.req.json().catch(() => ({}));
    const validated = UpdateCommentStatusInputSchema.parse(body);

    const updated = await service.updateCommentStatus(id, validated.status);
    return c.json(successResponse(updated));
  });

  // 4. Delete Comment (Admin only)
  router.delete('/comments/:id', requireAdmin, async (c) => {
    const service = resolveService(c);
    const id = c.req.param('id')!;

    await service.deleteComment(id);
    return c.json(successResponse({ success: true, deletedId: id }));
  });

  app.route('/api/v1', router);
}
