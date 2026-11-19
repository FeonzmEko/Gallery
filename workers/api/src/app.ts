import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import {
  type AuthUser,
  type StoragePort,
  isAppError,
  ErrorCode,
  errorResponse,
  successResponse,
  UnauthorizedError,
  ForbiddenError,
  hasAdminPrivileges,
  CreateEntryInputSchema,
  UpdateEntryInputSchema,
  RequestUploadTicketSchema,
  MediaRoleSchema,
} from '@archive/contracts';
import { generateUlid } from '@archive/shared';
import type { Env } from './env.js';
import { bootstrapServices, type AppServices } from './bootstrap.js';

export interface AppContext {
  Bindings: Env;
  Variables: {
    services: AppServices;
    user?: AuthUser | null;
    requestId: string;
  };
}

const BindMediaSchema = z.object({
  entryId: z.string().min(1),
  mediaId: z.string().min(1),
  role: MediaRoleSchema.optional().default('gallery'),
  sortOrder: z.number().int().optional().default(0),
  caption: z.string().trim().max(500).optional().nullable(),
});

const LoginInputSchema = z.object({
  email: z.string().trim().email('请输入合法的邮箱地址'),
  password: z.string().min(1, '密码不能为空'),
});

/**
 * Creates and configures the Hono application instance.
 */
export function createApp(customStorage?: StoragePort): Hono<AppContext> {
  const app = new Hono<AppContext>();

  // 1. Traceable Request ID & Services Injection Middleware
  app.use('*', async (c, next) => {
    const reqId = c.req.header('x-request-id') || `req_${generateUlid()}`;
    c.set('requestId', reqId);
    c.header('x-request-id', reqId);

    // Bootstrap services if not already attached
    if (!c.get('services')) {
      const services = bootstrapServices(c.env, customStorage);
      c.set('services', services);
    }

    // Extract Bearer token from Authorization header or Cookie
    const authHeader = c.req.header('Authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      // Cookie fallback
      const cookieHeader = c.req.header('Cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/auth_token=([^;]+)/);
        if (match && match[1]) {
          token = match[1];
        }
      }
    }

    if (token) {
      const services = c.get('services');
      const authUser = await services.auth.verifyToken(token);
      c.set('user', authUser);
    } else {
      c.set('user', null);
    }

    await next();
  });

  // 2. CORS Middleware
  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'x-request-id'],
      maxAge: 86400,
    })
  );

  // 3. Global Exception Handler: converts AppError and ZodError to standard response
  app.onError((err, c) => {
    const requestId = c.get('requestId') || `req_${generateUlid()}`;

    if (isAppError(err)) {
      return c.json(
        errorResponse(err.code, err.message, err.details, { requestId }),
        err.statusCode as any
      );
    }

    if (err instanceof z.ZodError) {
      const details = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return c.json(
        errorResponse(ErrorCode.VALIDATION_ERROR, '请求参数校验失败', details, { requestId }),
        400
      );
    }

    console.error(`[Unhandled Error] [${requestId}]:`, err);
    return c.json(
      errorResponse(
        ErrorCode.INTERNAL_ERROR,
        err instanceof Error ? err.message : '服务器内部发生意外错误',
        undefined,
        { requestId }
      ),
      500
    );
  });

  // Helper middleware to assert Admin access
  const requireAdmin = async (c: any, next: any) => {
    const user = c.get('user');
    if (!user) {
      throw new UnauthorizedError('未认证或凭证已失效');
    }
    if (!hasAdminPrivileges(user.role)) {
      throw new ForbiddenError('权限不足，仅管理员可执行该操作');
    }
    await next();
  };

  // Helper middleware for public caching on read endpoints
  const cachePublicFeed = async (c: any, next: any) => {
    await next();
    if (c.req.method === 'GET' && c.res.status === 200) {
      const user = c.get('user');
      if (!hasAdminPrivileges(user?.role)) {
        c.header('Cache-Control', 'public, max-age=60, s-maxage=3600');
      } else {
        c.header('Cache-Control', 'private, no-cache, no-store');
      }
    }
  };

  // --- Health Check ---
  app.get('/api/health', (c) => {
    return c.json(
      successResponse({
        status: 'ok',
        environment: c.env.ENVIRONMENT || 'production',
        timestamp: Date.now(),
      })
    );
  });

  // --- Auth Routes: /api/v1/auth ---
  const authRoutes = new Hono<AppContext>();

  authRoutes.post('/login', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { email, password } = LoginInputSchema.parse(body);
    const services = c.get('services');

    const authUser = await services.auth.validateCredentials(email, password);
    if (!authUser) {
      throw new UnauthorizedError('邮箱或密码不正确');
    }

    const session = await services.auth.createSession(authUser.userId);

    // Set HttpOnly cookie for web client
    c.header(
      'Set-Cookie',
      `auth_token=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );

    return c.json(
      successResponse({
        token: session.token,
        user: session.user,
        expiresAt: session.expiresAt,
      })
    );
  });

  authRoutes.post('/logout', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const services = c.get('services');
      await services.auth.invalidateSession(token);
    }

    c.header(
      'Set-Cookie',
      'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );

    return c.json(successResponse({ message: '登出成功' }));
  });

  authRoutes.get('/me', async (c) => {
    const user = c.get('user');
    if (!user) {
      throw new UnauthorizedError('未登录或会话已过期');
    }
    const services = c.get('services');
    const profile = await services.auth.getUserProfile(user.userId);
    return c.json(successResponse(profile));
  });

  app.route('/api/v1/auth', authRoutes);

  // --- Entries Routes: /api/v1/entries ---
  const entriesRoutes = new Hono<AppContext>();

  entriesRoutes.get('/', cachePublicFeed, async (c) => {
    const query = c.req.query();
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const services = c.get('services');
    const user = c.get('user');

    const result = await services.entry.listTimeline(
      {
        cursor: query.cursor,
        limit,
        type: query.type,
        tag: query.tag,
        search: query.search,
        visibility: query.visibility as any,
        status: query.status as any,
      },
      user
    );

    return c.json(
      successResponse(result.items, {
        pagination: result.pagination,
      })
    );
  });

  entriesRoutes.get('/:id', cachePublicFeed, async (c) => {
    const id = c.req.param('id');
    const services = c.get('services');
    const user = c.get('user');

    const entry = await services.entry.getEntryById(id, user);
    return c.json(successResponse(entry));
  });

  entriesRoutes.post('/', requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const validated = CreateEntryInputSchema.parse(body);
    const services = c.get('services');
    const user = c.get('user')!;

    const entry = await services.entry.createEntry(validated, user);
    return c.json(successResponse(entry), 201);
  });

  entriesRoutes.put('/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const validated = UpdateEntryInputSchema.parse(body);
    const services = c.get('services');
    const user = c.get('user')!;

    const entry = await services.entry.updateEntry(id, validated, user);
    return c.json(successResponse(entry));
  });

  entriesRoutes.delete('/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const services = c.get('services');
    const user = c.get('user')!;

    await services.entry.deleteEntry(id, user, true);
    return c.json(successResponse({ deleted: true, id }));
  });

  app.route('/api/v1/entries', entriesRoutes);

  // --- Media Routes: /api/v1/media ---
  const mediaRoutes = new Hono<AppContext>();

  mediaRoutes.post('/upload-url', requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const validated = RequestUploadTicketSchema.parse(body);
    const services = c.get('services');
    const user = c.get('user')!;

    const ticket = await services.media.requestUploadTicket(validated, user);
    return c.json(successResponse(ticket));
  });

  mediaRoutes.post('/:id/confirm', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const services = c.get('services');
    const user = c.get('user')!;

    const asset = await services.media.confirmUpload(id, body, user);
    return c.json(successResponse(asset));
  });

  mediaRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const services = c.get('services');
    const user = c.get('user');

    const asset = await services.media.getMedia(id, user);
    return c.json(successResponse(asset));
  });

  mediaRoutes.post('/bind', requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const validated = BindMediaSchema.parse(body);
    const services = c.get('services');
    const user = c.get('user')!;

    const binding = await services.media.bindEntryMedia(
      {
        entryId: validated.entryId,
        mediaId: validated.mediaId,
        role: validated.role,
        sortOrder: validated.sortOrder,
        caption: validated.caption ?? undefined,
      },
      user
    );

    return c.json(successResponse(binding), 201);
  });

  app.route('/api/v1/media', mediaRoutes);

  // --- Tags Routes: /api/v1/tags ---
  const tagsRoutes = new Hono<AppContext>();

  tagsRoutes.get('/', cachePublicFeed, async (c) => {
    const services = c.get('services');
    const tags = await services.tag.listTags();
    return c.json(successResponse(tags));
  });

  app.route('/api/v1/tags', tagsRoutes);

  return app;
}

export const app = createApp();
