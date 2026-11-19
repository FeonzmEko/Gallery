import { describe, it, expect } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  createTimelineCursor,
  encodeTimelineCursor,
  decodeTimelineCursor,
  isTimelineCursor,
  toUrlSafeBase64,
  fromUrlSafeBase64,
} from '../src/index.js';

describe('Base64URL and Generic Cursor', () => {
  it('should round-trip UTF-8 strings in base64url', () => {
    const original = 'Hello, 世界! 🚀 personal-archive & 123 + 456';
    const encoded = toUrlSafeBase64(original);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    const decoded = fromUrlSafeBase64(encoded);
    expect(decoded).toBe(original);
  });

  it('should round-trip generic objects with encodeCursor and decodeCursor', () => {
    const payload = { page: 2, limit: 50, filter: 'published', tag: '旅行' };
    const cursor = encodeCursor(payload);
    expect(typeof cursor).toBe('string');
    const decoded = decodeCursor<typeof payload>(cursor);
    expect(decoded).toEqual(payload);
  });

  it('should return null for malformed cursors', () => {
    expect(decodeCursor('!!!not-valid-base64')).toBe(null);
    expect(decodeCursor('')).toBe(null);
  });
});

describe('Timeline Cursor (occurred_at + id)', () => {
  it('should validate and create TimelineCursor', () => {
    const cursor = createTimelineCursor(1732000000000, '018f3a5e-9988-7abc-8def-0123456789ab');
    expect(isTimelineCursor(cursor)).toBe(true);
    expect(cursor.occurredAt).toBe(1732000000000);
    expect(cursor.id).toBe('018f3a5e-9988-7abc-8def-0123456789ab');
  });

  it('should reject invalid creation arguments', () => {
    expect(() => createTimelineCursor(-1, 'id')).toThrow(TypeError);
    expect(() => createTimelineCursor(NaN, 'id')).toThrow(TypeError);
    expect(() => createTimelineCursor(123456, '')).toThrow(TypeError);
    expect(() => createTimelineCursor(123456, '   ')).toThrow(TypeError);
  });

  it('should encode and decode timeline cursor accurately', () => {
    const original = {
      occurredAt: 1732009999000,
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    };
    const encoded = encodeTimelineCursor(original);
    expect(typeof encoded).toBe('string');

    const decoded = decodeTimelineCursor(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.occurredAt).toBe(original.occurredAt);
    expect(decoded?.id).toBe(original.id);
  });

  it('should return null when decoding invalid timeline cursor structures', () => {
    // Valid base64 JSON, but wrong shape
    const wrongShape = encodeCursor({ foo: 'bar' });
    expect(decodeTimelineCursor(wrongShape)).toBe(null);

    // occurredAt is string instead of number
    const wrongType = encodeCursor({ occurredAt: '1732000000', id: 'abc' });
    expect(decodeTimelineCursor(wrongType)).toBe(null);

    // empty id
    const emptyId = encodeCursor({ occurredAt: 1732000000, id: '' });
    expect(decodeTimelineCursor(emptyId)).toBe(null);

    // corrupted string
    expect(decodeTimelineCursor('invalid-cursor-string')).toBe(null);
  });
});
