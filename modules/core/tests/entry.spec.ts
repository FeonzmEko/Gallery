import { describe, it, expect, beforeEach } from 'vitest';
import {
  EntryService,
  TagService,
  RelationService,
} from '../src/index.js';
import { users } from '../src/infrastructure/schema.js';
import { createTestDatabase } from './test-db.js';
import type { AuthUser } from '@archive/contracts';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@archive/contracts';

describe('EntryService & RBAC Timeline', () => {
  let db: ReturnType<typeof createTestDatabase>['db'];
  let entryService: EntryService;
  let tagService: TagService;
  let relationService: RelationService;

  const adminUser: AuthUser = {
    userId: 'admin_1',
    role: 'owner',
    email: 'admin@archive.internal',
  };

  const guestUser: AuthUser = {
    userId: 'guest_1',
    role: 'guest',
  };

  beforeEach(async () => {
    const testDb = createTestDatabase();
    db = testDb.db;
    tagService = new TagService(db);
    entryService = new EntryService(db, tagService);
    relationService = new RelationService(db);

    // Seed admin
    await db.insert(users).values({
      id: 'admin_1',
      email: 'admin@archive.internal',
      displayName: 'Archivist',
      role: 'owner',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  it('should allow admin to create an entry with tags', async () => {
    const entry = await entryService.createEntry(
      {
        title: 'Trip to Kyoto',
        type: 'trip',
        occurredAt: 1700000000000,
        visibility: 'public',
        status: 'published',
        summary: 'Beautiful autumn leaves',
        tags: ['Travel', 'Japan'],
      },
      adminUser
    );

    expect(entry.id).toBeDefined();
    expect(entry.title).toBe('Trip to Kyoto');
    expect(entry.tags).toEqual(expect.arrayContaining(['Travel', 'Japan']));
    expect(entry.visibility).toBe('public');
  });

  it('should block non-admin or unauthenticated visitor from creating entries', async () => {
    await expect(
      entryService.createEntry(
        {
          title: 'Hacked entry',
          type: 'journal',
          occurredAt: Date.now(),
          visibility: 'public',
          status: 'published',
        },
        guestUser
      )
    ).rejects.toThrow(ForbiddenError);

    await expect(
      entryService.createEntry(
        {
          title: 'Hacked entry 2',
          type: 'journal',
          occurredAt: Date.now(),
          visibility: 'public',
          status: 'published',
        },
        null as any
      )
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should enforce strict visitor read filtering vs admin full access', async () => {
    // 1. Create a public published entry
    await entryService.createEntry(
      {
        title: 'Public Memory',
        type: 'photo',
        occurredAt: 1700000003000,
        visibility: 'public',
        status: 'published',
      },
      adminUser
    );

    // 2. Create a private entry
    const privateEntry = await entryService.createEntry(
      {
        title: 'Confidential Secret Diary',
        type: 'journal',
        occurredAt: 1700000002000,
        visibility: 'private',
        status: 'published',
      },
      adminUser
    );

    // 3. Create a draft entry
    await entryService.createEntry(
      {
        title: 'Draft Memory',
        type: 'trip',
        occurredAt: 1700000001000,
        visibility: 'public',
        status: 'draft',
      },
      adminUser
    );

    // Visitor query: should ONLY see the 1 public published entry
    const visitorFeed = await entryService.listTimeline({}, null);
    expect(visitorFeed.items).toHaveLength(1);
    expect(visitorFeed.items[0].title).toBe('Public Memory');

    // Admin query: should see ALL 3 entries
    const adminFeed = await entryService.listTimeline({}, adminUser);
    expect(adminFeed.items).toHaveLength(3);
    const titles = adminFeed.items.map((i) => i.title);
    expect(titles).toContain('Public Memory');
    expect(titles).toContain('Confidential Secret Diary');
    expect(titles).toContain('Draft Memory');

    // Direct getEntryById RBAC check:
    // Visitor accessing private entry should get NotFoundError
    await expect(entryService.getEntryById(privateEntry.id, null)).rejects.toThrow(NotFoundError);
    // Admin accessing private entry succeeds
    const fetched = await entryService.getEntryById(privateEntry.id, adminUser);
    expect(fetched.id).toBe(privateEntry.id);
  });

  it('should support cursor-based pagination sorted by occurredAt DESC, id DESC', async () => {
    // Create 5 entries with different occurredAt
    for (let i = 1; i <= 5; i++) {
      await entryService.createEntry(
        {
          title: `Memory ${i}`,
          type: 'photo',
          occurredAt: 1700000000000 + i * 10000,
          visibility: 'public',
          status: 'published',
        },
        adminUser
      );
    }

    // Page 1: limit 2
    const page1 = await entryService.listTimeline({ limit: 2 }, null);
    expect(page1.items).toHaveLength(2);
    expect(page1.pagination.hasMore).toBe(true);
    expect(page1.pagination.cursor).not.toBeNull();
    expect(page1.items[0].title).toBe('Memory 5');
    expect(page1.items[1].title).toBe('Memory 4');

    // Page 2: with cursor from page 1
    const page2 = await entryService.listTimeline(
      { limit: 2, cursor: page1.pagination.cursor! },
      null
    );
    expect(page2.items).toHaveLength(2);
    expect(page2.pagination.hasMore).toBe(true);
    expect(page2.items[0].title).toBe('Memory 3');
    expect(page2.items[1].title).toBe('Memory 2');

    // Page 3: with cursor from page 2
    const page3 = await entryService.listTimeline(
      { limit: 2, cursor: page2.pagination.cursor! },
      null
    );
    expect(page3.items).toHaveLength(1);
    expect(page3.pagination.hasMore).toBe(false);
    expect(page3.pagination.cursor).toBeNull();
    expect(page3.items[0].title).toBe('Memory 1');
  });

  it('should soft delete entries and hide them from timeline', async () => {
    const entry = await entryService.createEntry(
      {
        title: 'To be deleted',
        type: 'journal',
        occurredAt: 1700000000000,
        visibility: 'public',
        status: 'published',
      },
      adminUser
    );

    // Soft delete
    await entryService.deleteEntry(entry.id, adminUser, true);

    // Visitor cannot view
    const visitorFeed = await entryService.listTimeline({}, null);
    expect(visitorFeed.items).toHaveLength(0);

    // Direct get throws NotFound
    await expect(entryService.getEntryById(entry.id, null)).rejects.toThrow(NotFoundError);
  });

  it('should support tag listing and cross-entry relations', async () => {
    const e1 = await entryService.createEntry(
      {
        title: 'Entry One',
        type: 'journal',
        occurredAt: 1700000001000,
        tags: ['Reflections', 'Year2026'],
      },
      adminUser
    );

    const e2 = await entryService.createEntry(
      {
        title: 'Entry Two',
        type: 'playlist',
        occurredAt: 1700000002000,
        tags: ['Music', 'Year2026'],
      },
      adminUser
    );

    // List tags
    const allTags = await tagService.listTags();
    expect(allTags.length).toBeGreaterThanOrEqual(3);
    const tag2026 = allTags.find((t) => t.name === 'Year2026');
    expect(tag2026?.entryCount).toBe(2);

    // Create relation
    const rel = await relationService.createRelation(
      {
        sourceEntryId: e1.id,
        targetEntryId: e2.id,
        relationType: 'soundtrack',
        note: 'Listening while writing',
      },
      adminUser
    );

    expect(rel.id).toBeDefined();
    expect(rel.relationType).toBe('soundtrack');

    const relations = await relationService.getRelationsForEntry(e1.id);
    expect(relations).toHaveLength(1);
    expect(relations[0].targetEntryId).toBe(e2.id);
  });
});
