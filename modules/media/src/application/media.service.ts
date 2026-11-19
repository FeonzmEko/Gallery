import { eq, and, or, lt, desc, isNull, inArray } from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import {
  type StoragePort,
  type AuthUser,
  type MediaAssetDto,
  type EntryMediaDto,
  type UploadTicketDto,
  type RequestUploadTicketInput,
  type MediaRole,
  type MediaType,
  type StorageProvider,
  type Visibility,
  type PaginatedResult,
  type ExifMetadataDto,
  hasAdminPrivileges,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MediaTypeNotAllowedError,
  FileTooLargeError,
} from '@archive/contracts';
import {
  generateUuidV7,
  encodeCursor,
  decodeCursor,
} from '@archive/shared';
import { mediaAssets, entryMedia, type MediaAssetSelect } from '../infrastructure/schema.js';

export interface ConfirmUploadInput {
  width?: number;
  height?: number;
  durationMs?: number;
  sha256?: string;
  thumbKey?: string;
  previewKey?: string;
  exif?: ExifMetadataDto | null;
}

export interface ListMediaQuery {
  cursor?: string;
  limit?: number;
  mediaType?: MediaType;
  visibility?: Visibility;
}

export interface UpdateMediaInput {
  visibility?: Visibility;
  originalFilename?: string | null;
}

interface MediaCursorPayload {
  createdAt: number;
  id: string;
}

function parseExifJson(raw: string | null | undefined): ExifMetadataDto | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExifMetadataDto;
  } catch {
    return null;
  }
}

export interface BindEntryMediaInput {
  entryId: string;
  mediaId: string;
  role?: MediaRole;
  sortOrder?: number;
  caption?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  // Audios
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  // Documents
  'application/pdf',
  'text/plain',
  'application/zip',
]);

const MAX_ALLOWED_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

function assertAdmin(user?: AuthUser | null): asserts user is AuthUser {
  if (!user) {
    throw new UnauthorizedError('需要管理员身份登录');
  }
  if (!hasAdminPrivileges(user.role)) {
    throw new ForbiddenError('权限不足，仅管理员可执行该操作');
  }
}

export class MediaService {
  private readonly db: ArchiveDb;
  private readonly storagePort: StoragePort;
  private readonly defaultStorageProvider: StorageProvider;

  constructor(
    db: ArchiveDb,
    storagePort: StoragePort,
    options?: { defaultStorageProvider?: StorageProvider }
  ) {
    this.db = db;
    this.storagePort = storagePort;
    this.defaultStorageProvider = options?.defaultStorageProvider ?? 'r2';
  }

  /**
   * Request an upload presigned URL with locked headers. Admin only.
   */
  async requestUploadTicket(
    input: RequestUploadTicketInput,
    user: AuthUser
  ): Promise<UploadTicketDto> {
    assertAdmin(user);

    // Validate MIME type
    const mime = input.contentType.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new MediaTypeNotAllowedError(`不支持该文件类型: ${input.contentType}`);
    }

    // Validate size
    if (input.sizeBytes > MAX_ALLOWED_FILE_SIZE) {
      throw new FileTooLargeError(MAX_ALLOWED_FILE_SIZE);
    }

    const mediaId = generateUuidV7();
    const now = Date.now();
    const date = new Date(now);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');

    // Extract file extension cleanly
    const rawExt = input.filename.includes('.')
      ? input.filename.split('.').pop()?.toLowerCase() ?? 'bin'
      : 'bin';
    const cleanExt = rawExt.replace(/[^a-z0-9]/g, '');

    const bucketKey = `originals/${yyyy}/${mm}/${mediaId}.${cleanExt}`;

    // Call StoragePort to generate presigned upload URL with header locking
    const uploadResult = await this.storagePort.generateUploadUrl(
      bucketKey,
      input.contentType,
      input.sizeBytes
    );

    // Register physical asset as pending in DB
    await this.db.insert(mediaAssets).values({
      id: mediaId,
      ownerId: user.userId,
      storageProvider: this.defaultStorageProvider,
      bucketKey,
      thumbKey: null,
      previewKey: null,
      mimeType: input.contentType,
      mediaType: input.mediaType,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256 ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      durationMs: input.durationMs ?? null,
      uploadStatus: 'pending',
      visibility: input.visibility ?? 'public',
      originalFilename: input.filename,
      createdAt: now,
      deletedAt: null,
    });

    return {
      mediaId,
      bucketKey,
      uploadUrl: uploadResult.uploadUrl,
      headers: uploadResult.headers,
      expiresInSeconds: uploadResult.expiresInSeconds ?? 3600,
      maxSizeBytes: input.sizeBytes,
    };
  }

  /**
   * Confirm upload completion and update metadata.
   */
  async confirmUpload(
    assetId: string,
    metadata?: ConfirmUploadInput,
    user?: AuthUser
  ): Promise<MediaAssetDto> {
    if (user) {
      assertAdmin(user);
    }

    const result = await this.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, assetId), isNull(mediaAssets.deletedAt)))
      .limit(1);

    const asset = result[0];
    if (!asset) {
      throw new NotFoundError('媒体资产不存在', assetId);
    }

    const updatePayload: Partial<typeof mediaAssets.$inferInsert> = {
      uploadStatus: 'uploaded',
    };

    if (metadata?.width !== undefined) updatePayload.width = metadata.width;
    if (metadata?.height !== undefined) updatePayload.height = metadata.height;
    if (metadata?.durationMs !== undefined) updatePayload.durationMs = metadata.durationMs;
    if (metadata?.sha256 !== undefined) updatePayload.sha256 = metadata.sha256;
    if (metadata?.thumbKey !== undefined) updatePayload.thumbKey = metadata.thumbKey;
    if (metadata?.previewKey !== undefined) updatePayload.previewKey = metadata.previewKey;
    if (metadata?.exif !== undefined) {
      updatePayload.exifJson = metadata.exif ? JSON.stringify(metadata.exif) : null;
    }

    await this.db.update(mediaAssets).set(updatePayload).where(eq(mediaAssets.id, assetId));

    return this.getMedia(assetId, user);
  }

  private async mapAssetToDto(asset: MediaAssetSelect): Promise<MediaAssetDto> {
    const expiresIn = asset.visibility === 'private' ? 900 : 3600;
    const originalUrl = await this.storagePort.getDownloadUrl(asset.bucketKey, expiresIn);
    const thumbUrl = asset.thumbKey
      ? await this.storagePort.getDownloadUrl(asset.thumbKey, expiresIn)
      : originalUrl;
    const previewUrl = asset.previewKey
      ? await this.storagePort.getDownloadUrl(asset.previewKey, expiresIn)
      : undefined;

    return {
      id: asset.id,
      ownerId: asset.ownerId,
      storageProvider: asset.storageProvider as StorageProvider,
      bucketKey: asset.bucketKey,
      thumbKey: asset.thumbKey,
      previewKey: asset.previewKey,
      mimeType: asset.mimeType,
      mediaType: asset.mediaType as MediaAssetDto['mediaType'],
      sizeBytes: asset.sizeBytes,
      sha256: asset.sha256,
      width: asset.width,
      height: asset.height,
      durationMs: asset.durationMs,
      uploadStatus: asset.uploadStatus as MediaAssetDto['uploadStatus'],
      visibility: asset.visibility as Visibility,
      originalFilename: asset.originalFilename,
      exif: parseExifJson(asset.exifJson),
      createdAt: asset.createdAt,
      deletedAt: asset.deletedAt,
      originalUrl,
      thumbUrl,
      previewUrl,
    };
  }

  /**
   * List uploaded media assets with cursor pagination and RBAC visibility guard.
   */
  async listMedia(
    query: ListMediaQuery = {},
    user?: AuthUser | null
  ): Promise<PaginatedResult<MediaAssetDto>> {
    const isAdmin = hasAdminPrivileges(user?.role);
    const limit = Math.min(Math.max(query.limit ?? 40, 1), 100);

    const conditions = [
      isNull(mediaAssets.deletedAt),
      eq(mediaAssets.uploadStatus, 'uploaded'),
    ];

    if (!isAdmin) {
      conditions.push(eq(mediaAssets.visibility, 'public'));
    } else if (query.visibility) {
      conditions.push(eq(mediaAssets.visibility, query.visibility));
    }

    if (query.mediaType) {
      conditions.push(eq(mediaAssets.mediaType, query.mediaType));
    }

    if (query.cursor) {
      const decoded = decodeCursor<MediaCursorPayload>(query.cursor);
      if (decoded && typeof decoded.createdAt === 'number' && decoded.id) {
        conditions.push(
          or(
            lt(mediaAssets.createdAt, decoded.createdAt),
            and(
              eq(mediaAssets.createdAt, decoded.createdAt),
              lt(mediaAssets.id, decoded.id)
            )
          )!
        );
      }
    }

    const rows = await this.db
      .select()
      .from(mediaAssets)
      .where(and(...conditions))
      .orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items = await Promise.all(pageRows.map((row) => this.mapAssetToDto(row)));

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      nextCursor = encodeCursor<MediaCursorPayload>({
        createdAt: last.createdAt,
        id: last.id,
      });
    }

    return {
      items,
      pagination: {
        cursor: nextCursor,
        hasMore,
        limit,
      },
    };
  }

  /**
   * Batch resolve media URLs for entry cover hydration.
   */
  async resolveMediaUrls(
    mediaIds: string[],
    user?: AuthUser | null
  ): Promise<Map<string, { originalUrl: string; thumbUrl?: string }>> {
    const map = new Map<string, { originalUrl: string; thumbUrl?: string }>();
    if (mediaIds.length === 0) return map;

    const isAdmin = hasAdminPrivileges(user?.role);
    const rows = await this.db
      .select()
      .from(mediaAssets)
      .where(and(inArray(mediaAssets.id, mediaIds), isNull(mediaAssets.deletedAt)));

    await Promise.all(
      rows.map(async (row) => {
        if (row.visibility === 'private' && !isAdmin) return;
        const expiresIn = row.visibility === 'private' ? 900 : 3600;
        const originalUrl = await this.storagePort.getDownloadUrl(row.bucketKey, expiresIn);
        const thumbUrl = row.thumbKey
          ? await this.storagePort.getDownloadUrl(row.thumbKey, expiresIn)
          : originalUrl;
        map.set(row.id, { originalUrl, thumbUrl });
      })
    );

    return map;
  }

  /**
   * Update media asset metadata / visibility. Admin only.
   */
  async updateMedia(
    id: string,
    input: UpdateMediaInput,
    user: AuthUser
  ): Promise<MediaAssetDto> {
    assertAdmin(user);

    const existing = await this.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, id), isNull(mediaAssets.deletedAt)))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError('媒体资产不存在', id);
    }

    const updates: Partial<typeof mediaAssets.$inferInsert> = {};
    if (input.visibility !== undefined) updates.visibility = input.visibility;
    if (input.originalFilename !== undefined) updates.originalFilename = input.originalFilename;

    if (Object.keys(updates).length > 0) {
      await this.db.update(mediaAssets).set(updates).where(eq(mediaAssets.id, id));
    }

    return this.getMedia(id, user);
  }

  /**
   * Query media asset and generate download/display URLs.
   * Private assets require Admin privileges and return short-lived signed URLs.
   */
  async getMedia(id: string, user?: AuthUser | null): Promise<MediaAssetDto> {
    const result = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);

    const asset = result[0];
    if (!asset || asset.deletedAt !== null) {
      throw new NotFoundError('媒体资产不存在', id);
    }

    const isAdmin = hasAdminPrivileges(user?.role);
    if (asset.visibility === 'private' && !isAdmin) {
      throw new ForbiddenError('无权访问该私有媒体资产');
    }

    return this.mapAssetToDto(asset);
  }

  /**
   * Bind a media asset to an entry. Admin only.
   */
  async bindEntryMedia(
    input: BindEntryMediaInput,
    user?: AuthUser
  ): Promise<EntryMediaDto> {
    if (user) {
      assertAdmin(user);
    }

    // Verify media asset exists
    const assetResult = await this.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, input.mediaId), isNull(mediaAssets.deletedAt)))
      .limit(1);

    if (!assetResult[0]) {
      throw new NotFoundError('媒体资产不存在', input.mediaId);
    }

    const id = generateUuidV7();
    const now = Date.now();
    const role: MediaRole = input.role ?? 'gallery';
    const sortOrder = input.sortOrder ?? 0;

    await this.db.insert(entryMedia).values({
      id,
      entryId: input.entryId,
      mediaId: input.mediaId,
      role,
      sortOrder,
      caption: input.caption ?? null,
      createdAt: now,
    });

    return {
      id,
      entryId: input.entryId,
      mediaId: input.mediaId,
      role,
      sortOrder,
      caption: input.caption ?? null,
      createdAt: now,
    };
  }

  /**
   * List media assets bound to an entry.
   */
  async listEntryMedia(entryId: string, user?: AuthUser | null): Promise<EntryMediaDto[]> {
    const isAdmin = hasAdminPrivileges(user?.role);

    const rows = await this.db
      .select({
        id: entryMedia.id,
        entryId: entryMedia.entryId,
        mediaId: entryMedia.mediaId,
        role: entryMedia.role,
        sortOrder: entryMedia.sortOrder,
        caption: entryMedia.caption,
        createdAt: entryMedia.createdAt,
        asset: mediaAssets,
      })
      .from(entryMedia)
      .innerJoin(mediaAssets, eq(entryMedia.mediaId, mediaAssets.id))
      .where(and(eq(entryMedia.entryId, entryId), isNull(mediaAssets.deletedAt)))
      .orderBy(entryMedia.sortOrder);

    const results: EntryMediaDto[] = [];
    for (const row of rows) {
      if (row.asset.visibility === 'private' && !isAdmin) {
        continue; // Skip private media for guests
      }

      const expiresIn = row.asset.visibility === 'private' ? 900 : 3600;
      const originalUrl = await this.storagePort.getDownloadUrl(row.asset.bucketKey, expiresIn);
      const thumbUrl = row.asset.thumbKey
        ? await this.storagePort.getDownloadUrl(row.asset.thumbKey, expiresIn)
        : originalUrl;

      results.push({
        id: row.id,
        entryId: row.entryId,
        mediaId: row.mediaId,
        role: row.role as MediaRole,
        sortOrder: row.sortOrder,
        caption: row.caption,
        createdAt: row.createdAt,
        asset: {
          id: row.asset.id,
          ownerId: row.asset.ownerId,
          storageProvider: row.asset.storageProvider as StorageProvider,
          bucketKey: row.asset.bucketKey,
          thumbKey: row.asset.thumbKey,
          previewKey: row.asset.previewKey,
          mimeType: row.asset.mimeType,
          mediaType: row.asset.mediaType as MediaAssetDto['mediaType'],
          sizeBytes: row.asset.sizeBytes,
          sha256: row.asset.sha256,
          width: row.asset.width,
          height: row.asset.height,
          durationMs: row.asset.durationMs,
          uploadStatus: row.asset.uploadStatus as MediaAssetDto['uploadStatus'],
          visibility: row.asset.visibility as Visibility,
          originalFilename: row.asset.originalFilename,
          exif: parseExifJson(row.asset.exifJson),
          createdAt: row.asset.createdAt,
          deletedAt: row.asset.deletedAt,
          originalUrl,
          thumbUrl,
        },
      });
    }

    return results;
  }

  /**
   * Delete a media asset (soft or hard). Admin only.
   */
  async deleteMedia(id: string, user: AuthUser, soft: boolean = true): Promise<void> {
    assertAdmin(user);

    const result = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);

    const asset = result[0];
    if (!asset) {
      throw new NotFoundError('媒体资产不存在', id);
    }

    if (soft) {
      await this.db
        .update(mediaAssets)
        .set({ deletedAt: Date.now() })
        .where(eq(mediaAssets.id, id));
    } else {
      await this.storagePort.deleteObject(asset.bucketKey);
      if (asset.thumbKey) await this.storagePort.deleteObject(asset.thumbKey);
      if (asset.previewKey) await this.storagePort.deleteObject(asset.previewKey);
      await this.db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    }
  }
}
