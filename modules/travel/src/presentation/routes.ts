import { Hono, type Context } from 'hono';
import {
  type AuthUser,
  successResponse,
  UnauthorizedError,
  ForbiddenError,
  hasAdminPrivileges,
} from '@archive/contracts';
import type { TravelService } from '../application/travel.service.js';
import {
  CreateTripInputSchema,
  UpdateTripInputSchema,
  TripLocationInputSchema,
  BatchTripLocationsInputSchema,
} from './schema.js';

export interface TravelVariables {
  user?: AuthUser | null;
  services?: any;
  requestId?: string;
  [key: string]: unknown;
}

export interface TravelEnv {
  Variables: TravelVariables;
}

export interface TravelRouteDependencies {
  travel?: TravelService;
  getTravelService?: (c: Context<TravelEnv>) => TravelService;
}

/**
 * Mounts Travel and Leaflet Map module REST API routes on Hono router.
 */
export function mountTravelRoutes(
  app: Hono<any>,
  deps: TravelRouteDependencies
): void {
  const router = new Hono<TravelEnv>();

  const resolveService = (c: Context<TravelEnv>): TravelService => {
    if (deps.travel) return deps.travel;
    if (deps.getTravelService) return deps.getTravelService(c);
    const services = c.get('services') as Record<string, any> | undefined;
    if (services?.travel) return services.travel as TravelService;
    throw new Error('TravelService not configured in AppServices');
  };

  const requireAdmin = async (c: Context<TravelEnv>, next: () => Promise<void>) => {
    const user = c.get('user');
    if (!user) {
      throw new UnauthorizedError('未认证或凭证已失效');
    }
    if (!hasAdminPrivileges(user.role)) {
      throw new ForbiddenError('权限不足，仅管理员可执行该操作');
    }
    await next();
  };

  // 1. List Trips
  router.get('/', async (c) => {
    const service = resolveService(c);
    const user = c.get('user');
    const { cursor, limit, countryCode, tag } = c.req.query();

    const result = await service.listTrips(
      {
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
        countryCode,
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

  // 2. Get Trip Detail
  router.get('/:idOrSlug', async (c) => {
    const service = resolveService(c);
    const idOrSlug = c.req.param('idOrSlug')!;
    const user = c.get('user');

    const trip = await service.getTrip(idOrSlug, user);
    return c.json(successResponse(trip));
  });

  // 3. Get Trip Leaflet GeoJSON Route
  router.get('/:idOrSlug/route', async (c) => {
    const service = resolveService(c);
    const idOrSlug = c.req.param('idOrSlug')!;
    const user = c.get('user');

    const route = await service.getTripRoute(idOrSlug, user);
    return c.json(successResponse(route));
  });

  // 4. Create Trip
  router.post('/', requireAdmin, async (c) => {
    const service = resolveService(c);
    const user = c.get('user') as AuthUser;
    const body = await c.req.json().catch(() => ({}));
    const validated = CreateTripInputSchema.parse(body);

    const created = await service.createTrip(validated, user);
    return c.json(successResponse(created), 201);
  });

  // 5. Update Trip
  router.put('/:id', requireAdmin, async (c) => {
    const service = resolveService(c);
    const user = c.get('user') as AuthUser;
    const id = c.req.param('id')!;
    const body = await c.req.json().catch(() => ({}));
    const validated = UpdateTripInputSchema.parse(body);

    const updated = await service.updateTrip(id, validated, user);
    return c.json(successResponse(updated));
  });

  // 6. Replace All Trip Locations / Footprints
  router.put('/:id/locations', requireAdmin, async (c) => {
    const service = resolveService(c);
    const user = c.get('user') as AuthUser;
    const id = c.req.param('id')!;
    const body = await c.req.json().catch(() => ({}));
    const validated = BatchTripLocationsInputSchema.parse(body);

    const locations = await service.setTripLocations(id, validated.locations, user);
    return c.json(successResponse(locations));
  });

  // 7. Add Single Trip Location / Footprint
  router.post('/:id/locations', requireAdmin, async (c) => {
    const service = resolveService(c);
    const user = c.get('user') as AuthUser;
    const id = c.req.param('id')!;
    const body = await c.req.json().catch(() => ({}));
    const validated = TripLocationInputSchema.parse(body);

    const location = await service.addTripLocation(id, validated, user);
    return c.json(successResponse(location), 201);
  });

  // 8. Delete Trip
  router.delete('/:id', requireAdmin, async (c) => {
    const service = resolveService(c);
    const user = c.get('user') as AuthUser;
    const id = c.req.param('id')!;
    const soft = c.req.query('hard') !== 'true';

    await service.deleteTrip(id, user, soft);
    return c.json(successResponse({ success: true, deletedId: id }));
  });

  app.route('/api/v1/trips', router);
}
