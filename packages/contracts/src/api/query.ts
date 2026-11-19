import { z } from 'zod';

/**
 * Standard Query Parameters for list and timeline filtering
 */

export const CursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPaginationQuery = z.infer<typeof CursorPaginationQuerySchema>;

export const TimelineFilterQuerySchema = CursorPaginationQuerySchema.extend({
  type: z.string().optional(),
  tag: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  keyword: z.string().trim().optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).optional(),
  status: z.enum(['published', 'draft', 'archived']).optional(),
});

export type TimelineFilterQuery = z.infer<typeof TimelineFilterQuerySchema>;
