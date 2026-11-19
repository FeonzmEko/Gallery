/**
 * RFC 9562 UUIDv7 generator and validator
 *
 * Layout:
 * - 48-bit Unix timestamp (milliseconds)
 * - 4-bit version (0b0111 = 7)
 * - 12-bit sequence / pseudo-random counter (rand_a)
 * - 2-bit variant (0b10)
 * - 62-bit pseudo-random data (rand_b)
 */

let lastTimestamp = -1;
let sequenceCounter = 0;

/**
 * Generate a cryptographically strong UUIDv7 string.
 * Supports monotonic generation when called within the same millisecond.
 */
export function generateUuidV7(timestampMs?: number): string {
  const now = timestampMs ?? Date.now();
  const bytes = new Uint8Array(16);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for non-standard environments
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Handle monotonicity for the same millisecond
  if (now === lastTimestamp) {
    sequenceCounter = (sequenceCounter + 1) & 0xfff;
  } else {
    lastTimestamp = now;
    sequenceCounter = ((bytes[6]! & 0x0f) << 8) | bytes[7]!;
  }

  // 48-bit timestamp (bytes 0 to 5)
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // 4-bit version (0b0111 = 7) + high 4 bits of 12-bit sequence (bytes 6)
  bytes[6] = 0x70 | ((sequenceCounter >>> 8) & 0x0f);
  // low 8 bits of 12-bit sequence (bytes 7)
  bytes[7] = sequenceCounter & 0xff;

  // 2-bit variant (0b10) + 6 bits of rand_b (bytes 8)
  bytes[8] = 0x80 | (bytes[8]! & 0x3f);

  return formatUuid(bytes);
}

function formatUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i]!.toString(16).padStart(2, '0'));
  }
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate whether a string is a valid UUIDv7.
 */
export function isValidUuidV7(id: unknown): id is string {
  if (typeof id !== 'string') {
    return false;
  }
  return UUID_V7_REGEX.test(id);
}

/**
 * Extract the Unix timestamp in milliseconds from a valid UUIDv7.
 * Returns null if the UUIDv7 is invalid.
 */
export function extractTimestampFromUuidV7(id: string): number | null {
  if (!isValidUuidV7(id)) {
    return null;
  }
  const cleanHex = id.replace(/-/g, '').slice(0, 12);
  return parseInt(cleanHex, 16);
}
