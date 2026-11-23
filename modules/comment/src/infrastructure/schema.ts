import {
  sqliteTable,
  text,
  integer,
  index,
} from 'drizzle-orm/sqlite-core';

/**
 * Comments Table (Phase 3 Reserved Schema)
 * Optional pluggable comments for archive entries.
 */
export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id'),
    mediaAssetId: text('media_asset_id'),
    parentId: text('parent_id'),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),
    authorUrl: text('author_url'),
    content: text('content').notNull(),
    status: text('status').notNull().default('approved'),
    isCuratorNote: integer('is_curator_note', { mode: 'boolean' }).notNull().default(false),
    ipHash: text('ip_hash').notNull(),
    userAgent: text('user_agent'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_comments_entry_time').on(table.entryId, table.status, table.createdAt),
    index('idx_comments_media_time').on(table.mediaAssetId, table.status, table.createdAt),
  ]
);

export type CommentSelect = typeof comments.$inferSelect;
export type CommentInsert = typeof comments.$inferInsert;
