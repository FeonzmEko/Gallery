import { describe, it, expect, beforeEach } from 'vitest';
import type { AuthUser } from '@archive/contracts';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '@archive/contracts';
import { calculateWordCount } from '../src/domain/word-count.js';
import { StandardMoods, MoodSchema } from '../src/domain/mood.js';
import { StandardWeathers, WeatherSchema } from '../src/domain/weather.js';
import { JournalService } from '../src/application/journal.service.js';
import { createTestDatabase } from './test-db.js';

describe('@archive/module-journal', () => {
  describe('Word Count Calculation', () => {
    it('should return 0 for empty or whitespace string', () => {
      expect(calculateWordCount('')).toBe(0);
      expect(calculateWordCount('   \n\t  ')).toBe(0);
    });

    it('should accurately count pure Chinese characters', () => {
      const text = '今天天气晴朗，适合出门散步。';
      // 12 Chinese characters excluding punctuation
      expect(calculateWordCount(text)).toBe(12);
    });

    it('should accurately count pure English words', () => {
      const text = 'Today is a wonderful day to build software!';
      expect(calculateWordCount(text)).toBe(8);
    });

    it('should accurately count mixed Chinese and English', () => {
      const text = '今天用 TypeScript 编写了 2 个微模块，感觉非常 productive！';
      // Chinese: 今天用(3) + 编写了(3) + 个微模块(4) + 感觉非常(4) = 14
      // Latin/nums: TypeScript (1), 2 (1), productive (1) = 3
      // Total: 17
      expect(calculateWordCount(text)).toBe(17);
    });

    it('should strip markdown headers, blockquotes, bullet points, links, and code blocks', () => {
      const md = `
# 标题一

> 这是一段引言

- 列表项一
- 列表项二

这是一段普通正文，包含了 [链接文字](https://example.com) 和 \`inline code\`。

\`\`\`typescript
const a = 1;
console.log(a);
\`\`\`
`;
      // Headers: 标题一 (3)
      // Quote: 这是一段引言 (6)
      // List: 列表项一(4) + 列表项二(4) = 8
      // Text: 这是一段普通正文(8) + 包含了(3) + 链接文字(4) + 和(1) = 16
      // Total CJK = 3 + 6 + 8 + 16 = 33
      // Code blocks and inline code stripped.
      const count = calculateWordCount(md);
      expect(count).toBe(33);
    });
  });

  describe('Mood and Weather Validation', () => {
    it('should recognize standard moods and weathers', () => {
      expect(StandardMoods).toContain('happy');
      expect(StandardMoods).toContain('thoughtful');
      expect(StandardWeathers).toContain('sunny');
      expect(StandardWeathers).toContain('rainy');
    });

    it('should validate mood and weather schemas', () => {
      expect(MoodSchema.parse('happy')).toBe('happy');
      expect(WeatherSchema.parse('sunny')).toBe('sunny');
      expect(() => MoodSchema.parse('')).toThrow();
    });
  });

  describe('JournalService Core Use Cases', () => {
    let service: JournalService;
    let rawDb: any;
    const adminUser: AuthUser = {
      userId: 'usr_admin01',
      email: 'admin@archive.internal',
      displayName: 'Admin User',
      role: 'admin',
    };
    const guestUser: AuthUser = {
      userId: 'usr_guest01',
      email: 'guest@archive.internal',
      displayName: 'Guest User',
      role: 'user',
    };

    beforeEach(() => {
      const testDb = createTestDatabase();
      service = new JournalService(testDb.db);
      rawDb = testDb.rawDb;

      // Seed admin user
      const now = Date.now();
      rawDb.exec(`
        INSERT INTO users (id, email, display_name, role, created_at, updated_at)
        VALUES ('usr_admin01', 'admin@archive.internal', 'Admin User', 'admin', ${now}, ${now});
      `);
    });

    it('should enforce admin permission when creating journal', async () => {
      const input = {
        title: '我的随笔',
        contentMarkdown: '今天记录一些思考。',
        occurredAt: Date.now(),
      };

      await expect(service.createJournal(input, guestUser)).rejects.toThrow(ForbiddenError);
    });

    it('should create a journal with word count, tags, mood, and weather', async () => {
      const now = Date.now();
      const input = {
        slug: 'my-first-journal',
        title: '第一篇随想',
        contentMarkdown: '今天天气特别好，我在公园散步思考系统架构设计。',
        occurredAt: now,
        mood: 'relaxed',
        weather: 'sunny',
        tags: ['生活', '思考'],
      };

      const result = await service.createJournal(input, adminUser);

      expect(result.id).toBeDefined();
      expect(result.type).toBe('journal');
      expect(result.slug).toBe('my-first-journal');
      expect(result.title).toBe('第一篇随想');
      expect(result.mood).toBe('relaxed');
      expect(result.weather).toBe('sunny');
      expect(result.tags).toEqual(['生活', '思考']);
      expect(result.wordCount).toBe(21);
      expect(result.summary).toBeDefined();
    });

    it('should prevent duplicate slug creation', async () => {
      const now = Date.now();
      await service.createJournal(
        {
          slug: 'unique-slug',
          title: '一篇日记',
          contentMarkdown: '内容1',
          occurredAt: now,
        },
        adminUser
      );

      await expect(
        service.createJournal(
          {
            slug: 'unique-slug',
            title: '另一篇日记',
            contentMarkdown: '内容2',
            occurredAt: now,
          },
          adminUser
        )
      ).rejects.toThrow(ConflictError);
    });

    it('should get journal by ID and by slug', async () => {
      const created = await service.createJournal(
        {
          slug: 'readable-slug',
          title: '查询测试',
          contentMarkdown: '随记正文详情',
          occurredAt: Date.now(),
          mood: 'happy',
        },
        adminUser
      );

      const byId = await service.getJournal(created.id, null);
      expect(byId.id).toBe(created.id);
      expect(byId.title).toBe('查询测试');
      expect(byId.mood).toBe('happy');

      const bySlug = await service.getJournal('readable-slug', null);
      expect(bySlug.id).toBe(created.id);
    });

    it('should restrict private journal from public visitors', async () => {
      const created = await service.createJournal(
        {
          title: '私密日记',
          contentMarkdown: '这是绝密心事。',
          occurredAt: Date.now(),
          visibility: 'private',
        },
        adminUser
      );

      // Unauthenticated visitor
      await expect(service.getJournal(created.id, null)).rejects.toThrow(UnauthorizedError);

      // Non-admin user
      await expect(service.getJournal(created.id, guestUser)).rejects.toThrow(ForbiddenError);

      // Admin user
      const adminView = await service.getJournal(created.id, adminUser);
      expect(adminView.id).toBe(created.id);
    });

    it('should update journal content and re-calculate word count', async () => {
      const created = await service.createJournal(
        {
          title: '初始标题',
          contentMarkdown: '短文本',
          occurredAt: Date.now(),
          mood: 'tired',
        },
        adminUser
      );

      expect(created.wordCount).toBe(3);

      const updated = await service.updateJournal(
        created.id,
        {
          title: '更新后标题',
          contentMarkdown: '今天深入研究了分布式系统一致性协议与架构模式。',
          mood: 'excited',
          weather: 'clear',
          tags: ['技术', '架构'],
        },
        adminUser
      );

      expect(updated.title).toBe('更新后标题');
      expect(updated.mood).toBe('excited');
      expect(updated.weather).toBe('clear');
      expect(updated.tags).toEqual(['技术', '架构']);
      expect(updated.wordCount).toBe(22);
    });

    it('should soft delete journal and exclude it from public feed', async () => {
      const created = await service.createJournal(
        {
          title: '待删除日记',
          contentMarkdown: '待删除的内容',
          occurredAt: Date.now(),
        },
        adminUser
      );

      await service.deleteJournal(created.id, adminUser, true);

      // Public visitor cannot see deleted entry
      await expect(service.getJournal(created.id, null)).rejects.toThrow(UnauthorizedError);

      // Admin can still retrieve it
      const adminView = await service.getJournal(created.id, adminUser);
      expect(adminView.deletedAt).toBeGreaterThan(0);
    });

    it('should list journals with mood/weather filters and pagination', async () => {
      const baseTime = Date.now();
      await service.createJournal(
        {
          title: '晴天开心',
          contentMarkdown: '晴朗开心日',
          occurredAt: baseTime + 1000,
          mood: 'happy',
          weather: 'sunny',
        },
        adminUser
      );
      await service.createJournal(
        {
          title: '雨天沉思',
          contentMarkdown: '下雨思考日',
          occurredAt: baseTime + 2000,
          mood: 'thoughtful',
          weather: 'rainy',
        },
        adminUser
      );

      const sunnyList = await service.listJournals({ weather: 'sunny' }, null);
      expect(sunnyList.items.length).toBe(1);
      expect(sunnyList.items[0].title).toBe('晴天开心');

      const thoughtfulList = await service.listJournals({ mood: 'thoughtful' }, null);
      expect(thoughtfulList.items.length).toBe(1);
      expect(thoughtfulList.items[0].title).toBe('雨天沉思');
    });
  });
});
