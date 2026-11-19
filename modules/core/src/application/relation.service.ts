import { eq, or, and } from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import {
  type EntryRelationDto,
  type CreateRelationInput,
  type AuthUser,
  NotFoundError,
} from '@archive/contracts';
import { generateUuidV7 } from '@archive/shared';
import { entryRelations } from '../infrastructure/schema.js';
import { assertAdmin } from '../domain/rbac.js';

export class RelationService {
  private readonly db: ArchiveDb;

  constructor(db: ArchiveDb) {
    this.db = db;
  }

  /**
   * Create a relation linking two entries. Admin only.
   */
  async createRelation(input: CreateRelationInput, user: AuthUser): Promise<EntryRelationDto> {
    assertAdmin(user);

    const existing = await this.db
      .select()
      .from(entryRelations)
      .where(
        and(
          eq(entryRelations.sourceEntryId, input.sourceEntryId),
          eq(entryRelations.targetEntryId, input.targetEntryId),
          eq(entryRelations.relationType, input.relationType)
        )
      )
      .limit(1);

    if (existing[0]) {
      return {
        id: existing[0].id,
        sourceEntryId: existing[0].sourceEntryId,
        targetEntryId: existing[0].targetEntryId,
        relationType: existing[0].relationType as EntryRelationDto['relationType'],
        note: existing[0].note,
        createdAt: existing[0].createdAt,
      };
    }

    const id = generateUuidV7();
    const now = Date.now();
    await this.db.insert(entryRelations).values({
      id,
      sourceEntryId: input.sourceEntryId,
      targetEntryId: input.targetEntryId,
      relationType: input.relationType,
      note: input.note ?? null,
      createdAt: now,
    });

    return {
      id,
      sourceEntryId: input.sourceEntryId,
      targetEntryId: input.targetEntryId,
      relationType: input.relationType as EntryRelationDto['relationType'],
      note: input.note ?? null,
      createdAt: now,
    };
  }

  /**
   * Delete an existing relation by ID. Admin only.
   */
  async deleteRelation(id: string, user: AuthUser): Promise<void> {
    assertAdmin(user);

    const existing = await this.db
      .select()
      .from(entryRelations)
      .where(eq(entryRelations.id, id))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError('关联记录不存在', id);
    }

    await this.db.delete(entryRelations).where(eq(entryRelations.id, id));
  }

  /**
   * Get all relations where the entry is either source or target.
   */
  async getRelationsForEntry(entryId: string): Promise<EntryRelationDto[]> {
    const results = await this.db
      .select()
      .from(entryRelations)
      .where(
        or(
          eq(entryRelations.sourceEntryId, entryId),
          eq(entryRelations.targetEntryId, entryId)
        )
      );

    return results.map((row) => ({
      id: row.id,
      sourceEntryId: row.sourceEntryId,
      targetEntryId: row.targetEntryId,
      relationType: row.relationType as EntryRelationDto['relationType'],
      note: row.note,
      createdAt: row.createdAt,
    }));
  }
}
