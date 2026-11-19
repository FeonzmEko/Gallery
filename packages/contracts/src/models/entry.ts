import { z } from 'zod';

/**
 * Entry Visibility:
 * - 'public': Default. Freely viewable by all visitors without login.
 * - 'unlisted': Viewable only with exact URL/slug, excluded from public timeline feeds.
 * - 'private': Confidential memory. Strict Admin/Owner only access.
 */
export const VisibilitySchema = z.enum(['public', 'unlisted', 'private']);
export type Visibility = z.infer<typeof VisibilitySchema>;

/**
 * Entry Lifecycle Status:
 * - 'published': Live on archive.
 * - 'draft': Work in progress, admin-only.
 * - 'archived': Historical, excluded from active timeline feeds unless requested.
 */
export const EntryStatusSchema = z.enum(['published', 'draft', 'archived']);
export type EntryStatus = z.infer<typeof EntryStatusSchema>;

/**
 * Registered Entry Types (extensible string union)
 */
export const CoreEntryTypes = [
  'journal',
  'trip',
  'photo',
  'game',
  'anime',
  'playlist',
] as const;

export type EntryType =
  | (typeof CoreEntryTypes)[number]
  | (string & {});

export const EntryTypeSchema = z.string().min(1).max(50);

/**
 * Core Entry Data Transfer Object
 */
export interface EntryDto {
  id: string;
  ownerId: string;
  type: EntryType;
  slug: string | null;
  title: string;
  summary: string | null;
  coverMediaId: string | null;
  occurredAt: number;
  visibility: Visibility;
  status: EntryStatus;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  tags?: string[];
  coverUrl?: string | null;
  coverThumbUrl?: string | null;
  commentCount?: number;
}

/**
 * Schema for creating a new Entry
 */
export const CreateEntryInputSchema = z.object({
  id: z.string().optional(),
  type: EntryTypeSchema,
  slug: z.string().trim().min(1).max(100).optional().nullable(),
  title: z.string().trim().min(1, '标题不能为空').max(200),
  summary: z.string().trim().max(1000).optional().nullable(),
  coverMediaId: z.string().optional().nullable(),
  occurredAt: z.number().int().positive('发生时间必须为合法时间戳'),
  visibility: VisibilitySchema.default('public'),
  status: EntryStatusSchema.default('published'),
  tags: z.array(z.string().trim().min(1).max(50)).optional(),
});

export type CreateEntryInput = z.infer<typeof CreateEntryInputSchema>;

/**
 * Schema for updating an existing Entry
 */
export const UpdateEntryInputSchema = CreateEntryInputSchema.partial().omit({ id: true });
export type UpdateEntryInput = z.infer<typeof UpdateEntryInputSchema>;
