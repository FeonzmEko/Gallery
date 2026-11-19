import { eq, and, sql } from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import {
  type TagDto,
  type CreateTagInput,
  type AuthUser,
  NotFoundError,
} from '@archive/contracts';
import { generateUuidV7, slugify } from '@archive/shared';
import { tags, entryTags, type TagSelect } from '../infrastructure/schema.js';
import { assertAdmin } from '../domain/rbac.js';

export { slugify };

export class TagService {
  private readonly db: ArchiveDb;

  constructor(db: ArchiveDb) {
    this.db = db;
  }

  /**
   * List all tags with their associated entry count.
   */
  async listTags(ownerId?: string): Promise<TagDto[]> {
    const query = this.db
      .select({
        id: tags.id,
        ownerId: tags.ownerId,
        name: tags.name,
        slug: tags.slug,
        color: tags.color,
        createdAt: tags.createdAt,
        entryCount: sql<number>`count(${entryTags.entryId})`.as('entry_count'),
      })
      .from(tags)
      .leftJoin(entryTags, eq(tags.id, entryTags.tagId))
      .groupBy(tags.id);

    if (ownerId) {
      query.where(eq(tags.ownerId, ownerId));
    }

    const results = await query;
    return results.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      slug: row.slug,
      color: row.color,
      createdAt: row.createdAt,
      entryCount: Number(row.entryCount || 0),
    }));
  }

  /**
   * Create a new tag. Admin only.
   */
  async createTag(input: CreateTagInput, ownerId: string, user?: AuthUser): Promise<TagDto> {
    if (user) {
      assertAdmin(user);
    }

    const slug = input.slug?.trim() || slugify(input.name);
    const existing = await this.db
      .select()
      .from(tags)
      .where(and(eq(tags.ownerId, ownerId), eq(tags.slug, slug)))
      .limit(1);

    if (existing[0]) {
      return {
        id: existing[0].id,
        ownerId: existing[0].ownerId,
        name: existing[0].name,
        slug: existing[0].slug,
        color: existing[0].color,
        createdAt: existing[0].createdAt,
      };
    }

    const id = generateUuidV7();
    const now = Date.now();
    await this.db.insert(tags).values({
      id,
      ownerId,
      name: input.name.trim(),
      slug,
      color: input.color ?? null,
      createdAt: now,
    });

    return {
      id,
      ownerId,
      name: input.name.trim(),
      slug,
      color: input.color ?? null,
      createdAt: now,
      entryCount: 0,
    };
  }

  /**
   * Find or create tags by their names.
   */
  async getOrCreateTags(names: string[], ownerId: string): Promise<TagSelect[]> {
    const result: TagSelect[] = [];
    const uniqueNames = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));

    for (const name of uniqueNames) {
      const slug = slugify(name);
      const existing = await this.db
        .select()
        .from(tags)
        .where(and(eq(tags.ownerId, ownerId), eq(tags.slug, slug)))
        .limit(1);

      if (existing[0]) {
        result.push(existing[0]);
      } else {
        const id = generateUuidV7();
        const now = Date.now();
        await this.db.insert(tags).values({
          id,
          ownerId,
          name,
          slug,
          color: null,
          createdAt: now,
        });
        result.push({
          id,
          ownerId,
          name,
          slug,
          color: null,
          createdAt: now,
        });
      }
    }

    return result;
  }

  /**
   * Delete a tag by ID. Admin only.
   */
  async deleteTag(id: string, user: AuthUser): Promise<void> {
    assertAdmin(user);
    const existing = await this.db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError('标签不存在', id);
    }

    await this.db.delete(tags).where(eq(tags.id, id));
  }
}
