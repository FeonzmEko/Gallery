import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import type { StoragePort } from '@archive/contracts';
import { drizzle, type ArchiveDb } from '@archive/database';
import { seedDatabase } from '@archive/database/seed';
import * as schema from '@archive/database';
import { createApp } from '../src/app.js';
import type { Env } from '../src/env.js';

class TestMockD1PreparedStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly query: string,
    private readonly params: unknown[] = []
  ) {}

  bind(...values: unknown[]): TestMockD1PreparedStatement {
    return new TestMockD1PreparedStatement(this.db, this.query, values);
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

class TestMockD1Database {
  constructor(private readonly db: DatabaseSync) {}
  prepare(query: string): TestMockD1PreparedStatement {
    return new TestMockD1PreparedStatement(this.db, query);
  }
  async batch<T = unknown>(statements: TestMockD1PreparedStatement[]) {
    return Promise.all(statements.map((s) => s.all<T>()));
  }
  async exec(query: string) {
    this.db.exec(query);
    return { count: 1, duration: 0 };
  }
}

describe('Workers API Integration Suite', () => {
  let rawDb: DatabaseSync;
  let db: ArchiveDb;
  let mockD1: TestMockD1Database;
  let mockStorage: StoragePort;
  let mockEnv: Env;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    rawDb = new DatabaseSync(':memory:');

    // Create full schema in in-memory SQLite
    rawDb.exec(`
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

      CREATE TABLE entry_relations (
        id TEXT PRIMARY KEY NOT NULL,
        source_entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        target_entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        relation_type TEXT NOT NULL,
        note TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(source_entry_id, target_entry_id, relation_type)
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

      CREATE TABLE media_assets (
        id TEXT PRIMARY KEY NOT NULL,
        owner_id TEXT NOT NULL,
        storage_provider TEXT NOT NULL DEFAULT 'r2',
        bucket_key TEXT NOT NULL UNIQUE,
        thumb_key TEXT,
        preview_key TEXT,
        mime_type TEXT NOT NULL,
        media_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        sha256 TEXT,
        width INTEGER,
        height INTEGER,
        duration_ms INTEGER,
        upload_status TEXT NOT NULL DEFAULT 'pending',
        visibility TEXT NOT NULL DEFAULT 'public',
        original_filename TEXT,
        created_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE entry_media (
        id TEXT PRIMARY KEY NOT NULL,
        entry_id TEXT NOT NULL,
        media_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'gallery',
        sort_order INTEGER NOT NULL DEFAULT 0,
        caption TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    mockD1 = new TestMockD1Database(rawDb);
    db = drizzle(mockD1 as any, { schema }) as ArchiveDb;

    mockStorage = {
      generateUploadUrl: vi.fn().mockImplementation(async (key, contentType) => ({
        uploadUrl: `https://storage.example.com/${key}?presigned=true`,
        publicUrl: `https://media.archive.internal/${key}`,
        key,
        headers: { 'content-type': contentType },
        expiresInSeconds: 3600,
      })),
      getDownloadUrl: vi.fn().mockImplementation(async (key) => `https://media.archive.internal/${key}`),
      deleteObject: vi.fn().mockResolvedValue(undefined),
    };

    mockEnv = {
      DB: mockD1 as any,
      JWT_SECRET: 'super-secret-jwt-key-for-integration-tests',
      ADMIN_EMAIL: 'admin@archive.internal',
      ADMIN_PASSWORD: 'Admin@Pass2026',
      ENVIRONMENT: 'test',
    };

    // Run seed to populate admin user and sample entries
    await seedDatabase(db, {
      adminEmail: 'admin@archive.internal',
      adminPassword: 'Admin@Pass2026',
    });

    app = createApp(mockStorage);
  });

  it('GET /api/health should return ok status and environment', async () => {
    const res = await app.request('/api/health', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.environment).toBe('test');
  });

  it('Visitor calling GET /api/v1/entries should only receive public, published entries with Cache-Control header', async () => {
    const res = await app.request('/api/v1/entries', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);

    // Verify cache header for public feed
    expect(res.headers.get('Cache-Control')).toContain('public');

    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    // From seed: 4 entries total (2 public published, 1 private published, 1 public draft)
    // Visitor must only receive the 2 public published entries
    expect(body.data).toHaveLength(2);
    for (const item of body.data) {
      expect(item.visibility).toBe('public');
      expect(item.status).toBe('published');
      expect(item.deletedAt).toBeNull();
    }

    const titles = body.data.map((i: any) => i.title);
    expect(titles).toContain('Welcome to Personal Archive');
    expect(titles).toContain('Autumn Walk in the Old Town');
    expect(titles).not.toContain('Private Financial & Personal Reflection 2026');
    expect(titles).not.toContain('Draft: Upcoming Road Trip to the Alps');
  });

  it('Visitor calling POST /api/v1/entries should be rejected with 401 Unauthorized', async () => {
    const res = await app.request(
      '/api/v1/entries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unauthorized Entry',
          type: 'journal',
          occurredAt: Date.now(),
        }),
      },
      mockEnv
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('Admin login flow, authorized entry creation, media upload URL request, and full entries query', async () => {
    // 1. Login with Admin credentials
    const loginRes = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@archive.internal',
          password: 'Admin@Pass2026',
        }),
      },
      mockEnv
    );

    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as any;
    expect(loginBody.success).toBe(true);
    expect(loginBody.data.token).toBeDefined();
    const token = loginBody.data.token;

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 2. Verify /api/v1/auth/me returns current admin
    const meRes = await app.request('/api/v1/auth/me', { headers: authHeaders }, mockEnv);
    expect(meRes.status).toBe(200);
    const meBody = (await meRes.json()) as any;
    expect(meBody.data.email).toBe('admin@archive.internal');
    expect(meBody.data.role).toBe('owner');

    // 3. Admin creates a private entry
    const createEntryRes = await app.request(
      '/api/v1/entries',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Top Secret Plans for Next Year',
          type: 'journal',
          summary: 'Confidential strategic roadmap',
          occurredAt: Date.now() + 1000,
          visibility: 'private',
          status: 'published',
          tags: ['Secret', 'Planning'],
        }),
      },
      mockEnv
    );

    expect(createEntryRes.status).toBe(201);
    const createdEntryBody = (await createEntryRes.json()) as any;
    expect(createdEntryBody.success).toBe(true);
    expect(createdEntryBody.data.title).toBe('Top Secret Plans for Next Year');
    expect(createdEntryBody.data.visibility).toBe('private');
    const createdEntryId = createdEntryBody.data.id;

    // 4. Admin requests media upload presigned URL
    const uploadUrlRes = await app.request(
      '/api/v1/media/upload-url',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          filename: 'confidential_diagram.png',
          contentType: 'image/png',
          sizeBytes: 1024 * 200,
          mediaType: 'image',
          visibility: 'private',
        }),
      },
      mockEnv
    );

    expect(uploadUrlRes.status).toBe(200);
    const uploadUrlBody = (await uploadUrlRes.json()) as any;
    expect(uploadUrlBody.success).toBe(true);
    expect(uploadUrlBody.data.uploadUrl).toContain('https://storage.example.com/');
    expect(uploadUrlBody.data.headers).toEqual({ 'content-type': 'image/png' });
    const mediaId = uploadUrlBody.data.mediaId;

    // 5. Admin binds media to entry
    const bindRes = await app.request(
      '/api/v1/media/bind',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          entryId: createdEntryId,
          mediaId,
          role: 'cover',
          sortOrder: 0,
          caption: 'Secret diagram cover',
        }),
      },
      mockEnv
    );
    expect(bindRes.status).toBe(201);

    // 6. Admin queries entries list -> sees full list including private & draft entries
    const adminEntriesRes = await app.request(
      '/api/v1/entries',
      {
        method: 'GET',
        headers: authHeaders,
      },
      mockEnv
    );

    expect(adminEntriesRes.status).toBe(200);
    expect(adminEntriesRes.headers.get('Cache-Control')).toContain('no-cache');

    const adminEntriesBody = (await adminEntriesRes.json()) as any;
    expect(adminEntriesBody.success).toBe(true);
    // Seed had 4 entries, admin added 1 -> total 5 entries
    expect(adminEntriesBody.data).toHaveLength(5);

    const allTitles = adminEntriesBody.data.map((i: any) => i.title);
    expect(allTitles).toContain('Top Secret Plans for Next Year');
    expect(allTitles).toContain('Private Financial & Personal Reflection 2026');
    expect(allTitles).toContain('Draft: Upcoming Road Trip to the Alps');
    expect(allTitles).toContain('Welcome to Personal Archive');
    expect(allTitles).toContain('Autumn Walk in the Old Town');
  });

  it('Tags endpoint GET /api/v1/tags should list seeded tags', async () => {
    const res = await app.request('/api/v1/tags', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(5);

    const tagNames = body.data.map((t: any) => t.name);
    expect(tagNames).toContain('Introduction');
    expect(tagNames).toContain('Travel');
  });
});
