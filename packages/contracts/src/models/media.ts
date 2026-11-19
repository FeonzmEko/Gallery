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
