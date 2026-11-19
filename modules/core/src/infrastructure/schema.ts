import { desc } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core';

/**
 * Users Table
 * Represents administrators / owners / users of the archive.
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash'),
    role: text('role').notNull().default('owner'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_users_email').on(table.email),
  ]
);

/**
 * Entries Table
 * Unified index table for all content types (journals, trips, photos, etc.)
 */
export const entries = sqliteTable(
  'entries',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull(),
    slug: text('slug'),
    title: text('title').notNull(),
    summary: text('summary'),
    coverMediaId: text('cover_media_id'),
    occurredAt: integer('occurred_at').notNull(),
    visibility: text('visibility').notNull().default('public'),
    status: text('status').notNull().default('published'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    // Core public visitor feed index: (visibility, status, deleted_at, occurred_at DESC)
    index('idx_entries_public_feed').on(
      table.visibility,
      table.status,
      table.deletedAt,
      desc(table.occurredAt)
    ),
    // Admin management & timeline index: (owner_id, deleted_at, status, occurred_at DESC)
    index('idx_entries_timeline').on(
      table.ownerId,
      table.deletedAt,
      table.status,
      desc(table.occurredAt)
    ),
    // Type-filtered timeline index: (type, visibility, status, occurred_at DESC)
    index('idx_entries_type_time').on(
      table.type,
      table.visibility,
      table.status,
      desc(table.occurredAt)
    ),
    uniqueIndex('idx_entries_slug').on(table.slug),
  ]
);

/**
 * Tags Table
 * Unified tag taxonomy.
 */
export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    color: text('color'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_tags_owner_slug').on(table.ownerId, table.slug),
  ]
);

/**
 * Entry Tags Junction Table
 * Many-to-many relationship between entries and tags.
 */
export const entryTags = sqliteTable(
  'entry_tags',
  {
    entryId: text('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.tagId] }),
    index('idx_entry_tags_tag_entry').on(table.tagId, table.entryId),
  ]
);

/**
 * Entry Relations Table
 * Expresses cross-module connections (e.g. trip linked to music playlist or journal).
 */
export const entryRelations = sqliteTable(
  'entry_relations',
  {
    id: text('id').primaryKey(),
    sourceEntryId: text('source_entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    targetEntryId: text('target_entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
    note: text('note'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_entry_relations_unique').on(
      table.sourceEntryId,
      table.targetEntryId,
      table.relationType
    ),
    index('idx_entry_relations_target').on(table.targetEntryId, table.relationType),
  ]
);

/**
 * Entry Search Index Table
 * Denormalized search index for fast keyword matching without multi-table JOINs.
 */
export const entrySearchIndex = sqliteTable(
  'entry_search_index',
  {
    entryId: text('entry_id')
      .primaryKey()
      .references(() => entries.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    visibility: text('visibility').notNull(),
    titleNormalized: text('title_normalized').notNull(),
    tagsText: text('tags_text'),
    bodyExcerpt: text('body_excerpt'),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_search_visibility_type').on(table.visibility, table.type),
    index('idx_search_title').on(table.titleNormalized),
  ]
);

export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type EntrySelect = typeof entries.$inferSelect;
export type EntryInsert = typeof entries.$inferInsert;

export type TagSelect = typeof tags.$inferSelect;
export type TagInsert = typeof tags.$inferInsert;

export type EntryTagSelect = typeof entryTags.$inferSelect;
export type EntryTagInsert = typeof entryTags.$inferInsert;

export type EntryRelationSelect = typeof entryRelations.$inferSelect;
export type EntryRelationInsert = typeof entryRelations.$inferInsert;

export type EntrySearchIndexSelect = typeof entrySearchIndex.$inferSelect;
export type EntrySearchIndexInsert = typeof entrySearchIndex.$inferInsert;
