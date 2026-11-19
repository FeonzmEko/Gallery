import { eq, and, or, lt, desc, asc, isNull, inArray, like, sql } from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import {
  entries,
  tags,
  entryTags,
  entrySearchIndex,
  type EntrySelect,
} from '@archive/database';
import {
  type AuthUser,
  type PaginatedResult,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  hasAdminPrivileges,
  canViewEntry,
} from '@archive/contracts';
import {
  generateUuidV7,
  encodeTimelineCursor,
  decodeTimelineCursor,
  slugify,
} from '@archive/shared';
import { trips, tripLocations, type TripSelect } from '../infrastructure/schema.js';
import { isValidCoordinates } from '../domain/coordinates.js';
import { calculateTotalRouteDistance } from '../domain/haversine.js';
import { buildTripGeoData } from '../domain/geojson.js';
import type {
  TripDetailDto,
  TripRouteDto,
  TripLocationDto,
  CreateTripInput,
  UpdateTripInput,
  CreateLocationInput,
} from '../domain/types.js';

export interface ListTripsQuery {
  cursor?: string;
  limit?: number;
  countryCode?: string;
  tag?: string;
  search?: string;
}

export class TravelService {
  constructor(private readonly db: ArchiveDb) {}

  /**
   * Asserts admin / owner privileges
   */
  private assertAdmin(user?: AuthUser | null): asserts user is AuthUser {
    if (!user) {
      throw new UnauthorizedError('需要管理员身份登录');
    }
    if (!hasAdminPrivileges(user.role)) {
      throw new ForbiddenError('权限不足，仅管理员可执行该操作');
    }
  }

  /**
   * Synchronize tags for an entry
   */
  private async syncTags(
    entryId: string,
    tagNames: string[],
    ownerId: string,
    now: number
  ): Promise<string[]> {
    if (!tagNames || tagNames.length === 0) return [];

    const uniqueNames = Array.from(new Set(tagNames.map((t) => t.trim()).filter(Boolean)));
    if (uniqueNames.length === 0) return [];

    const resolvedTags: { id: string; name: string }[] = [];

    for (const name of uniqueNames) {
      const slug = slugify(name);
      const existing = await this.db
        .select()
        .from(tags)
        .where(and(eq(tags.ownerId, ownerId), eq(tags.slug, slug)))
        .get();

      if (existing) {
        resolvedTags.push({ id: existing.id, name: existing.name });
      } else {
        const newTagId = generateUuidV7();
        await this.db
          .insert(tags)
          .values({
            id: newTagId,
            ownerId,
            name,
            slug,
            createdAt: now,
          })
          .onConflictDoNothing();

        resolvedTags.push({ id: newTagId, name });
      }
    }

    // Insert entry_tags relations
    for (const tag of resolvedTags) {
      await this.db
        .insert(entryTags)
        .values({
          entryId,
          tagId: tag.id,
          createdAt: now,
        })
        .onConflictDoNothing();
    }

    return resolvedTags.map((t) => t.name);
  }

  /**
   * Fetch tags associated with an entry
   */
  private async getEntryTags(entryId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: tags.name })
      .from(entryTags)
      .innerJoin(tags, eq(entryTags.tagId, tags.id))
      .where(eq(entryTags.entryId, entryId));

    return rows.map((r) => r.name);
  }

  /**
   * Fetch ordered locations for a trip
   */
  private async fetchTripLocations(tripEntryId: string): Promise<TripLocationDto[]> {
    const rows = await this.db
      .select()
      .from(tripLocations)
      .where(eq(tripLocations.tripEntryId, tripEntryId))
      .orderBy(asc(tripLocations.sortOrder), asc(tripLocations.visitedAt), asc(tripLocations.id));

    return rows.map((r) => ({
      id: r.id,
      tripEntryId: r.tripEntryId,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      visitedAt: r.visitedAt,
      sortOrder: r.sortOrder,
      notes: r.notes,
    }));
  }

  /**
   * Create a new Trip entry
   */
  async createTrip(input: CreateTripInput, user: AuthUser): Promise<TripDetailDto> {
    this.assertAdmin(user);

    if (input.endDate < input.startDate) {
      throw new ValidationError('旅行结束日期不能早于开始日期');
    }

    const now = Date.now();
    const entryId = input.id ?? generateUuidV7();
    const visibility = input.visibility ?? 'public';
    const status = input.status ?? 'published';

    // Validate slug uniqueness if provided
    if (input.slug) {
      const existingSlug = await this.db
        .select({ id: entries.id })
        .from(entries)
        .where(eq(entries.slug, input.slug))
        .get();

      if (existingSlug) {
        throw new ConflictError(`Slug '${input.slug}' 已被占用`);
      }
    }

    // 1. Process locations and calculate total distance
    let initialLocations: TripLocationDto[] = [];
    let calculatedDistance = 0;

    if (input.locations && input.locations.length > 0) {
      for (const loc of input.locations) {
        if (!isValidCoordinates(loc.latitude, loc.longitude)) {
          throw new ValidationError(
            `地点 '${loc.name}' 经纬度不合法: lat=${loc.latitude}, lon=${loc.longitude}`
          );
        }
      }

      // Sort locations
      const sorted = [...input.locations].sort((a, b) => {
        const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return (a.visitedAt ?? 0) - (b.visitedAt ?? 0);
      });

      calculatedDistance = calculateTotalRouteDistance(sorted);

      initialLocations = sorted.map((loc, idx) => ({
        id: loc.id ?? generateUuidV7(),
        tripEntryId: entryId,
        name: loc.name.trim(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        visitedAt: loc.visitedAt ?? null,
        sortOrder: loc.sortOrder ?? idx,
        notes: loc.notes?.trim() ?? null,
      }));
    }

    // 2. Insert unified entry
    await this.db.insert(entries).values({
      id: entryId,
      ownerId: user.userId,
      type: 'trip',
      slug: input.slug?.trim() || null,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      coverMediaId: input.coverMediaId ?? null,
      occurredAt: input.startDate, // Trip occurredAt defaults to startDate
      visibility,
      status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    // 3. Insert trip details
    await this.db.insert(trips).values({
      entryId,
      startDate: input.startDate,
      endDate: input.endDate,
      countryCode: input.countryCode?.trim() || null,
      citySummary: input.citySummary?.trim() || null,
      distanceKm: calculatedDistance,
    });

    // 4. Batch insert locations
    for (const loc of initialLocations) {
      await this.db.insert(tripLocations).values({
        id: loc.id,
        tripEntryId: loc.tripEntryId,
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        visitedAt: loc.visitedAt,
        sortOrder: loc.sortOrder,
        notes: loc.notes,
      });
    }

    // 5. Sync tags
    let attachedTags: string[] = [];
    if (input.tags && input.tags.length > 0) {
      attachedTags = await this.syncTags(entryId, input.tags, user.userId, now);
    }

    // 6. Update search index
    await this.db
      .insert(entrySearchIndex)
      .values({
        entryId,
        type: 'trip',
        visibility,
        titleNormalized: input.title.trim().toLowerCase(),
        tagsText: attachedTags.join(' '),
        bodyExcerpt: input.summary?.trim() || input.citySummary?.trim() || null,
        updatedAt: now,
      })
      .onConflictDoNothing();

    const geoData = buildTripGeoData(initialLocations, calculatedDistance);

    return {
      id: entryId,
      ownerId: user.userId,
      type: 'trip',
      slug: input.slug?.trim() || null,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      coverMediaId: input.coverMediaId ?? null,
      occurredAt: input.startDate,
      visibility,
      status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      tags: attachedTags,
      startDate: input.startDate,
      endDate: input.endDate,
      countryCode: input.countryCode?.trim() || null,
      citySummary: input.citySummary?.trim() || null,
      distanceKm: calculatedDistance,
      locations: initialLocations,
      geoJson: geoData.geoJson,
      leafletPolyline: geoData.leafletPolyline,
      bounds: geoData.bounds,
    };
  }

  /**
   * Get Trip by ID or slug
   */
  async getTrip(idOrSlug: string, user?: AuthUser | null): Promise<TripDetailDto> {
    const row = await this.db
      .select({
        entry: entries,
        trip: trips,
      })
      .from(entries)
      .innerJoin(trips, eq(entries.id, trips.entryId))
      .where(
        and(
          eq(entries.type, 'trip'),
          or(eq(entries.id, idOrSlug), eq(entries.slug, idOrSlug))
        )
      )
      .get();

    if (!row) {
      throw new NotFoundError('旅行记录不存在');
    }

    const { entry, trip } = row;

    const accessible = canViewEntry(
      user?.role,
      entry.visibility as any,
      entry.status as any,
      entry.deletedAt
    );

    if (!accessible) {
      if (!user) {
        throw new UnauthorizedError('请登录后访问该旅行记录');
      }
      throw new ForbiddenError('无权访问该旅行记录');
    }

    const locations = await this.fetchTripLocations(entry.id);
    const attachedTags = await this.getEntryTags(entry.id);
    const geoData = buildTripGeoData(locations, trip.distanceKm ?? 0);

    return {
      id: entry.id,
      ownerId: entry.ownerId,
      type: 'trip',
      slug: entry.slug,
      title: entry.title,
      summary: entry.summary,
      coverMediaId: entry.coverMediaId,
      occurredAt: entry.occurredAt,
      visibility: entry.visibility as any,
      status: entry.status as any,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: entry.deletedAt,
      tags: attachedTags,
      startDate: trip.startDate,
      endDate: trip.endDate,
      countryCode: trip.countryCode,
      citySummary: trip.citySummary,
      distanceKm: trip.distanceKm ?? 0,
      locations,
      geoJson: geoData.geoJson,
      leafletPolyline: geoData.leafletPolyline,
      bounds: geoData.bounds,
    };
  }

  /**
   * Get lightweight Leaflet GeoJSON and polyline route for map rendering
   */
  async getTripRoute(idOrSlug: string, user?: AuthUser | null): Promise<TripRouteDto> {
    const trip = await this.getTrip(idOrSlug, user);
    return {
      tripEntryId: trip.id,
      totalDistanceKm: trip.distanceKm,
      locations: trip.locations,
      geoJson: trip.geoJson,
      leafletPolyline: trip.leafletPolyline,
      bounds: trip.bounds,
    };
  }

  /**
   * Update Trip metadata
   */
  async updateTrip(
    entryId: string,
    input: UpdateTripInput,
    user: AuthUser
  ): Promise<TripDetailDto> {
    this.assertAdmin(user);

    const existing = await this.db
      .select({
        entry: entries,
        trip: trips,
      })
      .from(entries)
      .innerJoin(trips, eq(entries.id, trips.entryId))
      .where(and(eq(entries.id, entryId), eq(entries.type, 'trip'), isNull(entries.deletedAt)))
      .get();

    if (!existing) {
      throw new NotFoundError('旅行记录不存在');
    }

    const startDate = input.startDate ?? existing.trip.startDate;
    const endDate = input.endDate ?? existing.trip.endDate;
    if (endDate < startDate) {
      throw new ValidationError('旅行结束日期不能早于开始日期');
    }

    const now = Date.now();

    // Check slug collision
    if (input.slug !== undefined && input.slug !== existing.entry.slug && input.slug !== null) {
      const slugOwner = await this.db
        .select({ id: entries.id })
        .from(entries)
        .where(eq(entries.slug, input.slug))
        .get();

      if (slugOwner && slugOwner.id !== entryId) {
        throw new ConflictError(`Slug '${input.slug}' 已被占用`);
      }
    }

    const entryUpdates: Partial<EntrySelect> = {
      updatedAt: now,
    };

    if (input.title !== undefined) entryUpdates.title = input.title.trim();
    if (input.slug !== undefined) entryUpdates.slug = input.slug?.trim() || null;
    if (input.summary !== undefined) entryUpdates.summary = input.summary?.trim() || null;
    if (input.startDate !== undefined) entryUpdates.occurredAt = input.startDate;
    if (input.visibility !== undefined) entryUpdates.visibility = input.visibility;
    if (input.status !== undefined) entryUpdates.status = input.status;
    if (input.coverMediaId !== undefined) entryUpdates.coverMediaId = input.coverMediaId;

    const tripUpdates: Partial<TripSelect> = {};
    if (input.startDate !== undefined) tripUpdates.startDate = input.startDate;
    if (input.endDate !== undefined) tripUpdates.endDate = input.endDate;
    if (input.countryCode !== undefined) tripUpdates.countryCode = input.countryCode?.trim() || null;
    if (input.citySummary !== undefined) tripUpdates.citySummary = input.citySummary?.trim() || null;

    await this.db.update(entries).set(entryUpdates).where(eq(entries.id, entryId));

    if (Object.keys(tripUpdates).length > 0) {
      await this.db.update(trips).set(tripUpdates).where(eq(trips.entryId, entryId));
    }

    // Handle tag synchronization if tags provided
    let attachedTags: string[];
    if (input.tags !== undefined) {
      await this.db.delete(entryTags).where(eq(entryTags.entryId, entryId));
      attachedTags = await this.syncTags(entryId, input.tags, user.userId, now);
    } else {
      attachedTags = await this.getEntryTags(entryId);
    }

    // Update search index
    await this.db
      .insert(entrySearchIndex)
      .values({
        entryId,
        type: 'trip',
        visibility: entryUpdates.visibility ?? existing.entry.visibility,
        titleNormalized: (entryUpdates.title ?? existing.entry.title).toLowerCase(),
        tagsText: attachedTags.join(' '),
        bodyExcerpt: entryUpdates.summary ?? existing.entry.summary,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: entrySearchIndex.entryId,
        set: {
          visibility: entryUpdates.visibility ?? existing.entry.visibility,
          titleNormalized: (entryUpdates.title ?? existing.entry.title).toLowerCase(),
          tagsText: attachedTags.join(' '),
          bodyExcerpt: entryUpdates.summary ?? existing.entry.summary,
          updatedAt: now,
        },
      });

    // Replace locations if provided
    if (input.locations !== undefined) {
      await this.setTripLocations(entryId, input.locations, user);
    }

    return this.getTrip(entryId, user);
  }

  /**
   * Replace all locations/footprints for a trip and recalculate route distance
   */
  async setTripLocations(
    tripEntryId: string,
    locationsInput: CreateLocationInput[],
    user: AuthUser
  ): Promise<TripLocationDto[]> {
    this.assertAdmin(user);

    const existingTrip = await this.db
      .select({ entryId: trips.entryId })
      .from(trips)
      .where(eq(trips.entryId, tripEntryId))
      .get();

    if (!existingTrip) {
      throw new NotFoundError('旅行记录不存在');
    }

    for (const loc of locationsInput) {
      if (!isValidCoordinates(loc.latitude, loc.longitude)) {
        throw new ValidationError(
          `地点 '${loc.name}' 经纬度不合法: lat=${loc.latitude}, lon=${loc.longitude}`
        );
      }
    }

    // Sort locations
    const sorted = [...locationsInput].sort((a, b) => {
      const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.visitedAt ?? 0) - (b.visitedAt ?? 0);
    });

    const newDistance = calculateTotalRouteDistance(sorted);

    // Delete old locations
    await this.db.delete(tripLocations).where(eq(tripLocations.tripEntryId, tripEntryId));

    const insertedLocations: TripLocationDto[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const locId = item.id ?? generateUuidV7();
      const sortOrder = item.sortOrder ?? i;

      await this.db.insert(tripLocations).values({
        id: locId,
        tripEntryId,
        name: item.name.trim(),
        latitude: item.latitude,
        longitude: item.longitude,
        visitedAt: item.visitedAt ?? null,
        sortOrder,
        notes: item.notes?.trim() ?? null,
      });

      insertedLocations.push({
        id: locId,
        tripEntryId,
        name: item.name.trim(),
        latitude: item.latitude,
        longitude: item.longitude,
        visitedAt: item.visitedAt ?? null,
        sortOrder,
        notes: item.notes?.trim() ?? null,
      });
    }

    // Update trip total distance
    await this.db
      .update(trips)
      .set({ distanceKm: newDistance })
      .where(eq(trips.entryId, tripEntryId));

    return insertedLocations;
  }

  /**
   * Add a single location stop to a trip and update route distance
   */
  async addTripLocation(
    tripEntryId: string,
    locationInput: CreateLocationInput,
    user: AuthUser
  ): Promise<TripLocationDto> {
    this.assertAdmin(user);

    const existingTrip = await this.db
      .select({ entryId: trips.entryId })
      .from(trips)
      .where(eq(trips.entryId, tripEntryId))
      .get();

    if (!existingTrip) {
      throw new NotFoundError('旅行记录不存在');
    }

    if (!isValidCoordinates(locationInput.latitude, locationInput.longitude)) {
      throw new ValidationError(
        `地点 '${locationInput.name}' 经纬度不合法: lat=${locationInput.latitude}, lon=${locationInput.longitude}`
      );
    }

    const locId = locationInput.id ?? generateUuidV7();
    const locDto: TripLocationDto = {
      id: locId,
      tripEntryId,
      name: locationInput.name.trim(),
      latitude: locationInput.latitude,
      longitude: locationInput.longitude,
      visitedAt: locationInput.visitedAt ?? null,
      sortOrder: locationInput.sortOrder ?? 0,
      notes: locationInput.notes?.trim() ?? null,
    };

    await this.db.insert(tripLocations).values(locDto);

    // Fetch all locations to recalculate cumulative distance
    const allLocations = await this.fetchTripLocations(tripEntryId);
    const newDistance = calculateTotalRouteDistance(allLocations);

    await this.db
      .update(trips)
      .set({ distanceKm: newDistance })
      .where(eq(trips.entryId, tripEntryId));

    return locDto;
  }

  /**
   * Delete a Trip entry (soft delete by default)
   */
  async deleteTrip(entryId: string, user: AuthUser, soft: boolean = true): Promise<void> {
    this.assertAdmin(user);

    const existing = await this.db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.id, entryId), eq(entries.type, 'trip'), isNull(entries.deletedAt)))
      .get();

    if (!existing) {
      throw new NotFoundError('旅行记录不存在');
    }

    if (soft) {
      await this.db
        .update(entries)
        .set({ deletedAt: Date.now(), updatedAt: Date.now() })
        .where(eq(entries.id, entryId));
    } else {
      await this.db.delete(entries).where(eq(entries.id, entryId));
    }
  }

  /**
   * List trips with pagination
   */
  async listTrips(
    query: ListTripsQuery = {},
    user?: AuthUser | null
  ): Promise<PaginatedResult<TripDetailDto>> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const conditions = [eq(entries.type, 'trip'), isNull(entries.deletedAt)];

    if (!hasAdminPrivileges(user?.role)) {
      conditions.push(eq(entries.status, 'published'));
      conditions.push(eq(entries.visibility, 'public'));
    }

    if (query.countryCode) {
      conditions.push(eq(trips.countryCode, query.countryCode));
    }

    if (query.tag) {
      const targetTag = query.tag.trim();
      const taggedEntries = await this.db
        .select({ entryId: entryTags.entryId })
        .from(entryTags)
        .innerJoin(tags, eq(entryTags.tagId, tags.id))
        .where(or(eq(tags.slug, targetTag), eq(tags.name, targetTag)));
      const matchedIds = taggedEntries.map((r) => r.entryId);
      if (matchedIds.length === 0) {
        return {
          items: [],
          pagination: { cursor: null, hasMore: false, limit },
        };
      }
      conditions.push(inArray(entries.id, matchedIds));
    }

    if (query.search && query.search.trim()) {
      const pattern = `%${query.search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`lower(${entries.title})`, pattern),
          like(sql`lower(${entries.summary})`, pattern),
          like(sql`lower(${trips.citySummary})`, pattern),
          like(sql`lower(${trips.countryCode})`, pattern)
        )!
      );
    }

    if (query.cursor) {
      const decoded = decodeTimelineCursor(query.cursor);
      if (decoded) {
        conditions.push(
          or(
            lt(entries.occurredAt, decoded.occurredAt),
            and(eq(entries.occurredAt, decoded.occurredAt), lt(entries.id, decoded.id))
          )!
        );
      }
    }

    const rows = await this.db
      .select({
        entry: entries,
        trip: trips,
      })
      .from(entries)
      .innerJoin(trips, eq(entries.id, trips.entryId))
      .where(and(...conditions))
      .orderBy(desc(entries.occurredAt), desc(entries.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const itemsToReturn = hasMore ? rows.slice(0, limit) : rows;

    const dtos: TripDetailDto[] = await Promise.all(
      itemsToReturn.map(async ({ entry, trip }) => {
        const locations = await this.fetchTripLocations(entry.id);
        const attachedTags = await this.getEntryTags(entry.id);
        const geoData = buildTripGeoData(locations, trip.distanceKm ?? 0);

        return {
          id: entry.id,
          ownerId: entry.ownerId,
          type: 'trip',
          slug: entry.slug,
          title: entry.title,
          summary: entry.summary,
          coverMediaId: entry.coverMediaId,
          occurredAt: entry.occurredAt,
          visibility: entry.visibility as any,
          status: entry.status as any,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          deletedAt: entry.deletedAt,
          tags: attachedTags,
          startDate: trip.startDate,
          endDate: trip.endDate,
          countryCode: trip.countryCode,
          citySummary: trip.citySummary,
          distanceKm: trip.distanceKm ?? 0,
          locations,
          geoJson: geoData.geoJson,
          leafletPolyline: geoData.leafletPolyline,
          bounds: geoData.bounds,
        };
      })
    );

    let nextCursor: string | null = null;
    if (hasMore && itemsToReturn.length > 0) {
      const last = itemsToReturn[itemsToReturn.length - 1].entry;
      nextCursor = encodeTimelineCursor({ occurredAt: last.occurredAt, id: last.id });
    }

    return {
      items: dtos,
      pagination: {
        cursor: nextCursor,
        hasMore,
        limit,
      },
    };
  }
}
