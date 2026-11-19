import { describe, it, expect, vi } from 'vitest';
import { R2StorageAdapter } from '../src/infrastructure/r2-storage.adapter.js';

describe('R2StorageAdapter', () => {
  const baseConfig = {
    accountId: 'acc1234567890abcdef',
    accessKeyId: 'test_access_key',
    secretAccessKey: 'test_secret_key_very_secret_12345',
    bucketName: 'archive-media-test',
    publicDomain: 'https://media.myarchive.com',
  };

  describe('Configuration & Initialization', () => {
    it('should initialize with accountId and construct default R2 endpoint', () => {
      const adapter = new R2StorageAdapter(baseConfig);
      expect(adapter).toBeDefined();
      expect(adapter.getPublicUrl('test.webp')).toBe('https://media.myarchive.com/test.webp');
    });

    it('should initialize with custom endpoint (e.g. Aliyun OSS / Tencent COS / MinIO)', () => {
      const adapter = new R2StorageAdapter({
        accessKeyId: 'testKey',
        secretAccessKey: 'testSecret',
        bucketName: 'oss-bucket',
        endpoint: 'https://oss-cn-beijing.aliyuncs.com',
        region: 'cn-beijing',
      });
      expect(adapter).toBeDefined();
      expect(adapter.region).toBe('cn-beijing');
      expect(adapter.getPublicUrl('folder/img.jpg')).toBe(
        'https://oss-cn-beijing.aliyuncs.com/oss-bucket/folder/img.jpg'
      );
    });

    it('should throw if access keys or bucketName are missing', () => {
      expect(() => new R2StorageAdapter({ ...baseConfig, accessKeyId: '' })).toThrow(
        /requires accessKeyId/
      );
      expect(() => new R2StorageAdapter({ ...baseConfig, secretAccessKey: '' })).toThrow(
        /requires accessKeyId/
      );
      expect(() => new R2StorageAdapter({ ...baseConfig, bucketName: '' })).toThrow(
        /requires bucketName/
      );
      expect(
        () =>
          new R2StorageAdapter({
            accessKeyId: 'k',
            secretAccessKey: 's',
            bucketName: 'b',
          })
      ).toThrow(/requires either endpoint or accountId/);
    });
  });

  describe('generateUploadUrl', () => {
    it('should validate arguments', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      await expect(adapter.generateUploadUrl('', 'image/jpeg', 1000)).rejects.toThrow(
        /key cannot be empty/
      );
      await expect(adapter.generateUploadUrl('key.jpg', '', 1000)).rejects.toThrow(
        /Content-Type cannot be empty/
      );
      await expect(adapter.generateUploadUrl('key.jpg', 'image/jpeg', 0)).rejects.toThrow(
        /maxSizeBytes must be positive/
      );
    });

    it('should generate presigned PUT URL and lock Content-Type in signed headers', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const key = 'originals/2026/11/photo-001.webp';
      const contentType = 'image/webp';
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB

      const result = await adapter.generateUploadUrl(key, contentType, maxSizeBytes);

      expect(result.key).toBe(key);
      expect(result.publicUrl).toBe(`https://media.myarchive.com/${key}`);
      expect(result.headers).toEqual({ 'Content-Type': contentType });
      expect(result.expiresInSeconds).toBe(3600);

      const parsedUrl = new URL(result.uploadUrl);
      expect(parsedUrl.hostname).toBe('acc1234567890abcdef.r2.cloudflarestorage.com');
      expect(parsedUrl.pathname).toBe(`/archive-media-test/${key}`);

      // SigV4 parameters
      expect(parsedUrl.searchParams.get('X-Amz-Expires')).toBe('3600');
      expect(parsedUrl.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
      expect(parsedUrl.searchParams.has('X-Amz-Credential')).toBe(true);
      expect(parsedUrl.searchParams.has('X-Amz-Date')).toBe(true);
      expect(parsedUrl.searchParams.has('X-Amz-Signature')).toBe(true);

      // Verify that Content-Type is locked in SignedHeaders
      const signedHeaders = parsedUrl.searchParams.get('X-Amz-SignedHeaders');
      expect(signedHeaders).toContain('content-type');
      expect(signedHeaders).toContain('host');
    });

    it('should trim leading slashes from keys', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const result = await adapter.generateUploadUrl('///test/file.png', 'image/png', 5000);
      expect(result.key).toBe('test/file.png');
      expect(result.publicUrl).toBe('https://media.myarchive.com/test/file.png');
    });
  });

  describe('getDownloadUrl', () => {
    it('should validate key', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      await expect(adapter.getDownloadUrl('')).rejects.toThrow(/key cannot be empty/);
    });

    it('should generate presigned GET URL with custom expiration', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const key = 'private/notes/doc.pdf';
      const downloadUrl = await adapter.getDownloadUrl(key, 600);

      const parsed = new URL(downloadUrl);
      expect(parsed.pathname).toBe(`/archive-media-test/${key}`);
      expect(parsed.searchParams.get('X-Amz-Expires')).toBe('600');
      expect(parsed.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
      expect(parsed.searchParams.has('X-Amz-Signature')).toBe(true);
    });
  });

  describe('deleteObject', () => {
    it('should issue DELETE request and handle success (204/200/404)', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });
      (adapter as any).client.fetch = mockFetch;

      await expect(adapter.deleteObject('to-delete.jpg')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/archive-media-test/to-delete.jpg',
        }),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should treat 404 as successful idempotent deletion', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      (adapter as any).client.fetch = mockFetch;

      await expect(adapter.deleteObject('non-existing.jpg')).resolves.toBeUndefined();
    });

    it('should throw on unexpected HTTP failure', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: vi.fn().mockResolvedValue('Access Denied'),
      });
      (adapter as any).client.fetch = mockFetch;

      await expect(adapter.deleteObject('forbidden.jpg')).rejects.toThrow(
        /Failed to delete object/
      );
    });
  });

  describe('headObject', () => {
    it('should return null if object is not found (404)', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      (adapter as any).client.fetch = mockFetch;

      const meta = await adapter.headObject('missing.png');
      expect(meta).toBeNull();
    });

    it('should parse metadata correctly on 200 OK', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const mockHeaders = new Headers({
        'content-length': '204800',
        'content-type': 'image/webp',
        etag: '"d41d8cd98f00b204e9800998ecf8427e"',
        'last-modified': 'Wed, 19 Nov 2026 12:00:00 GMT',
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
      });
      (adapter as any).client.fetch = mockFetch;

      const meta = await adapter.headObject('existing.webp');
      expect(meta).toEqual({
        sizeBytes: 204800,
        contentType: 'image/webp',
        etag: 'd41d8cd98f00b204e9800998ecf8427e',
        lastModified: Date.parse('Wed, 19 Nov 2026 12:00:00 GMT'),
      });
    });

    it('should throw on error status', async () => {
      const adapter = new R2StorageAdapter(baseConfig);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Error',
        text: vi.fn().mockResolvedValue('Service unavailable'),
      });
      (adapter as any).client.fetch = mockFetch;

      await expect(adapter.headObject('fail.jpg')).rejects.toThrow(
        /Failed to head object/
      );
    });
  });
});
