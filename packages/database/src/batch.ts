import type { BatchItem } from 'drizzle-orm/batch';
import type { DrizzleD1Database, AnyD1Database } from 'drizzle-orm/d1';

/**
 * Cloudflare D1 recommended batch size limit.
 * D1 free tier limits invocations and SQLite statement queues.
 * Keeping batch size <= 50 ensures reliable single-roundtrip atomic commits.
 */
export const DEFAULT_MAX_D1_BATCH_SIZE = 50;

export interface AtomicBatchOptions {
  /**
   * Maximum statements per chunk. Defaults to 50.
   */
  maxBatchSize?: number;
  /**
   * If true, throws an error if total statements exceed maxBatchSize,
   * guaranteeing that statements are NEVER split across multiple round-trips.
   * Defaults to false (auto-chunking).
   */
  enforceSingleAtomicBatch?: boolean;
}

/**
 * Splits an array into chunks of the specified size.
 */
export function chunkArray<T>(items: readonly T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    throw new Error(`Chunk size must be greater than 0, got ${chunkSize}`);
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * AtomicBatch encapsulates a series of database statements to be committed atomically in D1.
 *
 * When the number of statements is within the D1 batch limit (default 50),
 * all statements are executed in a single atomic `db.batch()` call.
 */
export class AtomicBatch<TItem = BatchItem<'sqlite'>> {
  private readonly statements: TItem[] = [];
  private readonly maxBatchSize: number;
  private readonly enforceSingleAtomicBatch: boolean;

  constructor(options: AtomicBatchOptions = {}) {
    this.maxBatchSize = options.maxBatchSize ?? DEFAULT_MAX_D1_BATCH_SIZE;
    this.enforceSingleAtomicBatch = options.enforceSingleAtomicBatch ?? false;
  }

  /**
   * Add a statement to the batch.
   */
  add(statement: TItem): this {
    this.statements.push(statement);
    return this;
  }

  /**
   * Add multiple statements to the batch.
   */
  addMany(statements: readonly TItem[]): this {
    this.statements.push(...statements);
    return this;
  }

  /**
   * Number of statements currently queued.
   */
  get size(): number {
    return this.statements.length;
  }

  /**
   * Whether the batch is empty.
   */
  get isEmpty(): boolean {
    return this.statements.length === 0;
  }

  /**
   * Clears all statements from the batch.
   */
  clear(): void {
    this.statements.length = 0;
  }

  /**
   * Returns a copy of the queued statements.
   */
  getStatements(): readonly TItem[] {
    return [...this.statements];
  }

  /**
   * Executes the queued statements using Drizzle D1 database batch API.
   */
  async execute<TSchema extends Record<string, unknown>>(
    db: DrizzleD1Database<TSchema>
  ): Promise<unknown[]> {
    if (this.statements.length === 0) {
      return [];
    }

    if (this.enforceSingleAtomicBatch && this.statements.length > this.maxBatchSize) {
      throw new Error(
        `Batch statements count (${this.statements.length}) exceeds single atomic batch limit of ${this.maxBatchSize}.`
      );
    }

    if (this.statements.length <= this.maxBatchSize) {
      // Execute as a single atomic batch
      const [first, ...rest] = this.statements as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]];
      const result = await db.batch([first, ...rest] as const);
      return result as unknown as unknown[];
    }

    // Multiple chunks execution
    const chunks = chunkArray(this.statements, this.maxBatchSize);
    const results: unknown[] = [];
    for (const chunk of chunks) {
      if (chunk.length > 0) {
        const [first, ...rest] = chunk as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]];
        const res = await db.batch([first, ...rest] as const);
        results.push(...(res as unknown as unknown[]));
      }
    }
    return results;
  }

  /**
   * Executes the queued statements on native D1Database instance directly (for raw D1PreparedStatement).
   */
  async executeRaw(d1: AnyD1Database): Promise<unknown[]> {
    if (this.statements.length === 0) {
      return [];
    }

    const d1Database = d1 as unknown as {
      batch: (stmts: unknown[]) => Promise<unknown[]>;
    };

    if (this.enforceSingleAtomicBatch && this.statements.length > this.maxBatchSize) {
      throw new Error(
        `Batch statements count (${this.statements.length}) exceeds single atomic batch limit of ${this.maxBatchSize}.`
      );
    }

    if (this.statements.length <= this.maxBatchSize) {
      return await d1Database.batch(this.statements);
    }

    const chunks = chunkArray(this.statements, this.maxBatchSize);
    const results: unknown[] = [];
    for (const chunk of chunks) {
      const res = await d1Database.batch(chunk);
      results.push(...res);
    }
    return results;
  }
}

/**
 * Convenience helper to execute a list of Drizzle statements with atomic batch chunking.
 */
export async function executeAtomicBatch<TSchema extends Record<string, unknown>>(
  db: DrizzleD1Database<TSchema>,
  statements: readonly BatchItem<'sqlite'>[],
  options?: AtomicBatchOptions
): Promise<unknown[]> {
  const batch = new AtomicBatch<BatchItem<'sqlite'>>(options);
  batch.addMany(statements);
  return batch.execute(db);
}
