import { describe, it, expect } from 'vitest';
import {
  generateUuidV7,
  isValidUuidV7,
  extractTimestampFromUuidV7,
  generateUlid,
  isValidUlid,
  extractTimestampFromUlid,
} from '../src/index.js';

describe('UUIDv7 utilities', () => {
  it('should generate valid UUIDv7 format', () => {
    const id = generateUuidV7();
    expect(isValidUuidV7(id)).toBe(true);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should correctly encode given timestamp', () => {
    const targetTime = 1700000000000; // 2023-11-14T22:13:20.000Z
    const id = generateUuidV7(targetTime);
    expect(isValidUuidV7(id)).toBe(true);
    const extracted = extractTimestampFromUuidV7(id);
    expect(extracted).toBe(targetTime);
  });

  it('should reject invalid UUIDs', () => {
    expect(isValidUuidV7('')).toBe(false);
    expect(isValidUuidV7('not-a-uuid')).toBe(false);
    // UUIDv4 (version 4 instead of 7)
    expect(isValidUuidV7('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBe(false);
    expect(extractTimestampFromUuidV7('invalid')).toBe(null);
  });

  it('should generate monotonically increasing UUIDv7 within the same ms', () => {
    const fixedTime = 1732000000000;
    const id1 = generateUuidV7(fixedTime);
    const id2 = generateUuidV7(fixedTime);
    const id3 = generateUuidV7(fixedTime);

    expect(isValidUuidV7(id1)).toBe(true);
    expect(isValidUuidV7(id2)).toBe(true);
    expect(isValidUuidV7(id3)).toBe(true);

    // Lexicographical ordering must be strictly increasing
    expect(id1 < id2).toBe(true);
    expect(id2 < id3).toBe(true);
  });
});

describe('ULID utilities', () => {
  it('should generate valid 26-char Crockford Base32 ULID', () => {
    const ulid = generateUlid();
    expect(ulid.length).toBe(26);
    expect(isValidUlid(ulid)).toBe(true);
  });

  it('should correctly encode and extract timestamp', () => {
    const targetTime = 1700000000000;
    const ulid = generateUlid(targetTime);
    expect(isValidUlid(ulid)).toBe(true);
    const extracted = extractTimestampFromUlid(ulid);
    expect(extracted).toBe(targetTime);
  });

  it('should reject invalid ULID strings', () => {
    expect(isValidUlid('')).toBe(false);
    expect(isValidUlid('too-short')).toBe(false);
    // 26 chars with invalid chars (e.g. 'U' which is not in Crockford Base32)
    expect(isValidUlid('01ARZ3NDEKTSV4RRFFQ69G5FAU')).toBe(false);
    expect(extractTimestampFromUlid('invalid')).toBe(null);
  });

  it('should generate monotonically increasing ULID within the same ms', () => {
    const fixedTime = 1732000000000;
    const u1 = generateUlid(fixedTime);
    const u2 = generateUlid(fixedTime);
    const u3 = generateUlid(fixedTime);

    expect(isValidUlid(u1)).toBe(true);
    expect(isValidUlid(u2)).toBe(true);
    expect(isValidUlid(u3)).toBe(true);

    expect(u1 < u2).toBe(true);
    expect(u2 < u3).toBe(true);
  });
});
