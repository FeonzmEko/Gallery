import type { D1Database, R2Bucket, Fetcher } from '@cloudflare/workers-types';

/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
  // Cloudflare D1 Database binding
  DB: D1Database;

  // Cloudflare R2 Bucket binding
  MEDIA_BUCKET?: R2Bucket;

  // Cloudflare Workers Static Assets binding (for SPA HTML + OG HTMLRewriter)
  ASSETS?: Fetcher;

  // S3 / R2 API credential variables for signed upload/download generation
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_REGION?: string;
  R2_PUBLIC_DOMAIN?: string;

  // Authentication configuration
  JWT_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;

  // Runtime environment identifier ('development' | 'production' | 'test')
  ENVIRONMENT?: string;
}
