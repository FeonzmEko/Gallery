import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { generateUuidV7 } from '@archive/shared';
import type { ArchiveDb } from './client.js';
import * as schema from './schema.js';
import {
  users,
  entries,
  tags,
  entryTags,
  entrySearchIndex,
} from './schema.js';

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );
  const hashBytes = new Uint8Array(derivedBits);
  let saltHex = '';
  for (let i = 0; i < salt.length; i++) saltHex += salt[i].toString(16).padStart(2, '0');
  let hashHex = '';
  for (let i = 0; i < hashBytes.length; i++) hashHex += hashBytes[i].toString(16).padStart(2, '0');
  return `pbkdf2:${iterations}:${saltHex}:${hashHex}`;
}

export interface SeedOptions {
  adminEmail?: string;
  adminPassword?: string;
  adminDisplayName?: string;
}

export interface SeedResult {
  adminUser: { id: string; email: string; displayName: string };
  entriesCount: number;
  tagsCount: number;
}

/**
 * Seed the database with initial admin credentials and sample public/private records.
 */
export async function seedDatabase(
  db: ArchiveDb,
  options?: SeedOptions
): Promise<SeedResult> {
  const adminEmail = (options?.adminEmail || process.env.ADMIN_EMAIL || 'admin@archive.internal')
    .trim()
    .toLowerCase();
  const adminPassword = options?.adminPassword || process.env.ADMIN_PASSWORD || 'Admin@Pass2026';
  const adminDisplayName = options?.adminDisplayName || 'Archivist Owner';

  const passwordHash = await hashPassword(adminPassword);
  const now = Date.now();

  // 1. Create or update initial administrator
  let adminId = '018f0000-0000-7000-8000-000000000001';
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existingAdmin[0]) {
    adminId = existingAdmin[0].id;
    await db
      .update(users)
      .set({
        passwordHash,
        displayName: adminDisplayName,
        role: 'owner',
        updatedAt: now,
      })
      .where(eq(users.id, adminId));
  } else {
    await db.insert(users).values({
      id: adminId,
      email: adminEmail,
      displayName: adminDisplayName,
      passwordHash,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });
  }

  // 2. Create Tags
  const sampleTags = [
    { name: 'Introduction', slug: 'intro', color: '#3b82f6' },
    { name: 'Travel', slug: 'travel', color: '#10b981' },
    { name: 'Photography', slug: 'photography', color: '#f59e0b' },
    { name: 'Secret', slug: 'secret', color: '#ef4444' },
    { name: 'Music', slug: 'music', color: '#8b5cf6' },
  ];

  const tagIdMap = new Map<string, string>();
  for (const t of sampleTags) {
    const existing = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, t.slug))
      .limit(1);

    if (existing[0]) {
      tagIdMap.set(t.name, existing[0].id);
    } else {
      const tagId = generateUuidV7();
      await db.insert(tags).values({
        id: tagId,
        ownerId: adminId,
        name: t.name,
        slug: t.slug,
        color: t.color,
        createdAt: now,
      });
      tagIdMap.set(t.name, tagId);
    }
  }

  // 3. Create Sample Entries (Public, Private, Draft)
  const sampleEntries = [
    {
      title: 'Welcome to Personal Archive',
      type: 'journal',
      slug: 'welcome',
      summary: 'A secure, beautiful, and self-hosted personal digital garden and memory archive.',
      occurredAt: now - 86400000 * 3, // 3 days ago
      visibility: 'public' as const,
      status: 'published' as const,
      tags: ['Introduction'],
    },
    {
      title: 'Autumn Walk in the Old Town',
      type: 'photo',
      slug: 'autumn-walk',
      summary: 'Golden leaves under the afternoon sunlight with gentle autumn breeze.',
      occurredAt: now - 86400000 * 2, // 2 days ago
      visibility: 'public' as const,
      status: 'published' as const,
      tags: ['Photography', 'Travel'],
    },
    {
      title: 'Private Financial & Personal Reflection 2026',
      type: 'journal',
      slug: 'private-reflection-2026',
      summary: 'Strictly confidential self-reflection and asset balance records.',
      occurredAt: now - 86400000 * 1, // 1 day ago
      visibility: 'private' as const,
      status: 'published' as const,
      tags: ['Secret'],
    },
    {
      title: 'Draft: Upcoming Road Trip to the Alps',
      type: 'trip',
      slug: 'alps-trip-draft',
      summary: 'Rough packing list and itinerary draft for upcoming hiking journey.',
      occurredAt: now,
      visibility: 'public' as const,
      status: 'draft' as const,
      tags: ['Travel'],
    },
  ];

  for (const item of sampleEntries) {
    const existing = await db
      .select()
      .from(entries)
      .where(eq(entries.title, item.title))
      .limit(1);

    let entryId: string;
    if (existing[0]) {
      entryId = existing[0].id;
    } else {
      entryId = generateUuidV7();
      await db.insert(entries).values({
        id: entryId,
        ownerId: adminId,
        type: item.type,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        occurredAt: item.occurredAt,
        visibility: item.visibility,
        status: item.status,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      // Bind tags
      for (const tagName of item.tags) {
        const tagId = tagIdMap.get(tagName);
        if (tagId) {
          await db
            .insert(entryTags)
            .values({
              entryId,
              tagId,
              createdAt: now,
            })
            .onConflictDoNothing();
        }
      }

      // Add to search index
      await db
        .insert(entrySearchIndex)
        .values({
          entryId,
          type: item.type,
          visibility: item.visibility,
          titleNormalized: item.title.toLowerCase(),
          tagsText: item.tags.join(' '),
          bodyExcerpt: item.summary,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }
  }

  return {
    adminUser: { id: adminId, email: adminEmail, displayName: adminDisplayName },
    entriesCount: sampleEntries.length,
    tagsCount: sampleTags.length,
  };
}

// Standalone CLI runner
async function runCli(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  console.log('🌱 Starting Personal Archive database seeding...');

  // Search for local D1 sqlite db or use local dev SQLite db
  const stateDir = path.resolve(__dirname, '../../../.wrangler/state/v3/d1');
  let targetSqlitePath = path.resolve(__dirname, '../../../.wrangler/local-dev.db');

  if (fs.existsSync(stateDir)) {
    const files = fs.readdirSync(stateDir).filter((f: string) => f.endsWith('.sqlite'));
    if (files.length > 0) {
      targetSqlitePath = path.join(stateDir, files[0]);
    }
  }

  const parentDir = path.dirname(targetSqlitePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  console.log(`📦 Connecting to SQLite database at: ${targetSqlitePath}`);
  const mem = new DatabaseSync(targetSqlitePath);

  // Apply migration if tables don't exist
  const migrationFile = path.resolve(__dirname, '../migrations/0000_nappy_ultragirl.sql');
  if (fs.existsSync(migrationFile)) {
    const sqlContent = fs.readFileSync(migrationFile, 'utf-8');
    const statements = sqlContent.split('--> statement-breakpoint');
    for (const stmt of statements) {
      const clean = stmt.trim();
      if (clean) {
        try {
          mem.exec(clean);
        } catch {
          // Table or index may already exist
        }
      }
    }
  }

  // Create D1 mock wrapper
  class CliMockD1PreparedStatement {
    constructor(private readonly db: DatabaseSync, private readonly query: string, private readonly params: unknown[] = []) {}
    bind(...values: unknown[]) { return new CliMockD1PreparedStatement(this.db, this.query, values); }
    async first<T = unknown>(col?: string): Promise<T | null> {
      const stmt = this.db.prepare(this.query);
      const row = stmt.get(...(this.params as any)) as Record<string, unknown> | undefined;
      return !row ? null : ((col ? row[col] : row) as T);
    }
    async all<T = unknown>() {
      const stmt = this.db.prepare(this.query);
      return { results: stmt.all(...(this.params as any)) as T[], success: true, meta: {} };
    }
    async run() {
      const stmt = this.db.prepare(this.query);
      const info = stmt.run(...(this.params as any));
      return { success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
    }
    async raw<T = unknown>() {
      const stmt = this.db.prepare(this.query);
      return (stmt.all(...(this.params as any)) as Record<string, unknown>[]).map((r) => Object.values(r)) as T[];
    }
  }

  class CliMockD1Database {
    constructor(private readonly db: DatabaseSync) {}
    prepare(query: string) { return new CliMockD1PreparedStatement(this.db, query); }
    async batch<T = unknown>(stmts: CliMockD1PreparedStatement[]) {
      return Promise.all(stmts.map((s) => s.all<T>()));
    }
    async exec(query: string) {
      this.db.exec(query);
      return { count: 1, duration: 0 };
    }
  }

  const mockD1 = new CliMockD1Database(mem);
  const db = drizzle(mockD1 as any, { schema }) as ArchiveDb;

  const result = await seedDatabase(db);
  console.log('✅ Seeding completed successfully!');
  console.log(`👤 Admin Account: ${result.adminUser.email} (Password: Admin@Pass2026)`);
  console.log(`📝 Seeded ${result.entriesCount} entries and ${result.tagsCount} tags.`);
}

// Auto-run if executed as main script
const isMain = process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));
if (isMain) {
  runCli().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}
