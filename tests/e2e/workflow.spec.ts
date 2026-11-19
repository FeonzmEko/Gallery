import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { drizzle, type ArchiveDb } from '@archive/database';
import { seedDatabase } from '@archive/database/seed';
import * as schema from '@archive/database';
import type { StoragePort, StorageUploadResult } from '@archive/contracts';
import { createApp } from '../../workers/api/src/app.js';
import type { Env } from '../../workers/api/src/env.js';

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

describe('End-to-End Core Workflow Regression Suite (M6-2)', () => {
  let rawDb: DatabaseSync;
  let db: ArchiveDb;
  let mockD1: TestMockD1Database;
  let mockStorage: StoragePort;
  let mockEnv: Env;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    rawDb = new DatabaseSync(':memory:');

    // Create full schema tables in in-memory SQLite
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

      CREATE TABLE comments (
        id TEXT PRIMARY KEY NOT NULL,
        entry_id TEXT NOT NULL,
        parent_id TEXT,
        author_name TEXT NOT NULL,
        author_email TEXT NOT NULL,
        author_url TEXT,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'approved',
        ip_hash TEXT NOT NULL,
        user_agent TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX idx_comments_entry_time ON comments (entry_id, status, created_at);
    `);

    mockD1 = new TestMockD1Database(rawDb);
    db = drizzle(mockD1 as any, { schema }) as ArchiveDb;

    mockStorage = {
      generateUploadUrl: vi.fn().mockImplementation(async (key: string, contentType: string) => ({
        uploadUrl: `https://storage.cdn.example.com/${key}?X-Amz-Signature=mock123`,
        publicUrl: `https://cdn.example.com/${key}`,
        key,
        headers: { 'Content-Type': contentType },
        expiresInSeconds: 3600,
      })),
      getDownloadUrl: vi.fn().mockImplementation(async (key: string) => `https://cdn.example.com/${key}`),
      deleteObject: vi.fn().mockResolvedValue(undefined),
    };

    mockEnv = {
      DB: mockD1 as any,
      JWT_SECRET: 'e2e-workflow-test-jwt-secret-2026',
      ADMIN_EMAIL: 'admin@archive.internal',
      ADMIN_PASSWORD: 'Admin@Pass2026',
      ENVIRONMENT: 'test',
    };

    // Seed database with admin user and sample entries
    await seedDatabase(db, {
      adminEmail: 'admin@archive.internal',
      adminPassword: 'Admin@Pass2026',
    });

    app = createApp(mockStorage);
  });

  it('Complete End-to-End Workflow: Visitor -> Auth -> Historical Backfill -> Media Direct Upload -> Timeline Precision -> CommentPort Interop', async () => {
    // ----------------------------------------------------------------------------------
    // Step 1: 访客匿名访问公共时间线接口：验证仅可获取 public & published 条目，包含标准 CDN 缓存头
    // ----------------------------------------------------------------------------------
    const publicTimelineRes = await app.request('/api/v1/entries?limit=10', { method: 'GET' }, mockEnv);
    expect(publicTimelineRes.status).toBe(200);

    // 验证 CDN 缓存头
    const cacheControl = publicTimelineRes.headers.get('cache-control');
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age=60');
    expect(cacheControl).toContain('s-maxage=3600');

    const timelineData = (await publicTimelineRes.json()) as any;
    expect(timelineData.success).toBe(true);
    expect(Array.isArray(timelineData.data)).toBe(true);

    // 严格验证访客只能查看 public 和 published 内容
    for (const item of timelineData.data) {
      expect(item.visibility).toBe('public');
      expect(item.status).toBe('published');
    }

    // ----------------------------------------------------------------------------------
    // Step 2: 访客尝试调用创建条目、直传凭证等写接口：严格断言返回 401 Unauthorized
    // ----------------------------------------------------------------------------------
    // 尝试创建条目
    const unauthCreateEntryRes = await app.request(
      '/api/v1/entries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'trip',
          title: '非法创建旅行条目',
          occurredAt: Date.now(),
        }),
      },
      mockEnv
    );
    expect(unauthCreateEntryRes.status).toBe(401);
    const unauthCreateBody = (await unauthCreateEntryRes.json()) as any;
    expect(unauthCreateBody.success).toBe(false);
    expect(unauthCreateBody.error.code).toBe('UNAUTHORIZED');

    // 尝试申请媒体直传预签名凭证
    const unauthUploadTicketRes = await app.request(
      '/api/v1/media/upload-url',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'hacker-photo.png',
          contentType: 'image/png',
          sizeBytes: 1024,
          mediaType: 'image',
        }),
      },
      mockEnv
    );
    expect(unauthUploadTicketRes.status).toBe(401);

    // 尝试调用媒体绑定接口
    const unauthBindRes = await app.request(
      '/api/v1/media/bind',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: 'some_id',
          mediaId: 'some_media',
        }),
      },
      mockEnv
    );
    expect(unauthBindRes.status).toBe(401);

    // ----------------------------------------------------------------------------------
    // Step 3: 管理员调用登录接口成功获取 Token
    // ----------------------------------------------------------------------------------
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

    const loginData = (await loginRes.json()) as any;
    expect(loginData.success).toBe(true);
    expect(loginData.data.token).toBeDefined();
    expect(loginData.data.user.email).toBe('admin@archive.internal');
    expect(loginData.data.user.role).toBe('owner');

    const adminToken = loginData.data.token as string;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    // ----------------------------------------------------------------------------------
    // Step 4: 管理员携带 Token 成功创建旅行与随想记录（模拟补录历史发生时间 occurred_at）
    // ----------------------------------------------------------------------------------
    // 历史旅行：补录 2 年前发生的关西旅行（2024年5月15日）
    const historicalTripOccurredAt = new Date('2024-05-15T09:30:00Z').getTime();
    const createTripRes = await app.request(
      '/api/v1/entries',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'trip',
          title: '京都初夏漫步与古寺寻幽',
          summary: '鸭川微风，岚山竹林，补录2024年初夏关西旅行回忆。',
          occurredAt: historicalTripOccurredAt,
          visibility: 'public',
          status: 'published',
          tags: ['旅行', '日本', '摄影'],
        }),
      },
      mockEnv
    );
    expect(createTripRes.status).toBe(201);
    const tripData = (await createTripRes.json()) as any;
    expect(tripData.success).toBe(true);
    const tripEntryId = tripData.data.id;
    expect(tripData.data.occurredAt).toBe(historicalTripOccurredAt);

    // 历史随想：补录 1 年前发生的深夜随想（2025年1月20日）
    const historicalJournalOccurredAt = new Date('2025-01-20T22:15:00Z').getTime();
    const createJournalRes = await app.request(
      '/api/v1/entries',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'journal',
          title: '深夜关于边缘计算与多存储解耦架构的随想',
          summary: '从单体向 Cloudflare Edge 与多云解耦演进的深度思考。',
          occurredAt: historicalJournalOccurredAt,
          visibility: 'public',
          status: 'published',
          tags: ['技术', '随想'],
        }),
      },
      mockEnv
    );
    expect(createJournalRes.status).toBe(201);
    const journalData = (await createJournalRes.json()) as any;
    expect(journalData.success).toBe(true);
    const journalEntryId = journalData.data.id;
    expect(journalData.data.occurredAt).toBe(historicalJournalOccurredAt);

    // ----------------------------------------------------------------------------------
    // Step 5: 管理员获取预签名直传凭证，确认上传并绑定至内容条目
    // ----------------------------------------------------------------------------------
    // 5.1 获取预签名直传凭证
    const uploadTicketRes = await app.request(
      '/api/v1/media/upload-url',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          filename: 'kyoto-fushimi-inari.webp',
          contentType: 'image/webp',
          sizeBytes: 2450000,
          mediaType: 'image',
        }),
      },
      mockEnv
    );
    expect(uploadTicketRes.status).toBe(200);
    const ticketData = (await uploadTicketRes.json()) as any;
    expect(ticketData.success).toBe(true);
    expect(ticketData.data.uploadUrl).toContain('https://storage.cdn.example.com');
    const mediaId = ticketData.data.mediaId;

    // 5.2 确认上传完成（模拟前端直传成功后向 Worker 回调确认元信息）
    const confirmRes = await app.request(
      `/api/v1/media/${mediaId}/confirm`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          width: 3840,
          height: 2160,
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        }),
      },
      mockEnv
    );
    expect(confirmRes.status).toBe(200);
    const mediaAsset = (await confirmRes.json()) as any;
    expect(mediaAsset.data.uploadStatus).toBe('uploaded');

    // 5.3 绑定媒体至旅行条目（作为封面图）
    const bindRes = await app.request(
      '/api/v1/media/bind',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          entryId: tripEntryId,
          mediaId: mediaId,
          role: 'cover',
          sortOrder: 1,
          caption: '伏见稻荷千本鸟居晨光初现',
        }),
      },
      mockEnv
    );
    expect(bindRes.status).toBe(201);
    const bindingData = (await bindRes.json()) as any;
    expect(bindingData.data.entryId).toBe(tripEntryId);
    expect(bindingData.data.mediaId).toBe(mediaId);
    expect(bindingData.data.role).toBe('cover');

    // ----------------------------------------------------------------------------------
    // Step 6: 再次查询时间线，验证新条目已严格按照 occurred_at（而非创建时间）精确归位
    // ----------------------------------------------------------------------------------
    const updatedTimelineRes = await app.request('/api/v1/entries?limit=50', { method: 'GET' }, mockEnv);
    expect(updatedTimelineRes.status).toBe(200);
    const updatedTimeline = (await updatedTimelineRes.json()) as any;
    const allItems = updatedTimeline.data as Array<{ id: string; occurredAt: number }>;

    // 严格断言整条时间线元素严格满足 occurredAt DESC 降序排列
    for (let i = 0; i < allItems.length - 1; i++) {
      expect(allItems[i].occurredAt).toBeGreaterThanOrEqual(allItems[i + 1].occurredAt);
    }

    // 验证新插入的随想条目 (2025年) 与旅行条目 (2024年) 的相对位置
    const journalIndex = allItems.findIndex((it) => it.id === journalEntryId);
    const tripIndex = allItems.findIndex((it) => it.id === tripEntryId);

    expect(journalIndex).toBeGreaterThanOrEqual(0);
    expect(tripIndex).toBeGreaterThanOrEqual(0);

    // 随想发生时间(2025)晚于旅行发生时间(2024)，在倒序时间线中随想条目索引必须排在旅行条目之前！
    expect(journalIndex).toBeLessThan(tripIndex);
    expect(allItems[journalIndex].occurredAt).toBe(historicalJournalOccurredAt);
    expect(allItems[tripIndex].occurredAt).toBe(historicalTripOccurredAt);

    // ----------------------------------------------------------------------------------
    // Step 7: 验证评论发布流与 CommentPort 契约互通
    // ----------------------------------------------------------------------------------
    // 7.1 访客发表公开评论
    const visitorCommentRes = await app.request(
      `/api/v1/entries/${tripEntryId}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '220.181.38.148',
          'user-agent': 'VisitorTravelerClient/1.0',
        },
        body: JSON.stringify({
          authorName: '背包客小王',
          authorEmail: 'wang@traveler.me',
          authorUrl: 'https://wang.travel',
          content: '照片拍得太震撼了！请问千本鸟居早上几点去人比较少？',
        }),
      },
      mockEnv
    );
    expect(visitorCommentRes.status).toBe(201);
    const commentData = (await visitorCommentRes.json()) as any;
    expect(commentData.success).toBe(true);
    expect(commentData.data.authorName).toBe('背包客小王');
    expect(commentData.data.status).toBe('approved');
    const commentId = commentData.data.id;

    // 7.2 访客查询该条目评论，验证缓存头与内容
    const getCommentsRes = await app.request(
      `/api/v1/entries/${tripEntryId}/comments`,
      { method: 'GET' },
      mockEnv
    );
    expect(getCommentsRes.status).toBe(200);
    expect(getCommentsRes.headers.get('cache-control')).toContain('public');
    expect(getCommentsRes.headers.get('cache-control')).toContain('s-maxage=300');

    const commentsList = (await getCommentsRes.json()) as any;
    expect(commentsList.success).toBe(true);
    expect(commentsList.data.length).toBe(1);
    expect(commentsList.data[0].content).toContain('千本鸟居');

    // 7.3 管理员审核评论：将状态更改为 spam
    const moderateSpamRes = await app.request(
      `/api/v1/comments/${commentId}/status`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'spam' }),
      },
      mockEnv
    );
    expect(moderateSpamRes.status).toBe(200);

    // 再次作为访客查询，已被标记为 spam 的评论不应公开显示
    const afterSpamCommentsRes = await app.request(
      `/api/v1/entries/${tripEntryId}/comments`,
      { method: 'GET' },
      mockEnv
    );
    const afterSpamList = (await afterSpamCommentsRes.json()) as any;
    expect(afterSpamList.data.length).toBe(0);

    // 7.4 管理员恢复评论状态为 approved
    const restoreRes = await app.request(
      `/api/v1/comments/${commentId}/status`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'approved' }),
      },
      mockEnv
    );
    expect(restoreRes.status).toBe(200);

    // 再次查询，评论恢复可见
    const restoredCommentsRes = await app.request(
      `/api/v1/entries/${tripEntryId}/comments`,
      { method: 'GET' },
      mockEnv
    );
    const restoredList = (await restoredCommentsRes.json()) as any;
    expect(restoredList.data.length).toBe(1);
    expect(restoredList.data[0].id).toBe(commentId);
  });
});
