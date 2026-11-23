import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import type { ArchiveDb } from '@archive/database';
import type { StoragePort, AuthUser } from '@archive/contracts';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MediaTypeNotAllowedError,
} from '@archive/contracts';
import { MediaService } from '../src/application/media.service.js';
import { MediaCollectionService } from '../src/application/collection.service.js';
import * as schema from '../src/infrastructure/schema.js';

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
  async batch<T = unknown>(statements: MockD1PreparedStatement[]) {
    return Promise.all(statements.map((s) => s.all<T>()));
  }
  async exec(query: string) {
    this.db.exec(query);
    return { count: 1, duration: 0 };
  }
}

describe('MediaService', () => {
  let db: ArchiveDb;
  let rawDb: DatabaseSync;
  let mockStorage: StoragePort;
  let mediaService: MediaService;

  const adminUser: AuthUser = {
    userId: 'admin_01',
    role: 'owner',
    email: 'admin@archive.internal',
  };

  const guestUser: AuthUser = {
    userId: 'guest_01',
    role: 'guest',
  };

  beforeEach(() => {
    rawDb = new DatabaseSync(':memory:');
    rawDb.exec(`
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
        exif_json TEXT,
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

      CREATE TABLE media_collections (
        id TEXT PRIMARY KEY NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        cover_media_id TEXT,
        occurred_range TEXT,
        visibility TEXT NOT NULL DEFAULT 'public',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE media_collection_items (
        collection_id TEXT NOT NULL REFERENCES media_collections(id) ON DELETE CASCADE,
        media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (collection_id, media_asset_id)
      );

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
    `);

    const mockD1 = new MockD1Database(rawDb);
    db = drizzle(mockD1 as any, { schema }) as ArchiveDb;

    mockStorage = {
      generateUploadUrl: vi.fn().mockImplementation(async (key, contentType) => ({
        uploadUrl: `https://storage.example.com/${key}?signed=true`,
        publicUrl: `https://media.archive.example.com/${key}`,
        key,
        headers: { 'content-type': contentType },
        expiresInSeconds: 3600,
      })),
      getDownloadUrl: vi.fn().mockImplementation(async (key) => `https://media.archive.example.com/${key}`),
      deleteObject: vi.fn().mockResolvedValue(undefined),
    };

    mediaService = new MediaService(db, mockStorage);
  });

  it('should issue direct upload ticket with locked headers for Admin', async () => {
    const ticket = await mediaService.requestUploadTicket(
      {
        filename: 'landscape.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1024 * 500,
        mediaType: 'image',
        visibility: 'public',
      },
      adminUser
    );

    expect(ticket.mediaId).toBeDefined();
    expect(ticket.bucketKey).toMatch(/^originals\/\d{4}\/\d{2}\/.*\.jpg$/);
    expect(ticket.uploadUrl).toContain('https://storage.example.com/');
    expect(ticket.headers).toEqual({ 'content-type': 'image/jpeg' });
    expect(ticket.maxSizeBytes).toBe(1024 * 500);

    // Verify record in DB is pending
    const media = await mediaService.getMedia(ticket.mediaId, adminUser);
    expect(media.uploadStatus).toBe('pending');
    expect(media.originalFilename).toBe('landscape.jpg');
  });

  it('should block non-admin from requesting upload ticket', async () => {
    await expect(
      mediaService.requestUploadTicket(
        {
          filename: 'hacked.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 1024,
          mediaType: 'image',
        },
        guestUser
      )
    ).rejects.toThrow(ForbiddenError);

    await expect(
      mediaService.requestUploadTicket(
        {
          filename: 'hacked.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 1024,
          mediaType: 'image',
        },
        null as any
      )
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should reject unsupported media MIME types', async () => {
    await expect(
      mediaService.requestUploadTicket(
        {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload',
          sizeBytes: 1024,
          mediaType: 'document',
        },
        adminUser
      )
    ).rejects.toThrow(MediaTypeNotAllowedError);
  });

  it('should confirm upload and update media metadata', async () => {
    const ticket = await mediaService.requestUploadTicket(
      {
        filename: 'photo.webp',
        contentType: 'image/webp',
        sizeBytes: 204800,
        mediaType: 'image',
      },
      adminUser
    );

    const confirmed = await mediaService.confirmUpload(
      ticket.mediaId,
      {
        width: 1920,
        height: 1080,
        sha256: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        thumbKey: 'thumbs/2026/photo_thumb.webp',
      },
      adminUser
    );

    expect(confirmed.uploadStatus).toBe('uploaded');
    expect(confirmed.width).toBe(1920);
    expect(confirmed.height).toBe(1080);
    expect(confirmed.thumbKey).toBe('thumbs/2026/photo_thumb.webp');
  });

  it('should guard private media assets from visitor access', async () => {
    const ticket = await mediaService.requestUploadTicket(
      {
        filename: 'secret.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024,
        mediaType: 'document',
        visibility: 'private',
      },
      adminUser
    );

    // Visitor should get ForbiddenError
    await expect(mediaService.getMedia(ticket.mediaId, null)).rejects.toThrow(ForbiddenError);
    await expect(mediaService.getMedia(ticket.mediaId, guestUser)).rejects.toThrow(ForbiddenError);

    // Admin can access
    const adminView = await mediaService.getMedia(ticket.mediaId, adminUser);
    expect(adminView.id).toBe(ticket.mediaId);
    expect(adminView.visibility).toBe('private');
  });

  it('should bind media asset to entry and list them', async () => {
    const ticket = await mediaService.requestUploadTicket(
      {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 5000,
        mediaType: 'image',
      },
      adminUser
    );

    const bound = await mediaService.bindEntryMedia(
      {
        entryId: 'entry_100',
        mediaId: ticket.mediaId,
        role: 'cover',
        sortOrder: 1,
        caption: 'Front cover photo',
      },
      adminUser
    );

    expect(bound.id).toBeDefined();
    expect(bound.entryId).toBe('entry_100');
    expect(bound.role).toBe('cover');

    const list = await mediaService.listEntryMedia('entry_100', null);
    expect(list).toHaveLength(1);
    expect(list[0].mediaId).toBe(ticket.mediaId);
    expect(list[0].caption).toBe('Front cover photo');
  });

  it('should create collections, bind/sort media, enforce private visibility, and attach commentCount', async () => {
    const commentCounter = vi.fn().mockImplementation(async (ids: string[]) => {
      const m = new Map<string, number>();
      if (ids[0]) m.set(ids[0], 3);
      return m;
    });
    const collectionService = new MediaCollectionService(db, mediaService, commentCounter);

    // Upload 2 public photos
    const t1 = await mediaService.requestUploadTicket(
      { filename: 'kyoto1.jpg', contentType: 'image/jpeg', sizeBytes: 1000, mediaType: 'image' },
      adminUser
    );
    await mediaService.confirmUpload(
      t1.mediaId,
      { width: 1600, height: 1200, thumbKey: 'thumbs/kyoto1.webp', exif: { model: 'Leica M6' } },
      adminUser
    );
    const t2 = await mediaService.requestUploadTicket(
      { filename: 'kyoto2.jpg', contentType: 'image/jpeg', sizeBytes: 1200, mediaType: 'image' },
      adminUser
    );
    await mediaService.confirmUpload(t2.mediaId, { width: 1200, height: 1600 }, adminUser);

    // Create public & private collections
    const pubCol = await collectionService.createCollection(
      {
        title: 'Kyoto Autumn',
        slug: 'kyoto-autumn',
        description: 'Foliage walk',
        occurredRange: '2026.11',
        visibility: 'public',
      },
      adminUser
    );
    const privCol = await collectionService.createCollection(
      {
        title: 'Private Contact Sheet',
        slug: 'private-sheet',
        visibility: 'private',
      },
      adminUser
    );

    // Bind & sort t2 before t1
    await collectionService.bindCollectionMedia(
      pubCol.id,
      {
        items: [
          { mediaAssetId: t2.mediaId, sortOrder: 1 },
          { mediaAssetId: t1.mediaId, sortOrder: 2 },
        ],
        replace: true,
      },
      adminUser
    );

    // Public list hides private collection, shows mediaCount=2 & fallback coverUrl
    const guestCols = await collectionService.listCollections(null);
    expect(guestCols).toHaveLength(1);
    expect(guestCols[0].slug).toBe('kyoto-autumn');
    expect(guestCols[0].mediaCount).toBe(2);
    expect(guestCols[0].coverUrl).toBeTruthy();

    // Admin list shows both
    const adminCols = await collectionService.listCollections(adminUser);
    expect(adminCols).toHaveLength(2);

    // Guest detail returns ordered photos with exif & commentCount
    const detail = await collectionService.getCollectionMedia('kyoto-autumn', null);
    expect(detail.items).toHaveLength(2);
    expect(detail.items[0].id).toBe(t2.mediaId);
    expect(detail.items[1].id).toBe(t1.mediaId);
    expect(detail.items[1].exif?.model).toBe('Leica M6');
    expect(detail.items[0].commentCount).toBe(3);

    // Private collection blocked for guest/unauthenticated
    await expect(collectionService.getCollectionMedia(privCol.slug, null)).rejects.toThrow(
      UnauthorizedError
    );
    await expect(collectionService.getCollectionMedia(privCol.slug, guestUser)).rejects.toThrow(
      ForbiddenError
    );
  });
});
