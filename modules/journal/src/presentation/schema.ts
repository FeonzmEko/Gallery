import { z } from 'zod';
import { VisibilitySchema, EntryStatusSchema } from '@archive/contracts';
import { MoodSchema } from '../domain/mood.js';
import { WeatherSchema } from '../domain/weather.js';

export const CreateJournalInputSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1).max(100).optional().nullable(),
  title: z.string().trim().min(1, '标题不能为空').max(200),
  summary: z.string().trim().max(1000).optional().nullable(),
  contentMarkdown: z.string().min(1, '日记正文不能为空'),
  occurredAt: z.number().int().positive('发生时间戳必须为合法正整数'),
  mood: MoodSchema.optional().nullable(),
  weather: WeatherSchema.optional().nullable(),
  visibility: VisibilitySchema.default('public'),
  status: EntryStatusSchema.default('published'),
  coverMediaId: z.string().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).optional(),
});

export type CreateJournalInputValidated = z.infer<typeof CreateJournalInputSchema>;

export const UpdateJournalInputSchema = CreateJournalInputSchema.partial().omit({ id: true });

export type UpdateJournalInputValidated = z.infer<typeof UpdateJournalInputSchema>;
