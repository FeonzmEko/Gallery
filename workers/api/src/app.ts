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
  NotFoundError,
  hasAdminPrivileges,
  CreateEntryInputSchema,
  UpdateEntryInputSchema,
  RequestUploadTicketSchema,
  MediaRoleSchema,
  MediaTypeSchema,
  VisibilitySchema,
  ExifMetadataSchema,
} from '@archive/contracts';
import { generateUlid } from '@archive/shared';
import { mountCommentRoutes } from '@archive/module-comment';
import { mountJournalRoutes } from '@archive/module-journal';
import { mountTravelRoutes } from '@archive/module-travel';
import type { Env } from './env.js';
import {
  bootstrapServices,
  verifyStorageOperation,
  type AppServices,
} from './bootstrap.js';

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

const ConfirmMediaSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
  sha256: z.string().trim().optional(),
  thumbKey: z.string().trim().optional(),
  previewKey: z.string().trim().optional(),
  exif: ExifMetadataSchema,
});

const UpdateMediaSchema = z.object({
  visibility: VisibilitySchema.optional(),
  originalFilename: z.string().trim().max(255).optional().nullable(),
});

const LoginInputSchema = z.object({
  email: z.string().trim().email('请输入合法的邮箱地址'),
  password: z.string().min(1, '密码不能为空'),
});

function extractToken(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const cookieHeader = c.req.header('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

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

    if (!c.get('services')) {
      const services = bootstrapServices(c.env, customStorage);
      c.set('services', services);
    }

    const token = extractToken(c);
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
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
        environment: c.env?.ENVIRONMENT || 'production',
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

    c.header(
      'Set-Cookie',
      `auth_token=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
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
    const token = extractToken(c);
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
    if (!profile) {
      throw new UnauthorizedError('用户档案不存在');
    }
    return c.json(
      successResponse({
        ...profile,
        userId: profile.id,
      })
    );
  });

  app.route('/api/v1/auth', authRoutes);

  // --- Entries Routes: /api/v1/entries ---
  const entriesRoutes = new Hono<AppContext>();

  entriesRoutes.get('/years', cachePublicFeed, async (c) => {
    const query = c.req.query();
    const services = c.get('services');
    const user = c.get('user');
    const years = await services.entry.getTimelineYears(user, query.type);
    return c.json(successResponse(years));
  });

  entriesRoutes.get('/', cachePublicFeed, async (c) => {
    const query = c.req.query();
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const year = query.year ? parseInt(query.year, 10) : undefined;
    const services = c.get('services');
    const user = c.get('user');

    const result = await services.entry.listTimeline(
      {
        cursor: query.cursor,
        limit: Number.isFinite(limit) ? limit : undefined,
        type: query.type,
        tag: query.tag,
        search: query.search,
        year: Number.isFinite(year) ? year : undefined,
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

  entriesRoutes.get('/:id/media', cachePublicFeed, async (c) => {
    const id = c.req.param('id');
    const services = c.get('services');
    const user = c.get('user');
    // Ensure entry itself is accessible before listing bound media
    await services.entry.getEntryById(id, user);
    const items = await services.media.listEntryMedia(id, user);
    return c.json(successResponse(items));
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

  // Native Worker R2 Binding Blob Upload (signed via HMAC or authenticated admin)
  mediaRoutes.put('/blob/*', async (c) => {
    const bucket = c.env?.MEDIA_BUCKET;
    if (!bucket) {
      throw new NotFoundError('本地 R2 存储桶未配置');
    }
    const rawKey = c.req.path.replace(/^\/api\/v1\/media\/blob\//, '');
    const key = decodeURIComponent(rawKey).replace(/^\/+/, '');
    if (!key) {
      throw new NotFoundError('无效的对象存储键');
    }

    const services = c.get('services');
    const user = c.get('user');
    const exp = Number(c.req.query('exp'));
    const sig = c.req.query('sig') || '';
    const hasValidSig = await verifyStorageOperation(
      services.jwtSecret,
      'PUT',
      key,
      exp,
      sig
    );

    if (!hasValidSig && !hasAdminPrivileges(user?.role)) {
      throw new UnauthorizedError('上传签名无效或权限不足');
    }

    const contentType = c.req.header('Content-Type') || 'application/octet-stream';
    const bodyBuffer = await c.req.arrayBuffer();
    await bucket.put(key, bodyBuffer, {
      httpMetadata: {
        contentType,
      },
    });

    return c.json(successResponse({ key, sizeBytes: bodyBuffer.byteLength }));
  });

  // Native Worker R2 Binding Blob Download
  mediaRoutes.get('/blob/*', async (c) => {
    const bucket = c.env?.MEDIA_BUCKET;
    if (!bucket) {
      throw new NotFoundError('本地 R2 存储桶未配置');
    }
    const rawKey = c.req.path.replace(/^\/api\/v1\/media\/blob\//, '');
    const key = decodeURIComponent(rawKey).replace(/^\/+/, '');
    if (!key) {
      throw new NotFoundError('媒体文件不存在');
    }

    const services = c.get('services');
    const user = c.get('user');
    const exp = Number(c.req.query('exp'));
    const sig = c.req.query('sig') || '';
    const hasValidSig = await verifyStorageOperation(
      services.jwtSecret,
      'GET',
      key,
      exp,
      sig
    );

    if (!hasValidSig && !hasAdminPrivileges(user?.role)) {
      throw new UnauthorizedError('媒体访问签名无效或已过期');
    }

    const obj = await bucket.get(key);
    if (!obj) {
      throw new NotFoundError('媒体文件不存在');
    }

    const headers = new Headers();
    if (obj.httpMetadata?.contentType) {
      headers.set('Content-Type', obj.httpMetadata.contentType);
    }
    if (obj.httpEtag) {
      headers.set('etag', obj.httpEtag);
    }
    const isPrivateKey = key.startsWith('private/');
    headers.set(
      'Cache-Control',
      isPrivateKey ? 'private, no-store' : 'public, max-age=31536000, immutable'
    );
    return new Response(obj.body as unknown as BodyInit, { headers });
  });

  mediaRoutes.get('/', cachePublicFeed, async (c) => {
    const query = c.req.query();
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const services = c.get('services');
    const user = c.get('user');

    const parsedMediaType = query.mediaType
      ? MediaTypeSchema.safeParse(query.mediaType)
      : null;
    const parsedVisibility = query.visibility
      ? VisibilitySchema.safeParse(query.visibility)
      : null;

    const result = await services.media.listMedia(
      {
        cursor: query.cursor,
        limit: Number.isFinite(limit) ? limit : undefined,
        mediaType: parsedMediaType?.success ? parsedMediaType.data : undefined,
        visibility: parsedVisibility?.success ? parsedVisibility.data : undefined,
      },
      user
    );

    return c.json(
      successResponse(result.items, {
        pagination: result.pagination,
      })
    );
  });

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
    const validated = ConfirmMediaSchema.parse(body);
    const services = c.get('services');
    const user = c.get('user')!;

    const asset = await services.media.confirmUpload(
      id,
      {
        ...validated,
        exif: validated.exif ?? undefined,
      },
      user
    );
    return c.json(successResponse(asset));
  });

  mediaRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const services = c.get('services');
    const user = c.get('user');

    const asset = await services.media.getMedia(id, user);
    return c.json(successResponse(asset));
  });

  mediaRoutes.put('/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const validated = UpdateMediaSchema.parse(body);
    const services = c.get('services');
    const user = c.get('user')!;

    const updated = await services.media.updateMedia(id, validated, user);
    return c.json(successResponse(updated));
  });

  mediaRoutes.delete('/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const hard = c.req.query('hard') === 'true';
    const services = c.get('services');
    const user = c.get('user')!;

    await services.media.deleteMedia(id, user, !hard);
    return c.json(successResponse({ deleted: true, id }));
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

  // --- Mount Journal, Travel & Comment Module Routes ---
  mountJournalRoutes(app, {
    getJournalService: (c) => (c.get('services') as AppServices).journal,
  });

  mountTravelRoutes(app, {
    getTravelService: (c) => (c.get('services') as AppServices).travel,
  });

  mountCommentRoutes(app, {
    getCommentService: (c) => (c.get('services') as AppServices).comment,
  });

  return app;
}

export const app = createApp();
