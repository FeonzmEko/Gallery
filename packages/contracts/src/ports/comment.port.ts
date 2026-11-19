import type { PaginatedResult } from '../api/response.js';

/**
 * Comment Port interface (Phase 3 pluggable extension point)
 * Supports native modular comments or 3rd-party self-hosted systems (Waline, Twikoo, Giscus).
 */

export type CommentStatus = 'approved' | 'pending' | 'spam';

export interface CommentDto {
  id: string;
  entryId: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string;
  authorUrl: string | null;
  content: string;
  status: CommentStatus;
  createdAt: number;
}

export interface CreateCommentDto {
  parentId?: string | null;
  authorName: string;
  authorEmail: string;
  authorUrl?: string | null;
  content: string;
}

export interface CommentPaginationQuery {
  cursor?: string;
  limit: number;
}

export interface CommentPort {
  /**
   * List approved comments for a specific entry.
   */
  listComments(
    entryId: string,
    pagination: CommentPaginationQuery
  ): Promise<PaginatedResult<CommentDto>>;

  /**
   * Post a new comment for an entry.
   * Includes anonymized IP hash and User-Agent for anti-spam filtering.
   */
  createComment(
    entryId: string,
    dto: CreateCommentDto,
    ipHash: string,
    userAgent?: string
  ): Promise<CommentDto>;

  /**
   * Moderate comment status (Admin only).
   */
  updateCommentStatus?(commentId: string, status: CommentStatus): Promise<CommentDto>;

  /**
   * Delete comment (Admin only).
   */
  deleteComment?(commentId: string): Promise<void>;
}
