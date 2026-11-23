import {
  eq,
  ne,
  and,
  or,
  lt,
  gte,
  lte,
  desc,
  isNull,
  inArray,
  like,
  sql,
} from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import {
  type EntryDto,
  type CreateEntryInput,
  type UpdateEntryInput,
  type PaginatedResult,
  type AuthUser,
  type Visibility,
  type EntryStatus,
  NotFoundError,
  canViewEntry,
} from '@archive/contracts';
import {
  generateUuidV7,
  encodeTimelineCursor,
  decodeTimelineCursor,
  getYearRange,
  getYear,
} from '@archive/shared';
import {
  entries,
  tags,
  entryTags,
  entrySearchIndex,
  type EntrySelect,
} from '../infrastructure/schema.js';
import { assertAdmin, hasAdminPrivileges } from '../domain/rbac.js';
import { TagService } from './tag.service.js';

export interface TimelineQuery {
  cursor?: string;
  limit?: number;
  type?: string;
  tag?: string;
  search?: string;
  year?: number;
  visibility?: Visibility;
  status?: EntryStatus;
}

export interface ResolvedMediaUrls {
  originalUrl: string;
  thumbUrl?: string;
}

export type MediaUrlResolver = (
  mediaIds: string[],
  user?: AuthUser | null
) => Promise<Map<string, ResolvedMediaUrls>>;

export class EntryService {
  private readonly db: ArchiveDb;
  private readonly tagService: TagService;
  private readonly mediaResolver?: MediaUrlResolver;

  constructor(
    db: ArchiveDb,
    tagService?: TagService,
    mediaResolver?: MediaUrlResolver
  ) {
    this.db = db;
    this.tagService = tagService ?? new TagService(db);
    this.mediaResolver = mediaResolver;
  }

  /**
   * Create a new Entry. Requires Admin/Owner permissions.
   */
  async createEntry(input: CreateEntryInput, user: AuthUser): Promise<EntryDto> {
    assertAdmin(user);

    const id = input.id ?? generateUuidV7();
    const now = Date.now();
    const visibility = input.visibility ?? 'public';
    const status = input.status ?? 'published';

    await this.db.insert(entries).values({
      id,
      ownerId: user.userId,
      type: input.type,
      slug: input.slug ?? null,
      title: input.title.trim(),
      summary: input.summary?.trim() ?? null,
      coverMediaId: input.coverMediaId ?? null,
      occurredAt: input.occurredAt,
      visibility,
      status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    // Associate tags if provided
    let attachedTags: string[] = [];
    if (input.tags && input.tags.length > 0) {
      const tagRecords = await this.tagService.getOrCreateTags(input.tags, user.userId);
      attachedTags = tagRecords.map((t) => t.name);

      for (const tag of tagRecords) {
        await this.db
          .insert(entryTags)
          .values({
            entryId: id,
            tagId: tag.id,
            createdAt: now,
          })
          .onConflictDoNothing();
      }
    }

    // Insert into denormalized search index
    await this.db
      .insert(entrySearchIndex)
      .values({
        entryId: id,
        type: input.type,
        visibility,
        titleNormalized: input.title.trim().toLowerCase(),
        tagsText: attachedTags.join(' '),
        bodyExcerpt: input.summary?.trim() ?? '',
        updatedAt: now,
      })
      .onConflictDoNothing();

    return {
      id,
      ownerId: user.userId,
      type: input.type,
      slug: input.slug ?? null,
      title: input.title.trim(),
      summary: input.summary?.trim() ?? null,
      coverMediaId: input.coverMediaId ?? null,
      occurredAt: input.occurredAt,
      visibility,
      status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      tags: attachedTags,
    };
  }

  /**
   * Update an existing Entry. Requires Admin/Owner permissions.
   */
  async updateEntry(
    id: string,
    input: UpdateEntryInput,
    user: AuthUser
  ): Promise<EntryDto> {
    assertAdmin(user);

    const existingList = await this.db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
      .limit(1);

    const existing = existingList[0];
    if (!existing) {
      throw new NotFoundError('条目不存在', id);
    }

    const now = Date.now();
    const updateValues: Partial<typeof entries.$inferInsert> = {
      updatedAt: now,
    };

    if (input.type !== undefined) updateValues.type = input.type;
    if (input.slug !== undefined) updateValues.slug = input.slug;
    if (input.title !== undefined) updateValues.title = input.title.trim();
    if (input.summary !== undefined) updateValues.summary = input.summary?.trim() ?? null;
    if (input.coverMediaId !== undefined) updateValues.coverMediaId = input.coverMediaId;
    if (input.occurredAt !== undefined) updateValues.occurredAt = input.occurredAt;
    if (input.visibility !== undefined) updateValues.visibility = input.visibility;
    if (input.status !== undefined) updateValues.status = input.status;

    await this.db.update(entries).set(updateValues).where(eq(entries.id, id));

    let updatedTags: string[] = [];
    if (input.tags !== undefined) {
      // Re-sync tags
      await this.db.delete(entryTags).where(eq(entryTags.entryId, id));
      if (input.tags.length > 0) {
        const tagRecords = await this.tagService.getOrCreateTags(input.tags, user.userId);
        updatedTags = tagRecords.map((t) => t.name);
        for (const tag of tagRecords) {
          await this.db
            .insert(entryTags)
            .values({
              entryId: id,
              tagId: tag.id,
              createdAt: now,
            })
            .onConflictDoNothing();
        }
      }
    } else {
      updatedTags = await this.getTagsForEntry(id);
    }

    // Refresh search index
    const titleNormalized = (input.title ?? existing.title).trim().toLowerCase();
    const bodyExcerpt = (input.summary !== undefined ? input.summary : existing.summary) ?? '';
    await this.db
      .insert(entrySearchIndex)
      .values({
        entryId: id,
        type: input.type ?? existing.type,
        visibility: input.visibility ?? existing.visibility,
        titleNormalized,
        tagsText: updatedTags.join(' '),
        bodyExcerpt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: entrySearchIndex.entryId,
        set: {
          type: input.type ?? existing.type,
          visibility: input.visibility ?? existing.visibility,
          titleNormalized,
          tagsText: updatedTags.join(' '),
          bodyExcerpt,
          updatedAt: now,
        },
      });

    return this.getEntryById(id, user);
  }

  /**
   * Delete an Entry (soft delete by default, or hard delete). Admin only.
   */
  async deleteEntry(id: string, user: AuthUser, soft: boolean = true): Promise<void> {
    assertAdmin(user);

    const existingList = await this.db
      .select()
      .from(entries)
      .where(eq(entries.id, id))
      .limit(1);

    if (!existingList[0]) {
      throw new NotFoundError('条目不存在', id);
    }

    if (soft) {
      await this.db
        .update(entries)
        .set({ deletedAt: Date.now(), updatedAt: Date.now() })
        .where(eq(entries.id, id));
    } else {
      await this.db.delete(entries).where(eq(entries.id, id));
      await this.db.delete(entrySearchIndex).where(eq(entrySearchIndex.entryId, id));
    }
  }

  /**
   * Get an Entry by ID with strict RBAC visibility enforcement.
   */
  async getEntryById(id: string, user?: AuthUser | null): Promise<EntryDto> {
    const result = await this.db
      .select()
      .from(entries)
      .where(eq(entries.id, id))
      .limit(1);

    const entry = result[0];
    if (!entry) {
      throw new NotFoundError('条目不存在', id);
    }

    const isVisible = canViewEntry(
      user?.role,
      entry.visibility as Visibility,
      entry.status as EntryStatus,
      entry.deletedAt
    );

    if (!isVisible) {
      throw new NotFoundError('条目不存在', id);
    }

    return this.hydrateEntry(entry, user);
  }

  /**
   * Pick a random public & published entry, optionally excluding a specific entry ID.
   * Falls back to returning the single available entry if only 1 public published entry exists.
   */
  async getRandomEntry(options?: { excludeId?: string }): Promise<EntryDto> {
    const baseConditions = [
      eq(entries.visibility, 'public'),
      eq(entries.status, 'published'),
      isNull(entries.deletedAt),
    ];

    const excludeId = options?.excludeId?.trim();
    let selected: EntrySelect | undefined;

    if (excludeId) {
      const excludedRows = await this.db
        .select()
        .from(entries)
        .where(and(...baseConditions, ne(entries.id, excludeId)))
        .orderBy(sql`RANDOM()`)
        .limit(1);
      selected = excludedRows[0];
    }

    if (!selected) {
      const fallbackRows = await this.db
        .select()
        .from(entries)
        .where(and(...baseConditions))
        .orderBy(sql`RANDOM()`)
        .limit(1);
      selected = fallbackRows[0];
    }

    if (!selected) {
      throw new NotFoundError('暂无可抽取的公开条目');
    }

    // Pass null user so cover media resolution also strictly adheres to public visibility
    return this.hydrateEntry(selected, null);
  }

  /**
   * Public-only lookup for OG / Twitter Card metadata injection.
   * Strictly restricts to visibility = 'public' AND status = 'published' AND deletedAt IS NULL.
   */
  async getPublicEntryForOg(idOrSlug: string): Promise<{
    id: string;
    title: string;
    summary: string | null;
    coverUrl: string | null;
    coverThumbUrl: string | null;
  } | null> {
    const cleanKey = idOrSlug.trim();
    if (!cleanKey) return null;

    const rows = await this.db
      .select()
      .from(entries)
      .where(
        and(
          or(eq(entries.id, cleanKey), eq(entries.slug, cleanKey)),
          eq(entries.visibility, 'public'),
          eq(entries.status, 'published'),
          isNull(entries.deletedAt)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    let coverUrl: string | null = null;
    let coverThumbUrl: string | null = null;
    if (row.coverMediaId && this.mediaResolver) {
      const resolved = await this.mediaResolver([row.coverMediaId], null);
      const urls = resolved.get(row.coverMediaId);
      if (urls) {
        coverUrl = urls.originalUrl;
        coverThumbUrl = urls.thumbUrl ?? urls.originalUrl;
      }
    }

    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      coverUrl,
      coverThumbUrl,
    };
  }

  private async hydrateEntry(
    entry: EntrySelect,
    user?: AuthUser | null
  ): Promise<EntryDto> {
    const tagsList = await this.getTagsForEntry(entry.id);
    let coverUrl: string | null = null;
    let coverThumbUrl: string | null = null;
    if (entry.coverMediaId && this.mediaResolver) {
      const resolved = await this.mediaResolver([entry.coverMediaId], user);
      const urls = resolved.get(entry.coverMediaId);
      if (urls) {
        coverUrl = urls.originalUrl;
        coverThumbUrl = urls.thumbUrl ?? urls.originalUrl;
      }
    }

    return {
      id: entry.id,
      ownerId: entry.ownerId,
      type: entry.type,
      slug: entry.slug,
      title: entry.title,
      summary: entry.summary,
      coverMediaId: entry.coverMediaId,
      coverUrl,
      coverThumbUrl,
      occurredAt: entry.occurredAt,
      visibility: entry.visibility as Visibility,
      status: entry.status as EntryStatus,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: entry.deletedAt,
      tags: tagsList,
    };
  }

  /**
   * List distinct years present in the timeline, respecting RBAC visibility.
   */
  async getTimelineYears(
    user?: AuthUser | null,
    type?: string
  ): Promise<number[]> {
    const isAdmin = hasAdminPrivileges(user?.role);
    const conditions = [isNull(entries.deletedAt)];

    if (!isAdmin) {
      conditions.push(eq(entries.visibility, 'public'));
      conditions.push(eq(entries.status, 'published'));
    }

    if (type) {
      conditions.push(eq(entries.type, type));
    }

    const rows = await this.db
      .select({ occurredAt: entries.occurredAt })
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.occurredAt));

    const years = new Set<number>();
    for (const row of rows) {
      years.add(getYear(row.occurredAt));
    }
    return Array.from(years).sort((a, b) => b - a);
  }

  /**
   * Cursor-paginated timeline query with strict RBAC guard:
   * - Visitor: strictly visibility = 'public' AND status = 'published' AND deleted_at IS NULL
   * - Admin: full access to public, private, unlisted, draft, published
   */
  async listTimeline(
    query: TimelineQuery,
    user?: AuthUser | null
  ): Promise<PaginatedResult<EntryDto>> {
    const isAdmin = hasAdminPrivileges(user?.role);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const conditions = [];

    if (!isAdmin) {
      // Strictly enforce visitor read permissions
      conditions.push(eq(entries.visibility, 'public'));
      conditions.push(eq(entries.status, 'published'));
      conditions.push(isNull(entries.deletedAt));
    } else {
      // Admin view
      conditions.push(isNull(entries.deletedAt));
      if (query.visibility) {
        conditions.push(eq(entries.visibility, query.visibility));
      }
      if (query.status) {
        conditions.push(eq(entries.status, query.status));
      }
    }

    if (query.type) {
      conditions.push(eq(entries.type, query.type));
    }

    // Filter by tag if requested
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
          pagination: {
            cursor: null,
            hasMore: false,
            limit,
          },
        };
      }
      conditions.push(inArray(entries.id, matchedIds));
    }

    // Filter by year if requested
    if (query.year && Number.isInteger(query.year) && query.year > 1900 && query.year < 3000) {
      const { start, end } = getYearRange(query.year);
      conditions.push(gte(entries.occurredAt, start));
      conditions.push(lte(entries.occurredAt, end));
    }

    // Keyword search in title/summary/tags
    if (query.search && query.search.trim()) {
      const cleanSearch = query.search.trim().toLowerCase();
      const searchPattern = `%${cleanSearch}%`;
      const searchIndexHits = await this.db
        .select({ entryId: entrySearchIndex.entryId })
        .from(entrySearchIndex)
        .where(
          or(
            like(entrySearchIndex.titleNormalized, searchPattern),
            like(sql`lower(${entrySearchIndex.tagsText})`, searchPattern),
            like(sql`lower(${entrySearchIndex.bodyExcerpt})`, searchPattern)
          )
        );
      const indexHitIds = searchIndexHits.map((r) => r.entryId);

      if (indexHitIds.length > 0) {
        conditions.push(
          or(
            like(sql`lower(${entries.title})`, searchPattern),
            like(sql`lower(${entries.summary})`, searchPattern),
            inArray(entries.id, indexHitIds)
          )
        );
      } else {
        conditions.push(
          or(
            like(sql`lower(${entries.title})`, searchPattern),
            like(sql`lower(${entries.summary})`, searchPattern)
          )
        );
      }
    }

    // Decode and apply composite cursor (occurredAt DESC, id DESC)
    if (query.cursor) {
      const cursorObj = decodeTimelineCursor(query.cursor);
      if (cursorObj) {
        conditions.push(
          or(
            lt(entries.occurredAt, cursorObj.occurredAt),
            and(
              eq(entries.occurredAt, cursorObj.occurredAt),
              lt(entries.id, cursorObj.id)
            )
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch limit + 1 items to determine hasMore
    const rows = await this.db
      .select()
      .from(entries)
      .where(whereClause)
      .orderBy(desc(entries.occurredAt), desc(entries.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    // Generate next cursor from the last element
    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      nextCursor = encodeTimelineCursor({
        occurredAt: last.occurredAt,
        id: last.id,
      });
    }

    // Batch load tags & cover URLs for all entries in the page
    const entryIds = pageRows.map((r) => r.id);
    const tagsMap = await this.getTagsMapForEntries(entryIds);

    const coverMediaIds = Array.from(
      new Set(
        pageRows
          .map((r) => r.coverMediaId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const mediaMap =
      coverMediaIds.length > 0 && this.mediaResolver
        ? await this.mediaResolver(coverMediaIds, user)
        : new Map<string, ResolvedMediaUrls>();

    const items: EntryDto[] = pageRows.map((row) => {
      const mediaUrls = row.coverMediaId ? mediaMap.get(row.coverMediaId) : undefined;
      return {
        id: row.id,
        ownerId: row.ownerId,
        type: row.type,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        coverMediaId: row.coverMediaId,
        coverUrl: mediaUrls?.originalUrl ?? null,
        coverThumbUrl: mediaUrls?.thumbUrl ?? mediaUrls?.originalUrl ?? null,
        occurredAt: row.occurredAt,
        visibility: row.visibility as Visibility,
        status: row.status as EntryStatus,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
        tags: tagsMap.get(row.id) ?? [],
      };
    });

    return {
      items,
      pagination: {
        cursor: nextCursor,
        hasMore,
        limit,
      },
    };
  }

  private async getTagsForEntry(entryId: string): Promise<string[]> {
    const result = await this.db
      .select({ name: tags.name })
      .from(entryTags)
      .innerJoin(tags, eq(entryTags.tagId, tags.id))
      .where(eq(entryTags.entryId, entryId));

    return result.map((r) => r.name);
  }

  private async getTagsMapForEntries(entryIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (entryIds.length === 0) return map;

    const result = await this.db
      .select({
        entryId: entryTags.entryId,
        tagName: tags.name,
      })
      .from(entryTags)
      .innerJoin(tags, eq(entryTags.tagId, tags.id))
      .where(inArray(entryTags.entryId, entryIds));

    for (const row of result) {
      const list = map.get(row.entryId) ?? [];
      list.push(row.tagName);
      map.set(row.entryId, list);
    }
    return map;
  }
}
