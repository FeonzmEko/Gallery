import { encodeCursor, decodeCursor } from './cursor.js';

/**
 * Composite Cursor for Timeline and ordered feeds.
 * Sorted primarily by occurredAt DESC, secondarily by id DESC.
 */
export interface TimelineCursor {
  /**
   * Memory/event occurrence timestamp in milliseconds (UTC).
   */
  occurredAt: number;
  /**
   * Unique identifier (UUIDv7 or ULID).
   */
  id: string;
}

/**
 * Type guard for TimelineCursor.
 */
export function isTimelineCursor(data: unknown): data is TimelineCursor {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.occurredAt === 'number' &&
    Number.isFinite(obj.occurredAt) &&
    obj.occurredAt >= 0 &&
    typeof obj.id === 'string' &&
    obj.id.trim().length > 0
  );
}

/**
 * Create a validated TimelineCursor object.
 */
export function createTimelineCursor(
  occurredAt: number | Date,
  id: string
): TimelineCursor {
  const timestamp = occurredAt instanceof Date ? occurredAt.getTime() : occurredAt;
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new TypeError(`Invalid occurredAt timestamp: ${timestamp}`);
  }
  const cleanId = id.trim();
  if (cleanId.length === 0) {
    throw new TypeError('Invalid cursor id: id cannot be empty');
  }
  return {
    occurredAt: Math.floor(timestamp),
    id: cleanId,
  };
}

/**
 * Encode a TimelineCursor into a compact URL-safe string.
 */
export function encodeTimelineCursor(cursor: TimelineCursor): string {
  if (!isTimelineCursor(cursor)) {
    throw new TypeError('Invalid TimelineCursor object provided to encodeTimelineCursor');
  }
  return encodeCursor({
    occurredAt: cursor.occurredAt,
    id: cursor.id,
  });
}

/**
 * Decode a URL-safe cursor string into a TimelineCursor object.
 * Returns null if the cursor is invalid, malformed, or missing required fields.
 */
export function decodeTimelineCursor(cursorStr: string): TimelineCursor | null {
  return decodeCursor<TimelineCursor>(cursorStr, isTimelineCursor);
}
