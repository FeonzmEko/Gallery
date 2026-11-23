import { eq, and, or, ne, asc, desc, isNull, inArray } from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import {
  type AuthUser,
  type MediaCollectionDto,
  type CollectionMediaAssetDto,
  type MediaCollectionDetailDto,
  type CreateMediaCollectionInput,
  type BindCollectionMediaInput,
  type Visibility,
  hasAdminPrivileges,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '@archive/contracts';
import { generateUuidV7, slugify } from '@archive/shared';
import {
  mediaAssets,
  mediaCollections,
  mediaCollectionItems,
  type MediaCollectionSelect,
} from '../infrastructure/schema.js';
import type { MediaService } from './media.service.js';

export type MediaCommentCounter = (mediaAssetIds: string[]) => Promise<Map<string, number>>;

function assertAdmin(user?: AuthUser | null): asserts user is AuthUser {
  if (!user) {
    throw new UnauthorizedError('需要管理员身份登录');
  }
  if (!hasAdminPrivileges(user.role)) {
    throw new ForbiddenError('权限不足，仅管理员可执行该操作');
  }
}

export class MediaCollectionService {
  constructor(
    private readonly db: ArchiveDb,
    private readonly mediaService: MediaService,
    private readonly commentCounter?: MediaCommentCounter
  ) {}

  /**
   * List media collections with mediaCount and coverUrl.
   * Visitors strictly see only `visibility = 'public'`; Admins see all collections.
   */
  async listCollections(user?: AuthUser | null): Promise<MediaCollectionDto[]> {
    const isAdmin = hasAdminPrivileges(user?.role);

    const collections = isAdmin
      ? await this.db
          .select()
          .from(mediaCollections)
          .orderBy(desc(mediaCollections.createdAt))
      : await this.db
          .select()
          .from(mediaCollections)
          .where(eq(mediaCollections.visibility, 'public'))
          .orderBy(desc(mediaCollections.createdAt));

    if (collections.length === 0) {
      return [];
    }

    const collectionIds = collections.map((c) => c.id);
    const itemConditions = [
      inArray(mediaCollectionItems.collectionId, collectionIds),
      isNull(mediaAssets.deletedAt),
    ];
    if (!isAdmin) {
      itemConditions.push(eq(mediaAssets.uploadStatus, 'uploaded'));
      itemConditions.push(ne(mediaAssets.visibility, 'private'));
    }

    const itemRows = await this.db
      .select({
        collectionId: mediaCollectionItems.collectionId,
        mediaAssetId: mediaCollectionItems.mediaAssetId,
        sortOrder: mediaCollectionItems.sortOrder,
        addedAt: mediaCollectionItems.addedAt,
      })
      .from(mediaCollectionItems)
      .innerJoin(mediaAssets, eq(mediaCollectionItems.mediaAssetId, mediaAssets.id))
      .where(and(...itemConditions))
      .orderBy(asc(mediaCollectionItems.sortOrder), asc(mediaCollectionItems.addedAt));

    const countsByCollection = new Map<string, number>();
    const firstMediaByCollection = new Map<string, string>();
    for (const row of itemRows) {
      countsByCollection.set(
        row.collectionId,
        (countsByCollection.get(row.collectionId) ?? 0) + 1
      );
      if (!firstMediaByCollection.has(row.collectionId)) {
        firstMediaByCollection.set(row.collectionId, row.mediaAssetId);
      }
    }

    const coverMediaIds = Array.from(
      new Set(
        collections
          .map((c) => c.coverMediaId ?? firstMediaByCollection.get(c.id))
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    const resolvedUrls = await this.mediaService.resolveMediaUrls(coverMediaIds, user);

    return collections.map((col) => {
      const targetMediaId = col.coverMediaId ?? firstMediaByCollection.get(col.id) ?? null;
      const urls = targetMediaId ? resolvedUrls.get(targetMediaId) : undefined;
      return {
        id: col.id,
        slug: col.slug,
        title: col.title,
        description: col.description,
        coverMediaId: col.coverMediaId,
        coverUrl: urls?.originalUrl ?? null,
        coverThumbUrl: urls?.thumbUrl ?? urls?.originalUrl ?? null,
        occurredRange: col.occurredRange,
        visibility: col.visibility as Visibility,
        mediaCount: countsByCollection.get(col.id) ?? 0,
        createdAt: col.createdAt,
        updatedAt: col.updatedAt,
      };
    });
  }

  /**
   * Fetch a collection and its ordered media stream with width/height, URLs, EXIF, and commentCount.
   * Private collections are accessible only to Admins.
   */
  async getCollectionMedia(
    slugOrId: string,
    user?: AuthUser | null
  ): Promise<MediaCollectionDetailDto> {
    const cleanKey = slugOrId.trim();
    const isAdmin = hasAdminPrivileges(user?.role);

    const rows = await this.db
      .select()
      .from(mediaCollections)
      .where(or(eq(mediaCollections.slug, cleanKey), eq(mediaCollections.id, cleanKey)))
      .limit(1);

    const col = rows[0];
    if (!col) {
      throw new NotFoundError('影像合集不存在', slugOrId);
    }

    if (col.visibility === 'private' && !isAdmin) {
      if (!user) {
        throw new UnauthorizedError('请登录后访问私密合集');
      }
      throw new ForbiddenError('无权访问该私密合集');
    }

    const itemConditions = [
      eq(mediaCollectionItems.collectionId, col.id),
      isNull(mediaAssets.deletedAt),
    ];
    if (!isAdmin) {
      itemConditions.push(eq(mediaAssets.uploadStatus, 'uploaded'));
      itemConditions.push(ne(mediaAssets.visibility, 'private'));
    }

    const joined = await this.db
      .select({
        sortOrder: mediaCollectionItems.sortOrder,
        addedAt: mediaCollectionItems.addedAt,
        asset: mediaAssets,
      })
      .from(mediaCollectionItems)
      .innerJoin(mediaAssets, eq(mediaCollectionItems.mediaAssetId, mediaAssets.id))
      .where(and(...itemConditions))
      .orderBy(asc(mediaCollectionItems.sortOrder), asc(mediaCollectionItems.addedAt));

    const mediaIds = joined.map((r) => r.asset.id);
    const commentCounts =
      this.commentCounter && mediaIds.length > 0
        ? await this.commentCounter(mediaIds)
        : new Map<string, number>();

    const items: CollectionMediaAssetDto[] = await Promise.all(
      joined.map(async (row) => {
        const assetDto = await this.mediaService.mapAssetToDto(row.asset);
        return {
          ...assetDto,
          sortOrder: row.sortOrder,
          addedAt: row.addedAt,
          commentCount: commentCounts.get(row.asset.id) ?? 0,
        };
      })
    );

    const collectionDto = await this.buildCollectionDto(col, items, user);

    return {
      collection: collectionDto,
      items,
    };
  }

  /**
   * Create a new Media Collection. Admin only.
   */
  async createCollection(
    input: CreateMediaCollectionInput,
    user: AuthUser
  ): Promise<MediaCollectionDto> {
    assertAdmin(user);

    const id = generateUuidV7();
    const now = Date.now();
    const title = input.title.trim();

    let slug: string;
    if (input.slug && input.slug.trim()) {
      slug = input.slug.trim().toLowerCase();
      const existing = await this.db
        .select({ id: mediaCollections.id })
        .from(mediaCollections)
        .where(eq(mediaCollections.slug, slug))
        .limit(1);
      if (existing[0]) {
        throw new ConflictError(`合集标识 '${slug}' 已存在`);
      }
    } else {
      const baseSlug = slugify(title) || `collection-${id.slice(-6)}`;
      const existing = await this.db
        .select({ id: mediaCollections.id })
        .from(mediaCollections)
        .where(eq(mediaCollections.slug, baseSlug))
        .limit(1);
      slug = existing[0] ? `${baseSlug}-${id.slice(-6)}` : baseSlug;
    }

    const coverMediaId = input.coverMediaId?.trim() || null;
    if (coverMediaId) {
      const asset = await this.db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(and(eq(mediaAssets.id, coverMediaId), isNull(mediaAssets.deletedAt)))
        .limit(1);
      if (!asset[0]) {
        throw new NotFoundError('封面媒体资产不存在', coverMediaId);
      }
    }

    const visibility = input.visibility ?? 'public';

    await this.db.insert(mediaCollections).values({
      id,
      slug,
      title,
      description: input.description?.trim() || null,
      coverMediaId,
      occurredRange: input.occurredRange?.trim() || null,
      visibility,
      createdAt: now,
      updatedAt: now,
    });

    let coverUrl: string | null = null;
    let coverThumbUrl: string | null = null;
    if (coverMediaId) {
      const resolved = await this.mediaService.resolveMediaUrls([coverMediaId], user);
      const urls = resolved.get(coverMediaId);
      if (urls) {
        coverUrl = urls.originalUrl;
        coverThumbUrl = urls.thumbUrl ?? urls.originalUrl;
      }
    }

    return {
      id,
      slug,
      title,
      description: input.description?.trim() || null,
      coverMediaId,
      coverUrl,
      coverThumbUrl,
      occurredRange: input.occurredRange?.trim() || null,
      visibility,
      mediaCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Batch bind and sort media assets inside a collection. Admin only.
   */
  async bindCollectionMedia(
    collectionIdOrSlug: string,
    input: BindCollectionMediaInput,
    user: AuthUser
  ): Promise<MediaCollectionDetailDto> {
    assertAdmin(user);

    const cleanKey = collectionIdOrSlug.trim();
    const colRows = await this.db
      .select()
      .from(mediaCollections)
      .where(or(eq(mediaCollections.id, cleanKey), eq(mediaCollections.slug, cleanKey)))
      .limit(1);

    const col = colRows[0];
    if (!col) {
      throw new NotFoundError('影像合集不存在', collectionIdOrSlug);
    }

    // Deduplicate items while keeping the last specified sortOrder
    const deduped = new Map<string, number>();
    input.items.forEach((item, index) => {
      deduped.set(item.mediaAssetId.trim(), item.sortOrder ?? index);
    });

    const targetIds = Array.from(deduped.keys());
    const foundAssets = await this.db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(and(inArray(mediaAssets.id, targetIds), isNull(mediaAssets.deletedAt)));

    const foundSet = new Set(foundAssets.map((a) => a.id));
    for (const id of targetIds) {
      if (!foundSet.has(id)) {
        throw new NotFoundError('媒体资产不存在', id);
      }
    }

    const now = Date.now();
    if (input.replace) {
      await this.db
        .delete(mediaCollectionItems)
        .where(eq(mediaCollectionItems.collectionId, col.id));
    }

    for (const [mediaAssetId, sortOrder] of deduped.entries()) {
      await this.db
        .insert(mediaCollectionItems)
        .values({
          collectionId: col.id,
          mediaAssetId,
          sortOrder,
          addedAt: now,
        })
        .onConflictDoUpdate({
          target: [mediaCollectionItems.collectionId, mediaCollectionItems.mediaAssetId],
          set: { sortOrder },
        });
    }

    await this.db
      .update(mediaCollections)
      .set({ updatedAt: now })
      .where(eq(mediaCollections.id, col.id));

    return this.getCollectionMedia(col.id, user);
  }

  /**
   * Public-only lookup for OG / Twitter Card metadata injection (never leaks private collections).
   */
  async getPublicCollectionForOg(slugOrId: string): Promise<{
    title: string;
    description: string | null;
    coverUrl: string | null;
  } | null> {
    const cleanKey = slugOrId.trim();
    const rows = await this.db
      .select()
      .from(mediaCollections)
      .where(
        and(
          or(eq(mediaCollections.slug, cleanKey), eq(mediaCollections.id, cleanKey)),
          eq(mediaCollections.visibility, 'public')
        )
      )
      .limit(1);

    const col = rows[0];
    if (!col) return null;

    let coverId = col.coverMediaId;
    if (!coverId) {
      const firstItem = await this.db
        .select({ mediaAssetId: mediaCollectionItems.mediaAssetId })
        .from(mediaCollectionItems)
        .innerJoin(mediaAssets, eq(mediaCollectionItems.mediaAssetId, mediaAssets.id))
        .where(
          and(
            eq(mediaCollectionItems.collectionId, col.id),
            isNull(mediaAssets.deletedAt),
            eq(mediaAssets.uploadStatus, 'uploaded'),
            ne(mediaAssets.visibility, 'private')
          )
        )
        .orderBy(asc(mediaCollectionItems.sortOrder), asc(mediaCollectionItems.addedAt))
        .limit(1);
      coverId = firstItem[0]?.mediaAssetId ?? null;
    }

    let coverUrl: string | null = null;
    if (coverId) {
      const resolved = await this.mediaService.resolveMediaUrls([coverId], null);
      const urls = resolved.get(coverId);
      coverUrl = urls?.thumbUrl ?? urls?.originalUrl ?? null;
    }

    return {
      title: col.title,
      description: col.description ?? col.occurredRange ?? null,
      coverUrl,
    };
  }

  private async buildCollectionDto(
    col: MediaCollectionSelect,
    items: CollectionMediaAssetDto[],
    user?: AuthUser | null
  ): Promise<MediaCollectionDto> {
    let coverUrl: string | null = null;
    let coverThumbUrl: string | null = null;

    if (col.coverMediaId) {
      const resolved = await this.mediaService.resolveMediaUrls([col.coverMediaId], user);
      const urls = resolved.get(col.coverMediaId);
      if (urls) {
        coverUrl = urls.originalUrl;
        coverThumbUrl = urls.thumbUrl ?? urls.originalUrl;
      }
    } else if (items.length > 0) {
      coverUrl = items[0].originalUrl ?? null;
      coverThumbUrl = items[0].thumbUrl ?? items[0].originalUrl ?? null;
    }

    return {
      id: col.id,
      slug: col.slug,
      title: col.title,
      description: col.description,
      coverMediaId: col.coverMediaId,
      coverUrl,
      coverThumbUrl,
      occurredRange: col.occurredRange,
      visibility: col.visibility as Visibility,
      mediaCount: items.length,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt,
    };
  }
}
