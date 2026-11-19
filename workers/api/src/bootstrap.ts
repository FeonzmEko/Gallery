import { createDb, type ArchiveDb } from '@archive/database';
import { AuthService, EntryService, TagService, RelationService } from '@archive/module-core';
import { MediaService, R2StorageAdapter } from '@archive/module-media';
import { JournalService } from '@archive/module-journal';
import { TravelService } from '@archive/module-travel';
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
  journal: JournalService;
  travel: TravelService;
  comment: CommentService;
  jwtSecret: string;
}

/**
 * Sign a storage key + method + expiration using HMAC-SHA256.
 * Used by WorkerR2BindingAdapter so browser PUT/GET requests to `/api/v1/media/blob/...`
 * work securely with Cloudflare's native R2 bucket binding (`MEDIA_BUCKET`) even without S3 keys.
 */
export async function signStorageOperation(
  secret: string,
  method: 'PUT' | 'GET',
  key: string,
  expiresAtSec: number
): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    enc.encode(`${method}:${key}:${expiresAtSec}`)
  );
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyStorageOperation(
  secret: string,
  method: 'PUT' | 'GET',
  key: string,
  expiresAtSec: number,
  signature: string
): Promise<boolean> {
  if (!signature || !Number.isFinite(expiresAtSec)) return false;
  if (Math.floor(Date.now() / 1000) > expiresAtSec) return false;
  const expected = await signStorageOperation(secret, method, key, expiresAtSec);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob | null,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<{
    body: unknown;
    httpEtag?: string;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete(keys: string | string[]): Promise<void>;
}

/**
 * Storage adapter backed directly by Cloudflare Worker's native `MEDIA_BUCKET` R2 binding.
 * Enables real media upload & serving in both `wrangler dev` local Miniflare and deployed Workers
 * without requiring separate S3 API credentials.
 */
class WorkerR2BindingAdapter implements StoragePort {
  constructor(
    private readonly bucket: R2BucketLike,
    private readonly signingSecret: string
  ) {}

  private buildBlobPath(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    const encoded = cleanKey
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    return `/api/v1/media/blob/${encoded}`;
  }

  async generateUploadUrl(
    key: string,
    contentType: string,
    _maxSizeBytes: number
  ): Promise<StorageUploadResult> {
    const cleanKey = key.replace(/^\/+/, '');
    const expiresInSeconds = 3600;
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = await signStorageOperation(this.signingSecret, 'PUT', cleanKey, exp);
    const basePath = this.buildBlobPath(cleanKey);

    return {
      uploadUrl: `${basePath}?exp=${exp}&sig=${sig}`,
      publicUrl: basePath,
      key: cleanKey,
      headers: {
        'Content-Type': contentType,
      },
      expiresInSeconds,
    };
  }

  async getDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const cleanKey = key.replace(/^\/+/, '');
    const basePath = this.buildBlobPath(cleanKey);
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = await signStorageOperation(this.signingSecret, 'GET', cleanKey, exp);
    return `${basePath}?exp=${exp}&sig=${sig}`;
  }

  async deleteObject(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, '');
    await this.bucket.delete(cleanKey);
  }
}

/**
 * Fallback in-memory/mock storage port used only when neither R2 S3 credentials
 * nor `MEDIA_BUCKET` binding are available (e.g. unit tests without customStorage).
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
  const jwtSecret = env.JWT_SECRET || 'personal-archive-default-secret-key-2026';

  // Initialize StoragePort: custom (tests) -> S3/R2 signed -> Native Worker R2 binding -> Fallback
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
  } else if (env.MEDIA_BUCKET) {
    storage = new WorkerR2BindingAdapter(env.MEDIA_BUCKET as unknown as R2BucketLike, jwtSecret);
  } else {
    storage = new FallbackStorageAdapter(env.R2_PUBLIC_DOMAIN);
  }

  const auth = new AuthService(db, { jwtSecret });
  const tag = new TagService(db);
  const relation = new RelationService(db);
  const media = new MediaService(db, storage, {
    publicBaseUrl: customStorage ? undefined : env.R2_PUBLIC_DOMAIN,
  });
  const entry = new EntryService(db, tag, (mediaIds, user) =>
    media.resolveMediaUrls(mediaIds, user)
  );
  const journal = new JournalService(db);
  const travel = new TravelService(db);
  const comment = new CommentService(db);

  return {
    db,
    storage,
    auth,
    entry,
    tag,
    relation,
    media,
    journal,
    travel,
    comment,
    jwtSecret,
  };
}
