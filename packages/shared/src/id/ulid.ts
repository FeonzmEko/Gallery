/**
 * ULID (Universally Unique Lexicographically Sortable Identifier) generator and validator
 *
 * Spec:
 * - 48-bit integer Unix time in milliseconds (10 Crockford Base32 characters)
 * - 80-bit randomness (16 Crockford Base32 characters)
 * - Total 26 characters, canonical uppercase
 */

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;
const ULID_REGEX = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i;

// Reverse lookup table for decoding
const DECODE_MAP: Record<string, number> = {};
for (let i = 0; i < ENCODING.length; i++) {
  DECODE_MAP[ENCODING[i]!] = i;
  DECODE_MAP[ENCODING[i]!.toLowerCase()] = i;
}
// Crockford base32 aliases
DECODE_MAP['O'] = 0;
DECODE_MAP['o'] = 0;
DECODE_MAP['I'] = 1;
DECODE_MAP['i'] = 1;
DECODE_MAP['L'] = 1;
DECODE_MAP['l'] = 1;

let lastUlidTime = -1;
const lastRandom = new Uint8Array(10); // 80 bits = 10 bytes

/**
 * Generate a ULID string.
 * Supports monotonic increment when called within the same millisecond.
 */
export function generateUlid(timestampMs?: number): string {
  const now = timestampMs ?? Date.now();
  let timeStr = '';

  // Encode 48-bit timestamp to 10 characters
  let time = now;
  for (let i = 9; i >= 0; i--) {
    const mod = time % ENCODING_LEN;
    timeStr = ENCODING[mod] + timeStr;
    time = (time - mod) / ENCODING_LEN;
  }

  // Handle 80 bits randomness
  if (now === lastUlidTime) {
    // Increment the last random 10 bytes with carry
    let carry = 1;
    for (let i = 9; i >= 0 && carry > 0; i--) {
      const val = lastRandom[i]! + carry;
      lastRandom[i] = val & 0xff;
      carry = val >>> 8;
    }
  } else {
    lastUlidTime = now;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(lastRandom);
    } else {
      for (let i = 0; i < 10; i++) {
        lastRandom[i] = Math.floor(Math.random() * 256);
      }
    }
  }

  // Encode 10 bytes (80 bits) into 16 characters (each character is 5 bits: 16 * 5 = 80 bits)
  let randStr = '';
  // Convert 10 bytes to bit stream
  for (let i = 0; i < 16; i++) {
    const bitOffset = i * 5;
    const byteOffset = Math.floor(bitOffset / 8);
    const bitInByte = bitOffset % 8;

    // Read bits across byte boundary if necessary
    let val = (lastRandom[byteOffset]! << (bitInByte + 8)) & 0xffff;
    if (byteOffset + 1 < 10) {
      val |= lastRandom[byteOffset + 1]! << bitInByte;
    }
    if (byteOffset + 2 < 10) {
      val |= lastRandom[byteOffset + 2]! >>> (8 - bitInByte);
    }
    const charIndex = (val >>> 11) & 0x1f;
    randStr += ENCODING[charIndex];
  }

  return timeStr + randStr;
}

/**
 * Validate whether a string is a valid ULID.
 */
export function isValidUlid(id: unknown): id is string {
  if (typeof id !== 'string' || id.length !== 26) {
    return false;
  }
  return ULID_REGEX.test(id);
}

/**
 * Extract the Unix timestamp in milliseconds from a valid ULID.
 * Returns null if the ULID is invalid.
 */
export function extractTimestampFromUlid(id: string): number | null {
  if (!isValidUlid(id)) {
    return null;
  }
  let time = 0;
  for (let i = 0; i < 10; i++) {
    const char = id[i]!;
    const val = DECODE_MAP[char];
    if (val === undefined) {
      return null;
    }
    time = time * ENCODING_LEN + val;
  }
  return time;
}
