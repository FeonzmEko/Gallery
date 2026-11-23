import { eq } from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import type {
  AuthUser,
  CuratorProfileDto,
  UpdateCuratorProfileInput,
} from '@archive/contracts';
import { siteSettings } from '../infrastructure/schema.js';
import { assertAdmin } from '../domain/rbac.js';

const CURATOR_PROFILE_KEY = 'curator_profile';

export const DEFAULT_CURATOR_PROFILE: CuratorProfileDto = {
  name: 'Archivist',
  bio: '个人数字档案馆馆主 · 记录胶片光影、旅途足迹与日常手札。',
  statusText: '整理胶片与日常档案中',
  location: null,
  avatarUrl: null,
  recentAnime: [],
  loopPlaylist: [],
  currentlyReading: null,
  updatedAt: 0,
};

export class CuratorService {
  constructor(private readonly db: ArchiveDb) {}

  /**
   * Public read: returns the curator profile persisted in D1, or sensible defaults if unset.
   */
  async getProfile(): Promise<CuratorProfileDto> {
    const rows = await this.db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, CURATOR_PROFILE_KEY))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return { ...DEFAULT_CURATOR_PROFILE };
    }

    try {
      const parsed = JSON.parse(row.valueJson) as Partial<CuratorProfileDto>;
      return {
        ...DEFAULT_CURATOR_PROFILE,
        ...parsed,
        recentAnime: Array.isArray(parsed.recentAnime) ? parsed.recentAnime : [],
        loopPlaylist: Array.isArray(parsed.loopPlaylist) ? parsed.loopPlaylist : [],
        updatedAt: row.updatedAt,
      };
    } catch {
      return { ...DEFAULT_CURATOR_PROFILE };
    }
  }

  /**
   * Admin write: validates and persists curator profile configuration into D1.
   */
  async updateProfile(
    input: UpdateCuratorProfileInput,
    user: AuthUser
  ): Promise<CuratorProfileDto> {
    assertAdmin(user);

    const now = Date.now();
    const profile: CuratorProfileDto = {
      name: input.name.trim(),
      bio: input.bio.trim(),
      statusText: input.statusText.trim(),
      location: input.location?.trim() || null,
      avatarUrl: input.avatarUrl?.trim() || null,
      recentAnime: input.recentAnime ?? [],
      loopPlaylist: input.loopPlaylist ?? [],
      currentlyReading: input.currentlyReading?.trim() || null,
      updatedAt: now,
    };

    const valueJson = JSON.stringify(profile);

    await this.db
      .insert(siteSettings)
      .values({
        key: CURATOR_PROFILE_KEY,
        valueJson,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          valueJson,
          updatedAt: now,
        },
      });

    return profile;
  }
}
