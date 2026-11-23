import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
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

/**
 * Media Collections Table (M3-1)
 * Curated travel / photography albums grouping media assets.
 */
export const mediaCollections = sqliteTable(
  'media_collections',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    coverMediaId: text('cover_media_id'),
    occurredRange: text('occurred_range'),
    visibility: text('visibility').notNull().default('public'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_media_collections_slug').on(table.slug),
    index('idx_media_collections_visibility_created').on(table.visibility, table.createdAt),
  ]
);

/**
 * Media Collection Items Junction Table (M3-1)
 * Ordered binding between a collection and its media assets.
 */
export const mediaCollectionItems = sqliteTable(
  'media_collection_items',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => mediaCollections.id, { onDelete: 'cascade' }),
    mediaAssetId: text('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    addedAt: integer('added_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.mediaAssetId] }),
    index('idx_media_collection_items_order').on(table.collectionId, table.sortOrder),
    index('idx_media_collection_items_media').on(table.mediaAssetId),
  ]
);

export type MediaCollectionSelect = typeof mediaCollections.$inferSelect;
export type MediaCollectionInsert = typeof mediaCollections.$inferInsert;

export type MediaCollectionItemSelect = typeof mediaCollectionItems.$inferSelect;
export type MediaCollectionItemInsert = typeof mediaCollectionItems.$inferInsert;
