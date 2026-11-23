import { z } from 'zod';
import { VisibilitySchema, type Visibility } from './entry.js';

export const MediaTypeSchema = z.enum(['image', 'video', 'audio', 'document']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const UploadStatusSchema = z.enum(['pending', 'uploaded', 'failed']);
export type UploadStatus = z.infer<typeof UploadStatusSchema>;

export const MediaRoleSchema = z.enum(['cover', 'gallery', 'attachment', 'inline']);
export type MediaRole = z.infer<typeof MediaRoleSchema>;

export const StorageProviderSchema = z.enum(['r2', 'oss', 'cos', 's3', 'minio']);
export type StorageProvider = z.infer<typeof StorageProviderSchema>;

export const ExifMetadataSchema = z
  .object({
    make: z.string().trim().max(100).optional(),
    model: z.string().trim().max(100).optional(),
    dateTime: z.string().trim().max(50).optional(),
    dateTimeOriginal: z.string().trim().max(50).optional(),
    exposureTime: z.string().trim().max(30).optional(),
    fNumber: z.number().positive().optional(),
    iso: z.number().int().positive().optional(),
    focalLength: z.number().positive().optional(),
    orientation: z.number().int().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .optional()
  .nullable();

export type ExifMetadataDto = NonNullable<z.infer<typeof ExifMetadataSchema>>;

/**
 * Media Asset DTO representing physical file stored in object storage
 */
export interface MediaAssetDto {
  id: string;
  ownerId: string;
  storageProvider: StorageProvider;
  bucketKey: string;
  thumbKey: string | null;
  previewKey: string | null;
  mimeType: string;
  mediaType: MediaType;
  sizeBytes: number;
  sha256: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  uploadStatus: UploadStatus;
  visibility: Visibility;
  originalFilename: string | null;
  exif?: ExifMetadataDto | null;
  createdAt: number;
  deletedAt: number | null;
  // Dynamic computed URLs for frontend rendering
  originalUrl?: string;
  thumbUrl?: string;
  previewUrl?: string;
}

/**
 * Relation binding between an Entry and a Media Asset
 */
export interface EntryMediaDto {
  id: string;
  entryId: string;
  mediaId: string;
  role: MediaRole;
  sortOrder: number;
  caption: string | null;
  createdAt: number;
  asset?: MediaAssetDto;
}

/**
 * Request payload when requesting an upload presigned ticket
 */
export const RequestUploadTicketSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive('文件大小必须大于0'),
  mediaType: MediaTypeSchema,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
  sha256: z.string().trim().length(64).optional(),
  visibility: VisibilitySchema.default('public'),
});

export type RequestUploadTicketInput = z.infer<typeof RequestUploadTicketSchema>;

/**
 * Ticket returned to client for direct bucket upload
 */
export interface UploadTicketDto {
  mediaId: string;
  bucketKey: string;
  uploadUrl: string;
  headers?: Record<string, string>;
  expiresInSeconds: number;
  maxSizeBytes: number;
}

/**
 * Media Collection DTO (M3-1)
 * Curated photo album / travel roll grouping media assets.
 */
export interface MediaCollectionDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverMediaId: string | null;
  coverUrl?: string | null;
  coverThumbUrl?: string | null;
  occurredRange: string | null;
  visibility: Visibility;
  mediaCount?: number;
  createdAt: number;
  updatedAt: number;
}

export type MediaCollection = MediaCollectionDto;

export interface MediaCollectionItemDto {
  collectionId: string;
  mediaAssetId: string;
  sortOrder: number;
  addedAt: number;
}

export interface CollectionMediaAssetDto extends MediaAssetDto {
  sortOrder: number;
  addedAt: number;
  commentCount: number;
}

export interface MediaCollectionDetailDto {
  collection: MediaCollectionDto;
  items: CollectionMediaAssetDto[];
}

export const CreateMediaCollectionInputSchema = z.object({
  slug: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1, '合集标题不能为空').max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  coverMediaId: z.string().trim().min(1).optional().nullable(),
  occurredRange: z.string().trim().max(100).optional().nullable(),
  visibility: VisibilitySchema.default('public'),
});

export type CreateMediaCollectionInput = z.infer<typeof CreateMediaCollectionInputSchema>;

export const UpdateMediaCollectionInputSchema = CreateMediaCollectionInputSchema.partial();
export type UpdateMediaCollectionInput = z.infer<typeof UpdateMediaCollectionInputSchema>;

export const BindCollectionMediaItemSchema = z.object({
  mediaAssetId: z.string().trim().min(1, '媒体 ID 不能为空'),
  sortOrder: z.number().int().optional(),
});

export const BindCollectionMediaInputSchema = z.object({
  items: z.array(BindCollectionMediaItemSchema).min(1, '至少绑定一张媒体资产'),
  replace: z.boolean().optional().default(false),
});

export type BindCollectionMediaItemInput = z.infer<typeof BindCollectionMediaItemSchema>;
export type BindCollectionMediaInput = z.infer<typeof BindCollectionMediaInputSchema>;
