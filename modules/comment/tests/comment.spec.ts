import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser, CommentPort } from '@archive/contracts';
import { CommentService, hashIp } from '../src/application/comment.service.js';
import { mountCommentRoutes } from '../src/presentation/routes.js';
import { createTestDatabase } from './test-db.js';

describe('@archive/module-comment', () => {
  let db: any;
  let service: CommentService;
  const mockAdmin: AuthUser = {
    userId: 'user_admin_01',
    email: 'admin@archive.internal',
    role: 'owner',
  };

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db;
    service = new CommentService(db, { defaultStatus: 'approved' });
  });

  describe('CommentPort Contract Implementation', () => {
    it('should implement CommentPort interface correctly', () => {
      const port: CommentPort = service;
      expect(port.listComments).toBeDefined();
      expect(port.createComment).toBeDefined();
      expect(port.updateCommentStatus).toBeDefined();
      expect(port.deleteComment).toBeDefined();
    });

    it('should post a new comment and return CommentDto with default approved status', async () => {
      const entryId = 'entry_trip_tokyo_01';
      const ipHash = await hashIp('203.0.113.195');

      const comment = await service.createComment(
        entryId,
        {
          authorName: 'Traveler Alice',
          authorEmail: 'alice@example.com',
          authorUrl: 'https://alice.travel.blog',
          content: 'Amazing photos! Which lens did you use for West Lake?',
        },
        ipHash,
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      );

      expect(comment.id).toBeDefined();
      expect(comment.entryId).toBe(entryId);
      expect(comment.authorName).toBe('Traveler Alice');
      expect(comment.authorEmail).toBe('alice@example.com');
      expect(comment.authorUrl).toBe('https://alice.travel.blog');
      expect(comment.content).toContain('Amazing photos');
      expect(comment.status).toBe('approved');
      expect(comment.createdAt).toBeGreaterThan(0);
    });

    it('should validate required fields when creating comment', async () => {
      const ipHash = await hashIp('127.0.0.1');

      await expect(
        service.createComment(
          '',
          {
            authorName: 'Bob',
            authorEmail: 'bob@example.com',
            content: 'Hello',
          },
          ipHash
        )
      ).rejects.toThrow(/Entry ID cannot be empty/);

      await expect(
        service.createComment(
          'entry_1',
          {
            authorName: '',
            authorEmail: 'bob@example.com',
            content: 'Hello',
          },
          ipHash
        )
      ).rejects.toThrow(/Author name cannot be empty/);

      await expect(
        service.createComment(
          'entry_1',
          {
            authorName: 'Bob',
            authorEmail: '',
            content: 'Hello',
          },
          ipHash
        )
      ).rejects.toThrow(/Author email cannot be empty/);

      await expect(
        service.createComment(
          'entry_1',
          {
            authorName: 'Bob',
            authorEmail: 'bob@example.com',
            content: '',
          },
          ipHash
        )
      ).rejects.toThrow(/Comment content cannot be empty/);
    });

    it('should support parent-child comment threading and reject invalid parentId', async () => {
      const entryId = 'entry_thread_01';
      const ipHash = await hashIp('1.2.3.4');

      const parent = await service.createComment(
        entryId,
        {
          authorName: 'Parent User',
          authorEmail: 'parent@example.com',
          content: 'This is the parent question.',
        },
        ipHash
      );

      const reply = await service.createComment(
        entryId,
        {
          parentId: parent.id,
          authorName: 'Reply User',
          authorEmail: 'reply@example.com',
          content: 'This is the answer.',
        },
        ipHash
      );

      expect(reply.parentId).toBe(parent.id);

      await expect(
        service.createComment(
          entryId,
          {
            parentId: 'non_existent_parent_id',
            authorName: 'Err',
            authorEmail: 'err@example.com',
            content: 'Will fail',
          },
          ipHash
        )
      ).rejects.toThrow(/Parent comment does not exist/);
    });
  });

  describe('Anti-Spam IP Hashing', () => {
    it('should generate deterministic one-way SHA-256 IP hash', async () => {
      const hash1 = await hashIp('192.168.1.100', 'salt-abc');
      const hash2 = await hashIp('192.168.1.100', 'salt-abc');
      const hash3 = await hashIp('192.168.1.101', 'salt-abc');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.length).toBe(64); // 256 bits = 64 hex characters
    });
  });

  describe('Moderation Workflow (pending / approved / spam)', () => {
    it('should support pending initial status and status update moderation', async () => {
      const moderatingService = new CommentService(db, { defaultStatus: 'pending' });
      const entryId = 'entry_mod_01';
      const ipHash = await hashIp('10.0.0.1');

      const comment = await moderatingService.createComment(
        entryId,
        {
          authorName: 'Spammer',
          authorEmail: 'spammer@example.com',
          content: 'Buy discount pills now!',
        },
        ipHash
      );

      expect(comment.status).toBe('pending');

      // Pending comment should NOT appear in public list
      const publicList1 = await moderatingService.listComments(entryId);
      expect(publicList1.items.length).toBe(0);

      // Approve the comment
      const approved = await moderatingService.updateCommentStatus(comment.id, 'approved');
      expect(approved.status).toBe('approved');

      // Now it appears in public list
      const publicList2 = await moderatingService.listComments(entryId);
      expect(publicList2.items.length).toBe(1);
      expect(publicList2.items[0].id).toBe(comment.id);

      // Mark as spam
      await moderatingService.updateCommentStatus(comment.id, 'spam');
      const publicList3 = await moderatingService.listComments(entryId);
      expect(publicList3.items.length).toBe(0);
    });

    it('should support permanent deletion', async () => {
      const entryId = 'entry_del_01';
      const comment = await service.createComment(
        entryId,
        {
          authorName: 'User',
          authorEmail: 'user@example.com',
          content: 'To be deleted',
        },
        'ip_hash_1'
      );

      await service.deleteComment(comment.id);
      const list = await service.listComments(entryId);
      expect(list.items.length).toBe(0);

      await expect(service.deleteComment(comment.id)).rejects.toThrow(/Comment does not exist/);
    });
  });

  describe('Cursor Pagination (CreatedAt DESC)', () => {
    it('should return comments in reverse chronological order and paginate with cursor', async () => {
      const entryId = 'entry_pagination_test';

      // Insert 5 comments
      const createdComments = [];
      for (let i = 1; i <= 5; i++) {
        const c = await service.createComment(
          entryId,
          {
            authorName: `User ${i}`,
            authorEmail: `user${i}@example.com`,
            content: `Comment number ${i}`,
          },
          `hash_${i}`
        );
        createdComments.push(c);
      }

      // First page with limit 2
      const page1 = await service.listComments(entryId, { limit: 2 });
      expect(page1.items.length).toBe(2);
      expect(page1.pagination.hasMore).toBe(true);
      expect(page1.pagination.cursor).toBeTruthy();

      // Second page
      const page2 = await service.listComments(entryId, {
        limit: 2,
        cursor: page1.pagination.cursor!,
      });
      expect(page2.items.length).toBe(2);
      expect(page2.pagination.hasMore).toBe(true);
      expect(page2.pagination.cursor).toBeTruthy();

      // Third page
      const page3 = await service.listComments(entryId, {
        limit: 2,
        cursor: page2.pagination.cursor!,
      });
      expect(page3.items.length).toBe(1);
      expect(page3.pagination.hasMore).toBe(false);
      expect(page3.pagination.cursor).toBeNull();
    });
  });

  describe('Presentation REST Routes', () => {
    let app: Hono<any>;

    beforeEach(() => {
      app = new Hono();
      mountCommentRoutes(app, { comment: service });
    });

    it('POST /api/v1/entries/:entryId/comments should allow public visitor submission and return 201', async () => {
      const res = await app.request('/api/v1/entries/entry_web_01/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '114.114.114.114',
          'user-agent': 'VitestClient/1.0',
        },
        body: JSON.stringify({
          authorName: 'Visitor Lin',
          authorEmail: 'lin@example.com',
          content: 'Great personal gallery! Very inspiring architecture.',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.authorName).toBe('Visitor Lin');
      expect(body.data.status).toBe('approved');
    });

    it('GET /api/v1/entries/:entryId/comments should return 200 and include Cache-Control header', async () => {
      // First create a comment
      await service.createComment(
        'entry_web_02',
        {
          authorName: 'Visitor',
          authorEmail: 'visitor@example.com',
          content: 'Public comment',
        },
        'ip_123'
      );

      const res = await app.request('/api/v1/entries/entry_web_02/comments', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toContain('public');
      expect(res.headers.get('cache-control')).toContain('s-maxage=300');

      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
    });

    it('PUT /api/v1/comments/:id/status should reject unauthorized requests with 401', async () => {
      const comment = await service.createComment(
        'entry_auth_01',
        {
          authorName: 'Visitor',
          authorEmail: 'visitor@example.com',
          content: 'Check auth',
        },
        'ip_auth'
      );

      const res = await app.request(`/api/v1/comments/${comment.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'spam' }),
      });

      expect(res.status).toBe(401);
    });

    it('GET & POST /api/v1/media/:mediaId/comments should support single-media comments and auto-tag isCuratorNote for admin', async () => {
      // Guest submission -> isCuratorNote: false
      const guestPost = await app.request('/api/v1/media/media_01/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '203.0.113.10',
        },
        body: JSON.stringify({
          authorName: 'Guest Photo Fan',
          authorEmail: 'fan@example.com',
          content: 'Love the film grain on this frame!',
        }),
      });
      expect(guestPost.status).toBe(201);
      const guestBody = (await guestPost.json()) as any;
      expect(guestBody.data.mediaAssetId).toBe('media_01');
      expect(guestBody.data.entryId).toBeNull();
      expect(guestBody.data.isCuratorNote).toBe(false);

      // Admin submission -> isCuratorNote: true
      const authedApp = new Hono<any>();
      authedApp.use('*', async (c, next) => {
        c.set('user', mockAdmin);
        await next();
      });
      mountCommentRoutes(authedApp, { comment: service });

      const adminPost = await authedApp.request('/api/v1/media/media_01/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '203.0.113.11',
        },
        body: JSON.stringify({
          authorName: 'Archivist',
          authorEmail: 'admin@archive.internal',
          content: 'Shot on Contax T2, Portra 400.',
        }),
      });
      expect(adminPost.status).toBe(201);
      const adminBody = (await adminPost.json()) as any;
      expect(adminBody.data.mediaAssetId).toBe('media_01');
      expect(adminBody.data.isCuratorNote).toBe(true);

      // List media comments with Cache-Control
      const listRes = await app.request('/api/v1/media/media_01/comments', { method: 'GET' });
      expect(listRes.status).toBe(200);
      expect(listRes.headers.get('cache-control')).toContain('public');
      const listBody = (await listRes.json()) as any;
      expect(listBody.data).toHaveLength(2);

      // Verify countMediaComments
      const counts = await service.countMediaComments(['media_01', 'media_empty']);
      expect(counts.get('media_01')).toBe(2);
      expect(counts.get('media_empty')).toBeUndefined();
    });
  });
});
