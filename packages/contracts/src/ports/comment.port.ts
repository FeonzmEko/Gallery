import type { PaginatedResult } from '../api/response.js';

/**
 * Comment Port interface (Phase 3 pluggable extension point)
 * Supports native modular comments or 3rd-party self-hosted systems (Waline, Twikoo, Giscus).
 */

export type CommentStatus = 'approved' | 'pending' | 'spam';

export interface CommentDto {
  id: string;
  entryId: string | null;
  mediaAssetId: string | null;
  parentId: string | null;
  authorName: string;
  authorEmail: string;
  authorUrl: string | null;
  content: string;
  status: CommentStatus;
  isCuratorNote: boolean;
  createdAt: number;
}

export interface MediaCommentDto extends CommentDto {
  mediaAssetId: string;
}

export type MediaComment = MediaCommentDto;

export interface CreateCommentDto {
  parentId?: string | null;
  authorName: string;
  authorEmail: string;
  authorUrl?: string | null;
  content: string;
}

export interface CreateCommentOptions {
  isCuratorNote?: boolean;
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
    userAgent?: string,
    options?: CreateCommentOptions
  ): Promise<CommentDto>;

  /**
   * List approved comments for a specific media asset.
   */
  listMediaComments?(
    mediaAssetId: string,
    pagination: CommentPaginationQuery
  ): Promise<PaginatedResult<MediaCommentDto>>;

  /**
   * Post a new comment for a specific media asset.
   */
  createMediaComment?(
    mediaAssetId: string,
    dto: CreateCommentDto,
    ipHash: string,
    userAgent?: string,
    options?: CreateCommentOptions
  ): Promise<MediaCommentDto>;

  /**
   * Moderate comment status (Admin only).
   */
  updateCommentStatus?(commentId: string, status: CommentStatus): Promise<CommentDto>;

  /**
   * Delete comment (Admin only).
   */
  deleteComment?(commentId: string): Promise<void>;
}
