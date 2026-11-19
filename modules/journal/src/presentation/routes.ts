import { Hono, type Context } from 'hono';
import {
  type AuthUser,
  successResponse,
  UnauthorizedError,
  ForbiddenError,
  hasAdminPrivileges,
} from '@archive/contracts';
import type { JournalService } from '../application/journal.service.js';
import {
  CreateJournalInputSchema,
  UpdateJournalInputSchema,
} from './schema.js';

export interface JournalVariables {
  user?: AuthUser | null;
  services?: any;
  requestId?: string;
  [key: string]: unknown;
}

export interface JournalEnv {
  Variables: JournalVariables;
}

export interface JournalRouteDependencies {
  journal?: JournalService;
  getJournalService?: (c: Context<JournalEnv>) => JournalService;
}

/**
 * Mounts Journal module REST API routes on Hono router.
 */
export function mountJournalRoutes(
  app: Hono<any>,
  deps: JournalRouteDependencies
): void {
  const router = new Hono<JournalEnv>();

  const resolveService = (c: Context<JournalEnv>): JournalService => {
    if (deps.journal) return deps.journal;
    if (deps.getJournalService) return deps.getJournalService(c);
    const services = c.get('services') as Record<string, any> | undefined;
    if (services?.journal) return services.journal as JournalService;
    throw new Error('JournalService not configured in AppServices');
  };

  const requireAdmin = async (c: Context<JournalEnv>, next: () => Promise<void>) => {
    const user = c.get('user');
    if (!user) {
      throw new UnauthorizedError('未认证或凭证已失效');
    }
    if (!hasAdminPrivileges(user.role)) {
      throw new ForbiddenError('权限不足，仅管理员可执行该操作');
    }
    await next();
  };

  // 1. List Journals
  router.get('/', async (c) => {
    const service = resolveService(c);
    const user = c.get('user');
    const { cursor, limit, mood, weather, tag } = c.req.query();

    const result = await service.listJournals(
      {
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
        mood,
        weather,
        tag,
      },
      user
    );

    return c.json(
      successResponse(result.items, {
        pagination: result.pagination,
      })
    );
  });

  // 2. Get Journal Detail
  router.get('/:idOrSlug', async (c) => {
    const service = resolveService(c);
    const idOrSlug = c.req.param('idOrSlug')!;
    const user = c.get('user');

    const journal = await service.getJournal(idOrSlug, user);
    return c.json(successResponse(journal));
  });

  // 3. Create Journal
  router.post('/', requireAdmin, async (c) => {
    const service = resolveService(c);
    const user = c.get('user') as AuthUser;
    const body = await c.req.json().catch(() => ({}));
    const validated = CreateJournalInputSchema.parse(body);

    const created = await service.createJournal(validated, user);
    return c.json(successResponse(created), 201);
  });

  // 4. Update Journal
  router.put('/:id', requireAdmin, async (c) => {
    const service = resolveService(c);
    const user = c.get('user') as AuthUser;
    const id = c.req.param('id')!;
    const body = await c.req.json().catch(() => ({}));
    const validated = UpdateJournalInputSchema.parse(body);

    const updated = await service.updateJournal(id, validated, user);
    return c.json(successResponse(updated));
  });

  // 5. Delete Journal
  router.delete('/:id', requireAdmin, async (c) => {
    const service = resolveService(c);
    const user = c.get('user') as AuthUser;
    const id = c.req.param('id')!;
    const soft = c.req.query('hard') !== 'true';

    await service.deleteJournal(id, user, soft);
    return c.json(successResponse({ success: true, deletedId: id }));
  });

  app.route('/api/v1/journals', router);
}
