import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { entries } from '@archive/database';

/**
 * Journal Entries Table
 * Stores rich markdown content, word count, and emotional/weather context
 * for quick thoughts and daily journal entries.
 */
export const journalEntries = sqliteTable('journal_entries', {
  entryId: text('entry_id')
    .primaryKey()
    .references(() => entries.id, { onDelete: 'cascade' }),
  contentMarkdown: text('content_markdown').notNull(),
  wordCount: integer('word_count').notNull().default(0),
  mood: text('mood'),
  weather: text('weather'),
});

export type JournalEntrySelect = typeof journalEntries.$inferSelect;
export type JournalEntryInsert = typeof journalEntries.$inferInsert;
