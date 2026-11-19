import { describe, it, expect } from 'vitest';
import type { StoragePort } from '@archive/contracts';
import { R2StorageAdapter } from '../src/infrastructure/r2-storage.adapter.js';

describe('StoragePort Vendor Switching & CDN Mapping (@archive/module-media)', () => {
  const credentials = {
    accessKeyId: 'LTAI5tMockAccessKeyIdAliyun',
    secretAccessKey: 'MockSecretKeyForDirectUploadSignatureTesting12345',
  };

  describe('1. Aliyun OSS S3-Compatible Storage Provider', () => {
    it('should generate valid SigV4 direct PUT upload URL and download URL with virtual-hosted OSS endpoint', async () => {
      const ossEndpoint = 'https://archive.oss-cn-beijing.aliyuncs.com';
      const bucketName = 'archive';
      const cdnDomain = 'https://cdn.example.com';

      const adapter: StoragePort = new R2StorageAdapter({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        bucketName,
        endpoint: ossEndpoint,
        region: 'oss-cn-beijing',
        publicDomain: cdnDomain,
      });

      const key = 'originals/2026/11/aliyun-lake.webp';
      const contentType = 'image/webp';
      const maxSizeBytes = 20 * 1024 * 1024; // 20 MB

      // Generate Presigned Upload Result
      const uploadResult = await adapter.generateUploadUrl(key, contentType, maxSizeBytes);

      // Verify basic fields
      expect(uploadResult.key).toBe(key);
      expect(uploadResult.publicUrl).toBe(`${cdnDomain}/${key}`);
      expect(uploadResult.headers).toEqual({ 'Content-Type': contentType });
      expect(uploadResult.expiresInSeconds).toBe(3600);

      // Verify Presigned Upload URL components
      const uploadUrl = new URL(uploadResult.uploadUrl);
      expect(uploadUrl.protocol).toBe('https:');
      expect(uploadUrl.hostname).toBe('archive.oss-cn-beijing.aliyuncs.com');
      expect(uploadUrl.pathname).toBe(`/${key}`); // No duplicate bucket name

      // Verify SigV4 Query Parameters
      expect(uploadUrl.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
      expect(uploadUrl.searchParams.get('X-Amz-Credential')).toContain(credentials.accessKeyId);
      expect(uploadUrl.searchParams.get('X-Amz-Credential')).toContain('oss-cn-beijing');
      expect(uploadUrl.searchParams.get('X-Amz-Credential')).toContain('/s3/aws4_request');
      expect(uploadUrl.searchParams.get('X-Amz-Expires')).toBe('3600');
      expect(uploadUrl.searchParams.has('X-Amz-Date')).toBe(true);
      expect(uploadUrl.searchParams.has('X-Amz-Signature')).toBe(true);

      const signedHeaders = uploadUrl.searchParams.get('X-Amz-SignedHeaders');
      expect(signedHeaders).toContain('content-type');
      expect(signedHeaders).toContain('host');

      // Verify Presigned Download URL
      const downloadUrlString = await adapter.getDownloadUrl(key, 1800);
      const downloadUrl = new URL(downloadUrlString);
      expect(downloadUrl.hostname).toBe('archive.oss-cn-beijing.aliyuncs.com');
      expect(downloadUrl.pathname).toBe(`/${key}`);
      expect(downloadUrl.searchParams.get('X-Amz-Expires')).toBe('1800');
      expect(downloadUrl.searchParams.has('X-Amz-Signature')).toBe(true);
    });

    it('should support path-style Aliyun OSS endpoint without custom CDN', async () => {
      const ossEndpoint = 'https://oss-cn-beijing.aliyuncs.com';
      const bucketName = 'my-gallery-bucket';

      const adapter: StoragePort = new R2StorageAdapter({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        bucketName,
        endpoint: ossEndpoint,
        region: 'oss-cn-beijing',
      });

      const key = 'covers/summer-trip.png';
      const uploadResult = await adapter.generateUploadUrl(key, 'image/png', 5 * 1024 * 1024);

      // Fallback publicUrl points to bucket path-style URL
      expect(uploadResult.publicUrl).toBe(`${ossEndpoint}/${bucketName}/${key}`);
      const uploadUrl = new URL(uploadResult.uploadUrl);
      expect(uploadUrl.hostname).toBe('oss-cn-beijing.aliyuncs.com');
      expect(uploadUrl.pathname).toBe(`/${bucketName}/${key}`);
    });
  });

  describe('2. Tencent Cloud COS S3-Compatible Storage Provider', () => {
    it('should generate valid SigV4 direct upload URL and map CDN domain with virtual-hosted COS endpoint', async () => {
      const cosEndpoint = 'https://archive.cos.ap-shanghai.myqcloud.com';
      const bucketName = 'archive';
      const cdnDomain = 'https://cdn.example.com';

      const adapter: StoragePort = new R2StorageAdapter({
        accessKeyId: 'AKIDMockTencentSecretId12345678',
        secretAccessKey: 'MockTencentSecretKeyVerySecure987654321',
        bucketName,
        endpoint: cosEndpoint,
        region: 'ap-shanghai',
        publicDomain: cdnDomain,
      });

      const key = 'travel/2026/hangzhou-westlake.avif';
      const contentType = 'image/avif';
      const uploadResult = await adapter.generateUploadUrl(key, contentType, 15 * 1024 * 1024);

      // Verify CDN public URL
      expect(uploadResult.publicUrl).toBe(`${cdnDomain}/${key}`);

      // Verify Presigned PUT URL directed to Tencent COS endpoint
      const uploadUrl = new URL(uploadResult.uploadUrl);
      expect(uploadUrl.hostname).toBe('archive.cos.ap-shanghai.myqcloud.com');
      expect(uploadUrl.pathname).toBe(`/${key}`);
      expect(uploadUrl.searchParams.get('X-Amz-Credential')).toContain('ap-shanghai');
      expect(uploadUrl.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');

      // Verify Download URL
      const downloadUrl = new URL(await adapter.getDownloadUrl(key, 900));
      expect(downloadUrl.hostname).toBe('archive.cos.ap-shanghai.myqcloud.com');
      expect(downloadUrl.pathname).toBe(`/${key}`);
      expect(downloadUrl.searchParams.get('X-Amz-Expires')).toBe('900');
    });
  });

  describe('3. Private MinIO / Self-Hosted Object Storage', () => {
    it('should generate valid SigV4 direct upload URL with custom port and path-style bucket', async () => {
      const minioEndpoint = 'https://minio.archive.lan:9000';
      const bucketName = 'personal-archive';
      const cdnDomain = 'https://assets.archive.lan';

      const adapter: StoragePort = new R2StorageAdapter({
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadminpassword',
        bucketName,
        endpoint: minioEndpoint,
        region: 'us-east-1',
        publicDomain: cdnDomain,
      });

      const key = 'journal/attachments/audio-log.m4a';
      const contentType = 'audio/mp4';
      const uploadResult = await adapter.generateUploadUrl(key, contentType, 50 * 1024 * 1024);

      // Verify CDN domain mapping
      expect(uploadResult.publicUrl).toBe(`${cdnDomain}/${key}`);

      // Verify MinIO direct upload endpoint preserving port 9000
      const uploadUrl = new URL(uploadResult.uploadUrl);
      expect(uploadUrl.hostname).toBe('minio.archive.lan');
      expect(uploadUrl.port).toBe('9000');
      expect(uploadUrl.pathname).toBe(`/${bucketName}/${key}`);
      expect(uploadUrl.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    });
  });

  describe('4. Custom Domestic CDN Edge Gateway Domain Mapping', () => {
    it('should strictly map asset keys to custom CDN domain with slash normalization', () => {
      const adapter = new R2StorageAdapter({
        accessKeyId: 'dummyKey',
        secretAccessKey: 'dummySecret',
        bucketName: 'archive-bucket',
        endpoint: 'https://archive.oss-cn-beijing.aliyuncs.com',
        publicDomain: 'https://cdn.example.com///',
      });

      expect(adapter.getPublicUrl('test-photo.webp')).toBe('https://cdn.example.com/test-photo.webp');
      expect(adapter.getPublicUrl('/deep/nested/path/photo.webp')).toBe('https://cdn.example.com/deep/nested/path/photo.webp');
      expect(adapter.getPublicUrl('///multiple/leading/slashes.webp')).toBe('https://cdn.example.com/multiple/leading/slashes.webp');
    });
  });
});
