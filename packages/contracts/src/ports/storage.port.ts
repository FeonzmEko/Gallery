/**
 * Storage Port interface
 *
 * Provides vendor-agnostic object storage abstraction (Cloudflare R2, AWS S3,
 * Aliyun OSS, Tencent COS, MinIO, or Domestic CDN acceleration gateways).
 */

export interface StorageUploadResult {
  /**
   * Presigned PUT/POST URL for direct browser-to-bucket upload.
   */
  uploadUrl: string;
  /**
   * Final accessible URL (via CDN, proxy worker, or public gateway).
   */
  publicUrl: string;
  /**
   * Storage object key (e.g. "originals/2026/11/018f3a5e.webp").
   */
  key: string;
  /**
   * Required request headers to lock content type and integrity (e.g. Content-Type, Content-Length).
   */
  headers?: Record<string, string>;
  /**
   * Lifetime of the upload signature in seconds.
   */
  expiresInSeconds?: number;
}

export interface StorageObjectMetadata {
  sizeBytes: number;
  contentType: string;
  etag?: string;
  lastModified?: number;
}

export interface StoragePort {
  /**
   * Generate a presigned direct upload URL.
   *
   * @param key Target object key in storage
   * @param contentType MIME type of the file
   * @param maxSizeBytes Maximum file size allowed
   */
  generateUploadUrl(
    key: string,
    contentType: string,
    maxSizeBytes: number
  ): Promise<StorageUploadResult>;

  /**
   * Generate a presigned download URL for private or temporary access.
   *
   * @param key Object key in storage
   * @param expiresInSeconds Duration in seconds for URL validity (e.g. 900 for 15 mins)
   */
  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Permanently delete an object from storage.
   *
   * @param key Object key in storage
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Check existence and fetch metadata of an object without downloading body.
   */
  headObject?(key: string): Promise<StorageObjectMetadata | null>;
}
