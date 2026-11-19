import { z } from 'zod';

export const StandardRelationTypes = [
  'soundtrack',
  'inspired_by',
  'part_of',
  'related',
] as const;

export type RelationType =
  | (typeof StandardRelationTypes)[number]
  | (string & {});

export const RelationTypeSchema = z.string().min(1).max(50);

export interface EntryRelationDto {
  id: string;
  sourceEntryId: string;
  targetEntryId: string;
  relationType: RelationType;
  note: string | null;
  createdAt: number;
}

export const CreateRelationSchema = z.object({
  sourceEntryId: z.string().min(1),
  targetEntryId: z.string().min(1),
  relationType: RelationTypeSchema,
  note: z.string().trim().max(255).optional().nullable(),
});

export type CreateRelationInput = z.infer<typeof CreateRelationSchema>;
