import { createDb, type ArchiveDb } from '@archive/database';
import { AuthService, EntryService, TagService, RelationService } from '@archive/module-core';
import { MediaService, R2StorageAdapter } from '@archive/module-media';
import { CommentService } from '@archive/module-comment';
import type { StoragePort, StorageUploadResult } from '@archive/contracts';
import type { Env } from './env.js';

export interface AppServices {
  db: ArchiveDb;
  storage: StoragePort;
  auth: AuthService;
  entry: EntryService;
  tag: TagService;
  relation: RelationService;
  media: MediaService;
  comment: CommentService;
}

/**
 * Fallback in-memory/mock storage port used when R2 S3 credentials are not configured
 * (e.g. during local offline development or unit tests).
 */
class FallbackStorageAdapter implements StoragePort {
  private readonly publicDomain: string;

  constructor(publicDomain: string = 'https://media.archive.internal') {
    this.publicDomain = publicDomain.replace(/\/+$/, '');
  }

  async generateUploadUrl(
    key: string,
    contentType: string,
    _maxSizeBytes: number
  ): Promise<StorageUploadResult> {
    return {
      uploadUrl: `${this.publicDomain}/${key}?mock-signed=true`,
      publicUrl: `${this.publicDomain}/${key}`,
      key,
      headers: {
        'content-type': contentType,
      },
      expiresInSeconds: 3600,
    };
  }

  async getDownloadUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    return `${this.publicDomain}/${key}`;
  }

  async deleteObject(_key: string): Promise<void> {
    // No-op for mock storage
  }
}

/**
 * Bootstrap and assemble application dependencies (Composition Root).
 */
export function bootstrapServices(env: Env, customStorage?: StoragePort): AppServices {
  const db = createDb(env.DB);

  // Initialize StoragePort
  let storage: StoragePort;
  if (customStorage) {
    storage = customStorage;
  } else if (
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    (env.R2_BUCKET_NAME || 'personal-archive-media')
  ) {
    storage = new R2StorageAdapter({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucketName: env.R2_BUCKET_NAME || 'personal-archive-media',
      endpoint: env.R2_ENDPOINT,
      region: env.R2_REGION ?? 'auto',
      publicDomain: env.R2_PUBLIC_DOMAIN,
    });
  } else {
    storage = new FallbackStorageAdapter(env.R2_PUBLIC_DOMAIN);
  }

  const jwtSecret = env.JWT_SECRET || 'personal-archive-default-secret-key-2026';

  const auth = new AuthService(db, { jwtSecret });
  const tag = new TagService(db);
  const relation = new RelationService(db);
  const entry = new EntryService(db, tag);
  const media = new MediaService(db, storage);
  const comment = new CommentService(db);

  return {
    db,
    storage,
    auth,
    entry,
    tag,
    relation,
    media,
    comment,
  };
}
