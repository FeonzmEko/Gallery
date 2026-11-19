import { eq, and, or, lt, desc } from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import {
  type CommentPort,
  type CommentDto,
  type CreateCommentDto,
  type CommentPaginationQuery,
  type CommentStatus,
  type PaginatedResult,
  NotFoundError,
  ValidationError,
} from '@archive/contracts';
import { generateUuidV7, encodeCursor, decodeCursor } from '@archive/shared';
import { comments, type CommentSelect } from '../infrastructure/schema.js';

export interface CommentServiceOptions {
  /**
   * Default initial status for newly created comments.
   * Defaults to 'approved' for public commenting, or 'pending' if manual moderation is enabled.
   */
  defaultStatus?: CommentStatus;
  /**
   * Salt used for anonymizing client IP addresses into one-way SHA-256 hashes.
   */
  ipSalt?: string;
}

interface CommentCursorPayload {
  createdAt: number;
  id: string;
}

/**
 * Anonymize client IP address using SHA-256 with optional salt.
 * Ensures visitor privacy while providing deterministic anti-spam hashing.
 */
export async function hashIp(ip: string, salt: string = 'archive-comment-ip-salt'): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${ip.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Maps database row to standard CommentDto.
 */
function mapCommentRow(row: CommentSelect): CommentDto {
  return {
    id: row.id,
    entryId: row.entryId,
    parentId: row.parentId,
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    authorUrl: row.authorUrl,
    content: row.content,
    status: row.status as CommentStatus,
    createdAt: row.createdAt,
  };
}

/**
 * CommentService implementing CommentPort.
 * Supports visitor comment submission, IP hashing, moderation workflow (pending/approved/spam),
 * and reverse chronological cursor pagination.
 */
export class CommentService implements CommentPort {
  private readonly db: ArchiveDb;
  private readonly defaultStatus: CommentStatus;
  private readonly ipSalt: string;

  constructor(db: ArchiveDb, options?: CommentServiceOptions) {
    this.db = db;
    this.defaultStatus = options?.defaultStatus ?? 'approved';
    this.ipSalt = options?.ipSalt ?? 'archive-comment-ip-salt';
  }

  /**
   * List approved comments for a specific entry, ordered by createdAt DESC (newest first).
   * Supports cursor pagination.
   */
  async listComments(
    entryId: string,
    pagination?: CommentPaginationQuery
  ): Promise<PaginatedResult<CommentDto>> {
    if (!entryId || entryId.trim() === '') {
      throw new ValidationError('Entry ID cannot be empty');
    }

    const limit = Math.min(Math.max(pagination?.limit ?? 20, 1), 100);
    const conditions = [
      eq(comments.entryId, entryId.trim()),
      eq(comments.status, 'approved'),
    ];

    if (pagination?.cursor) {
      const cursorObj = decodeCursor<CommentCursorPayload>(pagination.cursor);
      if (cursorObj && typeof cursorObj.createdAt === 'number' && cursorObj.id) {
        conditions.push(
          or(
            lt(comments.createdAt, cursorObj.createdAt),
            and(
              eq(comments.createdAt, cursorObj.createdAt),
              lt(comments.id, cursorObj.id)
            )
          )!
        );
      }
    }

    const rows = await this.db
      .select()
      .from(comments)
      .where(and(...conditions))
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor<CommentCursorPayload>({
        createdAt: lastItem.createdAt,
        id: lastItem.id,
      });
    }

    return {
      items: items.map(mapCommentRow),
      pagination: {
        cursor: nextCursor,
        hasMore,
        limit,
      },
    };
  }

  /**
   * Post a new comment for an entry.
   * Computes anonymized IP hash if not already hashed.
   */
  async createComment(
    entryId: string,
    dto: CreateCommentDto,
    ipHash: string,
    userAgent?: string
  ): Promise<CommentDto> {
    if (!entryId || entryId.trim() === '') {
      throw new ValidationError('Entry ID cannot be empty');
    }
    if (!dto.authorName || dto.authorName.trim() === '') {
      throw new ValidationError('Author name cannot be empty');
    }
    if (!dto.authorEmail || dto.authorEmail.trim() === '') {
      throw new ValidationError('Author email cannot be empty');
    }
    if (!dto.content || dto.content.trim() === '') {
      throw new ValidationError('Comment content cannot be empty');
    }

    const id = generateUuidV7();
    const now = Date.now();
    const authorUrl = dto.authorUrl?.trim() ? dto.authorUrl.trim() : null;
    const parentId = dto.parentId?.trim() ? dto.parentId.trim() : null;

    // Validate parent comment existence if parentId is provided
    if (parentId) {
      const parent = await this.db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.id, parentId))
        .limit(1);

      if (!parent[0]) {
        throw new NotFoundError('Parent comment does not exist', parentId);
      }
    }

    await this.db.insert(comments).values({
      id,
      entryId: entryId.trim(),
      parentId,
      authorName: dto.authorName.trim(),
      authorEmail: dto.authorEmail.trim().toLowerCase(),
      authorUrl,
      content: dto.content.trim(),
      status: this.defaultStatus,
      ipHash: ipHash || (await hashIp('127.0.0.1', this.ipSalt)),
      userAgent: userAgent?.trim() ?? null,
      createdAt: now,
    });

    return {
      id,
      entryId: entryId.trim(),
      parentId,
      authorName: dto.authorName.trim(),
      authorEmail: dto.authorEmail.trim().toLowerCase(),
      authorUrl,
      content: dto.content.trim(),
      status: this.defaultStatus,
      createdAt: now,
    };
  }

  /**
   * Moderate comment status (Admin only).
   */
  async updateCommentStatus(commentId: string, status: CommentStatus): Promise<CommentDto> {
    if (!commentId || commentId.trim() === '') {
      throw new ValidationError('Comment ID cannot be empty');
    }

    const existing = await this.db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError('Comment does not exist', commentId);
    }

    await this.db
      .update(comments)
      .set({ status })
      .where(eq(comments.id, commentId));

    return {
      ...mapCommentRow(existing[0]),
      status,
    };
  }

  /**
   * Delete comment permanently (Admin only).
   */
  async deleteComment(commentId: string): Promise<void> {
    if (!commentId || commentId.trim() === '') {
      throw new ValidationError('Comment ID cannot be empty');
    }

    const existing = await this.db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError('Comment does not exist', commentId);
    }

    await this.db.delete(comments).where(eq(comments.id, commentId));
  }

  /**
   * Get single comment by ID.
   */
  async getCommentById(commentId: string): Promise<CommentDto | null> {
    const rows = await this.db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    return rows[0] ? mapCommentRow(rows[0]) : null;
  }
}
