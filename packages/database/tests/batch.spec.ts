import { describe, it, expect, vi } from 'vitest';
import {
  AtomicBatch,
  chunkArray,
  executeAtomicBatch,
  DEFAULT_MAX_D1_BATCH_SIZE,
} from '../src/batch.js';

describe('chunkArray', () => {
  it('should split an array into equal-sized chunks and a remainder chunk', () => {
    const data = [1, 2, 3, 4, 5, 6, 7];
    const chunks = chunkArray(data, 3);
    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('should handle exact multiples correctly', () => {
    const data = [1, 2, 3, 4];
    const chunks = chunkArray(data, 2);
    expect(chunks).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('should handle an empty array', () => {
    expect(chunkArray([], 50)).toEqual([]);
  });

  it('should throw an error for non-positive chunk size', () => {
    expect(() => chunkArray([1, 2], 0)).toThrow(/must be greater than 0/);
    expect(() => chunkArray([1, 2], -1)).toThrow(/must be greater than 0/);
  });
});

describe('AtomicBatch', () => {
  it('should manage statements lifecycle (add, addMany, size, isEmpty, clear)', () => {
    const batch = new AtomicBatch<string>();
    expect(batch.isEmpty).toBe(true);
    expect(batch.size).toBe(0);

    batch.add('stmt1');
    expect(batch.size).toBe(1);
    expect(batch.isEmpty).toBe(false);

    batch.addMany(['stmt2', 'stmt3']);
    expect(batch.size).toBe(3);
    expect(batch.getStatements()).toEqual(['stmt1', 'stmt2', 'stmt3']);

    batch.clear();
    expect(batch.isEmpty).toBe(true);
    expect(batch.size).toBe(0);
    expect(batch.getStatements()).toEqual([]);
  });

  it('should return empty results when executing an empty batch', async () => {
    const batch = new AtomicBatch<any>();
    const mockDb = { batch: vi.fn() } as any;

    const results = await batch.execute(mockDb);
    expect(results).toEqual([]);
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it('should execute statements within limit as a single atomic batch', async () => {
    const batch = new AtomicBatch<any>();
    const stmts = [{ sql: 'INSERT 1' }, { sql: 'INSERT 2' }];
    batch.addMany(stmts);

    const mockDb = {
      batch: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    } as any;

    const results = await batch.execute(mockDb);
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
    expect(mockDb.batch).toHaveBeenCalledWith(stmts);
    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should automatically chunk statements exceeding maxBatchSize', async () => {
    const customLimit = 5;
    const batch = new AtomicBatch<any>({ maxBatchSize: customLimit });

    const totalItems = 12; // 5 + 5 + 2 -> 3 chunks
    const stmts = Array.from({ length: totalItems }, (_, i) => ({ sql: `STMT_${i}` }));
    batch.addMany(stmts);

    const mockDb = {
      batch: vi.fn().mockImplementation((chunk: any[]) =>
        Promise.resolve(chunk.map((item) => ({ executed: item.sql })))
      ),
    } as any;

    const results = await batch.execute(mockDb);
    expect(mockDb.batch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(12);
    expect(results[0]).toEqual({ executed: 'STMT_0' });
    expect(results[11]).toEqual({ executed: 'STMT_11' });
  });

  it('should throw an error when enforceSingleAtomicBatch is true and limit exceeded', async () => {
    const batch = new AtomicBatch<any>({
      maxBatchSize: 3,
      enforceSingleAtomicBatch: true,
    });

    batch.addMany([{ sql: '1' }, { sql: '2' }, { sql: '3' }, { sql: '4' }]);
    const mockDb = { batch: vi.fn() } as any;

    await expect(batch.execute(mockDb)).rejects.toThrow(
      /exceeds single atomic batch limit of 3/
    );
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it('should support executeRaw with native D1Database mock', async () => {
    const batch = new AtomicBatch<any>({ maxBatchSize: 2 });
    batch.addMany(['raw1', 'raw2', 'raw3']);

    const mockD1 = {
      batch: vi.fn().mockImplementation((chunk: string[]) =>
        Promise.resolve(chunk.map((item) => `res_${item}`))
      ),
    } as any;

    const results = await batch.executeRaw(mockD1);
    expect(mockD1.batch).toHaveBeenCalledTimes(2);
    expect(results).toEqual(['res_raw1', 'res_raw2', 'res_raw3']);
  });

  it('should execute helper executeAtomicBatch correctly', async () => {
    const mockDb = {
      batch: vi.fn().mockResolvedValue(['res1', 'res2']),
    } as any;

    const results = await executeAtomicBatch(
      mockDb,
      [{ sql: 's1' }, { sql: 's2' }] as any
    );
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['res1', 'res2']);
  });

  it('should default to DEFAULT_MAX_D1_BATCH_SIZE (50)', () => {
    expect(DEFAULT_MAX_D1_BATCH_SIZE).toBe(50);
  });
});
