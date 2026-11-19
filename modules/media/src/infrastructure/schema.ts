import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * Media Assets Table
 * Physical files stored in object storage (R2 / S3 / OSS / COS)
 */
export const mediaAssets = sqliteTable(
  'media_assets',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    storageProvider: text('storage_provider').notNull().default('r2'),
    bucketKey: text('bucket_key').notNull(),
    thumbKey: text('thumb_key'),
    previewKey: text('preview_key'),
    mimeType: text('mime_type').notNull(),
    mediaType: text('media_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256'),
    width: integer('width'),
    height: integer('height'),
    durationMs: integer('duration_ms'),
    uploadStatus: text('upload_status').notNull().default('pending'),
    visibility: text('visibility').notNull().default('public'),
    originalFilename: text('original_filename'),
    exifJson: text('exif_json'),
    createdAt: integer('created_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    uniqueIndex('idx_media_bucket_key').on(table.bucketKey),
    index('idx_media_owner_deleted').on(table.ownerId, table.deletedAt),
    index('idx_media_upload_status').on(table.uploadStatus),
    index('idx_media_sha256').on(table.sha256),
  ]
);

/**
 * Entry Media Junction Table
 * Relations binding entries to media assets with role and ordering.
 */
export const entryMedia = sqliteTable(
  'entry_media',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id').notNull(),
    mediaId: text('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('gallery'),
    sortOrder: integer('sort_order').notNull().default(0),
    caption: text('caption'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_entry_media_entry_role_order').on(table.entryId, table.role, table.sortOrder),
    index('idx_entry_media_media').on(table.mediaId),
  ]
);

export type MediaAssetSelect = typeof mediaAssets.$inferSelect;
export type MediaAssetInsert = typeof mediaAssets.$inferInsert;

export type EntryMediaSelect = typeof entryMedia.$inferSelect;
export type EntryMediaInsert = typeof entryMedia.$inferInsert;
