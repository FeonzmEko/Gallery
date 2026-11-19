import { drizzle, type DrizzleD1Database, type AnyD1Database } from 'drizzle-orm/d1';
import * as schema from './schema.js';

export type ArchiveDatabaseSchema = typeof schema;
export type ArchiveDb<TSchema extends Record<string, unknown> = ArchiveDatabaseSchema> = DrizzleD1Database<TSchema> & {
  $client: AnyD1Database;
};

export interface CreateDbOptions<TSchema extends Record<string, unknown>> {
  schema?: TSchema;
  logger?: boolean;
}

/**
 * Creates and initializes a Drizzle D1 database instance with configured schemas.
 *
 * @param d1 - Cloudflare D1 Database binding instance (env.DB)
 * @param options - Optional custom schema or logger options
 */
export function createDb<TSchema extends Record<string, unknown> = ArchiveDatabaseSchema>(
  d1: AnyD1Database,
  options?: CreateDbOptions<TSchema>
): ArchiveDb<TSchema> {
  const selectedSchema = (options?.schema ?? schema) as TSchema;
  return drizzle(d1, {
    schema: selectedSchema,
    logger: options?.logger ?? false,
  });
}

export { drizzle, type DrizzleD1Database, type AnyD1Database };
