import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import type { ArchiveDb } from '@archive/database';
import * as commentSchema from '../src/infrastructure/schema.js';

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

  mem.exec(`
    CREATE TABLE comments (
      id TEXT PRIMARY KEY NOT NULL,
      entry_id TEXT,
      media_asset_id TEXT,
      parent_id TEXT,
      author_name TEXT NOT NULL,
      author_email TEXT NOT NULL,
      author_url TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      is_curator_note INTEGER NOT NULL DEFAULT 0,
      ip_hash TEXT NOT NULL,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX idx_comments_entry_time ON comments (entry_id, status, created_at);
    CREATE INDEX idx_comments_media_time ON comments (media_asset_id, status, created_at);
  `);

  const mockD1 = new MockD1Database(mem);
  const db = drizzle(mockD1 as any, { schema: commentSchema }) as ArchiveDb;
  return { db, rawDb: mem };
}
