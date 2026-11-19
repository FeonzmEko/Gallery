import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import type { ArchiveDb } from '@archive/database';
import * as coreSchema from '@archive/database';
import * as journalSchema from '../src/infrastructure/schema.js';

class MockD1PreparedStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly query: string,
    private readonly params: unknown[] = []
  ) {}

  bind(...values: unknown[]): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this.db, this.query, values);
  }

  async first<T = unknown>(col?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.query);
    const row = stmt.get(...(this.params as any)) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (col ? row[col] : row) as T;
  }

  async all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: Record<string, unknown> }> {
    const stmt = this.db.prepare(this.query);
    const results = stmt.all(...(this.params as any)) as T[];
    return { results, success: true, meta: {} };
  }

  async run(): Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }> {
    const stmt = this.db.prepare(this.query);
    const info = stmt.run(...(this.params as any));
    return {
      success: true,
      meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) },
    };
  }

  async raw<T = unknown>(): Promise<T[]> {
    const stmt = this.db.prepare(this.query);
    const rows = stmt.all(...(this.params as any)) as Record<string, unknown>[];
    return rows.map((r) => Object.values(r)) as T[];
  }
}

class MockD1Database {
  constructor(private readonly db: DatabaseSync) {}

  prepare(query: string): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this.db, query);
  }

  async batch<T = unknown>(statements: MockD1PreparedStatement[]): Promise<{ results: T[]; success: boolean; meta: Record<string, unknown> }[]> {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.all<T>());
    }
    return results;
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    this.db.exec(query);
    return { count: 1, duration: 0 };
  }
}

export function createTestDatabase(): { db: ArchiveDb; rawDb: DatabaseSync } {
  const mem = new DatabaseSync(':memory:');

  // Initialize unified entries, users, tags, relations and journal_entries
  mem.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE entries (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      slug TEXT UNIQUE,
      title TEXT NOT NULL,
      summary TEXT,
      cover_media_id TEXT,
      occurred_at INTEGER NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      status TEXT NOT NULL DEFAULT 'published',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );

    CREATE TABLE tags (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      color TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(owner_id, slug)
    );

    CREATE TABLE entry_tags (
      entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (entry_id, tag_id)
    );

    CREATE TABLE entry_search_index (
      entry_id TEXT PRIMARY KEY NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      visibility TEXT NOT NULL,
      title_normalized TEXT NOT NULL,
      tags_text TEXT,
      body_excerpt TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE journal_entries (
      entry_id TEXT PRIMARY KEY NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      content_markdown TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      mood TEXT,
      weather TEXT
    );
  `);

  const mockD1 = new MockD1Database(mem);
  const db = drizzle(mockD1 as any, { schema: { ...coreSchema, ...journalSchema } }) as ArchiveDb;
  return { db, rawDb: mem };
}
