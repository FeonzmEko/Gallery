import { eq, and, or, lt, desc, isNull, inArray } from 'drizzle-orm';
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
  hasAdminPrivileges,
  canViewEntry,
} from '@archive/contracts';
import {
  generateUuidV7,
  encodeTimelineCursor,
  decodeTimelineCursor,
} from '@archive/shared';
import { journalEntries, type JournalEntrySelect } from '../infrastructure/schema.js';
import { calculateWordCount } from '../domain/word-count.js';
import type {
  JournalDetailDto,
  CreateJournalInput,
  UpdateJournalInput,
} from '../domain/types.js';

function slugify(str: string): string {
  const normalized = str
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\-_]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || encodeURIComponent(str.trim().toLowerCase());
}

function extractSummary(markdown: string, maxLength: number = 200): string {
  // Strip code blocks and markdown markers for a clean plain-text summary
  const clean = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_~>+\-|=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength) + '...';
}

export interface ListJournalsQuery {
  cursor?: string;
  limit?: number;
  tag?: string;
  mood?: string;
  weather?: string;
}

export class JournalService {
  constructor(private readonly db: ArchiveDb) {}

  /**
   * Asserts user has admin / owner privileges
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
   * Create a new Journal entry
   */
  async createJournal(input: CreateJournalInput, user: AuthUser): Promise<JournalDetailDto> {
    this.assertAdmin(user);

    const now = Date.now();
    const entryId = input.id ?? generateUuidV7();
    const visibility = input.visibility ?? 'public';
    const status = input.status ?? 'published';
    const wordCount = calculateWordCount(input.contentMarkdown);
    const summary = input.summary?.trim() || extractSummary(input.contentMarkdown);

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

    // 1. Insert into unified entries index table
    await this.db.insert(entries).values({
      id: entryId,
      ownerId: user.userId,
      type: 'journal',
      slug: input.slug?.trim() || null,
      title: input.title.trim(),
      summary,
      coverMediaId: input.coverMediaId ?? null,
      occurredAt: input.occurredAt,
      visibility,
      status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    // 2. Insert into journal_entries table
    await this.db.insert(journalEntries).values({
      entryId,
      contentMarkdown: input.contentMarkdown,
      wordCount,
      mood: input.mood?.trim() || null,
      weather: input.weather?.trim() || null,
    });

    // 3. Sync tags
    let attachedTags: string[] = [];
    if (input.tags && input.tags.length > 0) {
      attachedTags = await this.syncTags(entryId, input.tags, user.userId, now);
    }

    // 4. Update denormalized search index
    await this.db
      .insert(entrySearchIndex)
      .values({
        entryId,
        type: 'journal',
        visibility,
        titleNormalized: input.title.trim().toLowerCase(),
        tagsText: attachedTags.join(' '),
        bodyExcerpt: summary,
        updatedAt: now,
      })
      .onConflictDoNothing();

    return {
      id: entryId,
      ownerId: user.userId,
      type: 'journal',
      slug: input.slug?.trim() || null,
      title: input.title.trim(),
      summary,
      coverMediaId: input.coverMediaId ?? null,
      occurredAt: input.occurredAt,
      visibility,
      status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      tags: attachedTags,
      contentMarkdown: input.contentMarkdown,
      wordCount,
      mood: input.mood?.trim() || null,
      weather: input.weather?.trim() || null,
    };
  }

  /**
   * Get a Journal entry by ID or slug
   */
  async getJournal(idOrSlug: string, user?: AuthUser | null): Promise<JournalDetailDto> {
    const isOwner = hasAdminPrivileges(user?.role);

    const row = await this.db
      .select({
        entry: entries,
        journal: journalEntries,
      })
      .from(entries)
      .innerJoin(journalEntries, eq(entries.id, journalEntries.entryId))
      .where(
        and(
          eq(entries.type, 'journal'),
          or(eq(entries.id, idOrSlug), eq(entries.slug, idOrSlug))
        )
      )
      .get();

    if (!row) {
      throw new NotFoundError('随想日记不存在');
    }

    const { entry, journal } = row;

    // Check visibility permissions
    const accessible = canViewEntry(
      user?.role,
      entry.visibility as any,
      entry.status as any,
      entry.deletedAt
    );

    if (!accessible) {
      if (!user) {
        throw new UnauthorizedError('请登录后访问私密日记');
      }
      throw new ForbiddenError('无权访问该日记');
    }

    const attachedTags = await this.getEntryTags(entry.id);

    return {
      id: entry.id,
      ownerId: entry.ownerId,
      type: 'journal',
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
      contentMarkdown: journal.contentMarkdown,
      wordCount: journal.wordCount,
      mood: journal.mood,
      weather: journal.weather,
    };
  }

  /**
   * Update an existing Journal entry
   */
  async updateJournal(
    entryId: string,
    input: UpdateJournalInput,
    user: AuthUser
  ): Promise<JournalDetailDto> {
    this.assertAdmin(user);

    const existing = await this.db
      .select({
        entry: entries,
        journal: journalEntries,
      })
      .from(entries)
      .innerJoin(journalEntries, eq(entries.id, journalEntries.entryId))
      .where(and(eq(entries.id, entryId), eq(entries.type, 'journal')))
      .get();

    if (!existing) {
      throw new NotFoundError('随想日记不存在');
    }

    const now = Date.now();

    // Check slug collision if slug is being updated
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
    if (input.occurredAt !== undefined) entryUpdates.occurredAt = input.occurredAt;
    if (input.visibility !== undefined) entryUpdates.visibility = input.visibility;
    if (input.status !== undefined) entryUpdates.status = input.status;
    if (input.coverMediaId !== undefined) entryUpdates.coverMediaId = input.coverMediaId;

    const journalUpdates: Partial<JournalEntrySelect> = {};

    if (input.contentMarkdown !== undefined) {
      journalUpdates.contentMarkdown = input.contentMarkdown;
      journalUpdates.wordCount = calculateWordCount(input.contentMarkdown);
      if (input.summary === undefined && !existing.entry.summary) {
        entryUpdates.summary = extractSummary(input.contentMarkdown);
      }
    }

    if (input.summary !== undefined) {
      entryUpdates.summary = input.summary?.trim() || null;
    }

    if (input.mood !== undefined) {
      journalUpdates.mood = input.mood?.trim() || null;
    }

    if (input.weather !== undefined) {
      journalUpdates.weather = input.weather?.trim() || null;
    }

    // Execute updates
    await this.db.update(entries).set(entryUpdates).where(eq(entries.id, entryId));

    if (Object.keys(journalUpdates).length > 0) {
      await this.db
        .update(journalEntries)
        .set(journalUpdates)
        .where(eq(journalEntries.entryId, entryId));
    }

    // Handle tag synchronization if tags provided
    let attachedTags: string[];
    if (input.tags !== undefined) {
      // Clear old tags
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
        type: 'journal',
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

    return this.getJournal(entryId, user);
  }

  /**
   * Delete a Journal entry (soft delete by default)
   */
  async deleteJournal(entryId: string, user: AuthUser, soft: boolean = true): Promise<void> {
    this.assertAdmin(user);

    const existing = await this.db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.id, entryId), eq(entries.type, 'journal')))
      .get();

    if (!existing) {
      throw new NotFoundError('随想日记不存在');
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
   * List journals with pagination
   */
  async listJournals(
    query: ListJournalsQuery = {},
    user?: AuthUser | null
  ): Promise<PaginatedResult<JournalDetailDto>> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const conditions = [eq(entries.type, 'journal')];

    if (!hasAdminPrivileges(user?.role)) {
      conditions.push(isNull(entries.deletedAt));
      conditions.push(eq(entries.status, 'published'));
      conditions.push(eq(entries.visibility, 'public'));
    }

    if (query.mood) {
      conditions.push(eq(journalEntries.mood, query.mood));
    }

    if (query.weather) {
      conditions.push(eq(journalEntries.weather, query.weather));
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
        journal: journalEntries,
      })
      .from(entries)
      .innerJoin(journalEntries, eq(entries.id, journalEntries.entryId))
      .where(and(...conditions))
      .orderBy(desc(entries.occurredAt), desc(entries.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const itemsToReturn = hasMore ? rows.slice(0, limit) : rows;

    const dtos: JournalDetailDto[] = await Promise.all(
      itemsToReturn.map(async ({ entry, journal }) => {
        const attachedTags = await this.getEntryTags(entry.id);
        return {
          id: entry.id,
          ownerId: entry.ownerId,
          type: 'journal',
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
          contentMarkdown: journal.contentMarkdown,
          wordCount: journal.wordCount,
          mood: journal.mood,
          weather: journal.weather,
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
