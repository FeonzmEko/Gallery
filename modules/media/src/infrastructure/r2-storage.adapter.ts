import { AwsClient } from 'aws4fetch';
import type {
  StoragePort,
  StorageUploadResult,
  StorageObjectMetadata,
} from '@archive/contracts';

export interface R2StorageConfig {
  /**
   * Cloudflare Account ID (used to construct https://<accountId>.r2.cloudflarestorage.com if endpoint is not given)
   */
  accountId?: string;
  /**
   * S3 / R2 Access Key ID
   */
  accessKeyId: string;
  /**
   * S3 / R2 Secret Access Key
   */
  secretAccessKey: string;
  /**
   * Bucket name
   */
  bucketName: string;
  /**
   * Custom S3 endpoint URL.
   * If not provided, constructed as `https://${accountId}.r2.cloudflarestorage.com`.
   */
  endpoint?: string;
  /**
   * Region for S3 client. Defaults to 'auto' (Cloudflare R2 convention).
   */
  region?: string;
  /**
   * Custom CDN or public domain for accessing media assets
   * (e.g. "https://media.archive.example.com" or domestic CDN like Tencent EdgeOne).
   */
  publicDomain?: string;
  /**
   * Default presigned upload URL lifetime in seconds (default: 3600 = 1 hour).
   */
  defaultUploadExpiresInSeconds?: number;
  /**
   * Default presigned download URL lifetime in seconds (default: 900 = 15 minutes).
   */
  defaultDownloadExpiresInSeconds?: number;
}

/**
 * Lightweight S3 / Cloudflare R2 Storage Adapter implementing StoragePort.
 *
 * Uses `aws4fetch` for AWS SigV4 request and query string signing,
 * with zero Node.js native binary dependencies, making it 100% compatible
 * with Cloudflare Workers, Node.js, and Edge runtimes.
 */
export class R2StorageAdapter implements StoragePort {
  private readonly client: AwsClient;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly publicDomain?: string;
  private readonly defaultUploadExpires: number;
  private readonly defaultDownloadExpires: number;

  constructor(config: R2StorageConfig) {
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error('R2StorageAdapter requires accessKeyId and secretAccessKey');
    }
    if (!config.bucketName) {
      throw new Error('R2StorageAdapter requires bucketName');
    }

    this.bucketName = config.bucketName;
    this.region = config.region ?? 'auto';

    if (config.endpoint) {
      this.endpoint = config.endpoint.replace(/\/+$/, '');
    } else if (config.accountId) {
      this.endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
    } else {
      throw new Error('R2StorageAdapter requires either endpoint or accountId');
    }

    if (config.publicDomain) {
      this.publicDomain = config.publicDomain.replace(/\/+$/, '');
    }

    this.defaultUploadExpires = config.defaultUploadExpiresInSeconds ?? 3600;
    this.defaultDownloadExpires = config.defaultDownloadExpiresInSeconds ?? 900;

    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: this.region,
      service: 's3',
    });
  }

  readonly region: string;

  /**
   * Helper to build full S3 REST object URL.
   * Supports both path-style and virtual-hosted-style endpoints.
   */
  private getObjectUrl(key: string): URL {
    const cleanKey = key.replace(/^\/+/, '');
    const url = new URL(this.endpoint);
    if (
      url.hostname.startsWith(`${this.bucketName}.`) ||
      url.pathname === `/${this.bucketName}` ||
      url.pathname.endsWith(`/${this.bucketName}`)
    ) {
      return new URL(`${this.endpoint}/${cleanKey}`);
    }
    return new URL(`${this.endpoint}/${this.bucketName}/${cleanKey}`);
  }

  /**
   * Format the final public URL through CDN or direct bucket gateway.
   */
  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    if (this.publicDomain) {
      return `${this.publicDomain}/${cleanKey}`;
    }
    const url = new URL(this.endpoint);
    if (
      url.hostname.startsWith(`${this.bucketName}.`) ||
      url.pathname === `/${this.bucketName}` ||
      url.pathname.endsWith(`/${this.bucketName}`)
    ) {
      return `${this.endpoint}/${cleanKey}`;
    }
    return `${this.endpoint}/${this.bucketName}/${cleanKey}`;
  }

  /**
   * Generate a presigned direct upload URL (HTTP PUT).
   *
   * Locks Content-Type header in the signature via `allHeaders: true`, ensuring
   * that direct browser uploads cannot alter the MIME type.
   */
  async generateUploadUrl(
    key: string,
    contentType: string,
    maxSizeBytes: number
  ): Promise<StorageUploadResult> {
    if (!key || key.trim() === '') {
      throw new Error('Storage key cannot be empty');
    }
    if (!contentType || contentType.trim() === '') {
      throw new Error('Content-Type cannot be empty');
    }
    if (maxSizeBytes <= 0) {
      throw new Error(`maxSizeBytes must be positive, got ${maxSizeBytes}`);
    }

    const cleanKey = key.replace(/^\/+/, '');
    const url = this.getObjectUrl(cleanKey);
    const expiresInSeconds = this.defaultUploadExpires;

    // Set expiration in query parameters
    url.searchParams.set('X-Amz-Expires', expiresInSeconds.toString());

    // Sign the PUT request with Content-Type header locked
    const signedRequest = await this.client.sign(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      aws: {
        signQuery: true,
        allHeaders: true,
      },
    });

    return {
      uploadUrl: signedRequest.url,
      publicUrl: this.getPublicUrl(cleanKey),
      key: cleanKey,
      headers: {
        'Content-Type': contentType,
      },
      expiresInSeconds,
    };
  }

  /**
   * Generate a presigned download URL for private or temporary access.
   */
  async getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string> {
    if (!key || key.trim() === '') {
      throw new Error('Storage key cannot be empty');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const url = this.getObjectUrl(cleanKey);
    const expires = expiresInSeconds ?? this.defaultDownloadExpires;

    url.searchParams.set('X-Amz-Expires', expires.toString());

    const signedRequest = await this.client.sign(url, {
      method: 'GET',
      aws: {
        signQuery: true,
      },
    });

    return signedRequest.url;
  }

  /**
   * Permanently delete an object from storage.
   */
  async deleteObject(key: string): Promise<void> {
    if (!key || key.trim() === '') {
      throw new Error('Storage key cannot be empty');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const url = this.getObjectUrl(cleanKey);

    const response = await this.client.fetch(url, {
      method: 'DELETE',
    });

    // S3/R2 returns 204 No Content on successful deletion.
    // 404 is also treated as success for idempotent delete.
    if (!response.ok && response.status !== 404 && response.status !== 204) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to delete object "${cleanKey}" from storage: ${response.status} ${response.statusText} ${errorText}`
      );
    }
  }

  /**
   * Check existence and fetch metadata of an object without downloading its body.
   */
  async headObject(key: string): Promise<StorageObjectMetadata | null> {
    if (!key || key.trim() === '') {
      throw new Error('Storage key cannot be empty');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const url = this.getObjectUrl(cleanKey);

    const response = await this.client.fetch(url, {
      method: 'HEAD',
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to head object "${cleanKey}" from storage: ${response.status} ${response.statusText} ${errorText}`
      );
    }

    const sizeHeader = response.headers.get('content-length');
    const sizeBytes = sizeHeader ? parseInt(sizeHeader, 10) : 0;
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const etagRaw = response.headers.get('etag');
    const etag = etagRaw ? etagRaw.replace(/^"|"$/g, '') : undefined;
    const lastModifiedHeader = response.headers.get('last-modified');
    const lastModified = lastModifiedHeader ? Date.parse(lastModifiedHeader) : undefined;

    return {
      sizeBytes,
      contentType,
      etag,
      lastModified,
    };
  }
}
