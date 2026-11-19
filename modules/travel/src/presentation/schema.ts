import { z } from 'zod';
import { VisibilitySchema, EntryStatusSchema } from '@archive/contracts';
import { LatitudeSchema, LongitudeSchema } from '../domain/coordinates.js';

export const TripLocationInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, '地点名称不能为空').max(200),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  visitedAt: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type TripLocationInputValidated = z.infer<typeof TripLocationInputSchema>;

export const BatchTripLocationsInputSchema = z.object({
  locations: z.array(TripLocationInputSchema),
});

export const CreateTripInputSchema = z
  .object({
    id: z.string().optional(),
    slug: z.string().trim().min(1).max(100).optional().nullable(),
    title: z.string().trim().min(1, '行程标题不能为空').max(200),
    summary: z.string().trim().max(1000).optional().nullable(),
    startDate: z.number().int().positive('行程开始日期戳不合法'),
    endDate: z.number().int().positive('行程结束日期戳不合法'),
    countryCode: z.string().trim().max(10).optional().nullable(),
    citySummary: z.string().trim().max(200).optional().nullable(),
    visibility: VisibilitySchema.default('public'),
    status: EntryStatusSchema.default('published'),
    coverMediaId: z.string().optional().nullable(),
    tags: z.array(z.string().trim().min(1).max(50)).optional(),
    locations: z.array(TripLocationInputSchema).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: '行程结束时间不能早于开始时间',
    path: ['endDate'],
  });

export type CreateTripInputValidated = z.infer<typeof CreateTripInputSchema>;

export const UpdateTripInputSchema = z
  .object({
    slug: z.string().trim().min(1).max(100).optional().nullable(),
    title: z.string().trim().min(1).max(200).optional(),
    summary: z.string().trim().max(1000).optional().nullable(),
    startDate: z.number().int().positive().optional(),
    endDate: z.number().int().positive().optional(),
    countryCode: z.string().trim().max(10).optional().nullable(),
    citySummary: z.string().trim().max(200).optional().nullable(),
    visibility: VisibilitySchema.optional(),
    status: EntryStatusSchema.optional(),
    coverMediaId: z.string().optional().nullable(),
    tags: z.array(z.string().trim().min(1).max(50)).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: '行程结束时间不能早于开始时间',
      path: ['endDate'],
    }
  );

export type UpdateTripInputValidated = z.infer<typeof UpdateTripInputSchema>;
