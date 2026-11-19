/**
 * Universal Date and Timestamp processing utilities.
 * Time values in the Personal Archive system are consistently represented
 * as 64-bit integer Unix timestamps in milliseconds (UTC).
 */

/**
 * Convert any valid date representation (Date, ISO string, timestamp) to a Unix timestamp in milliseconds.
 * Throws TypeError if the date is invalid.
 */
export function toUnixTimestamp(input?: Date | string | number): number {
  if (input === undefined || input === null) {
    return Date.now();
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input) || isNaN(input)) {
      throw new TypeError(`Invalid numeric timestamp: ${input}`);
    }
    return Math.floor(input);
  }

  if (input instanceof Date) {
    const time = input.getTime();
    if (isNaN(time)) {
      throw new TypeError('Invalid Date object');
    }
    return time;
  }

  if (typeof input === 'string') {
    const parsed = Date.parse(input);
    if (isNaN(parsed)) {
      throw new TypeError(`Unable to parse date string: "${input}"`);
    }
    return parsed;
  }

  throw new TypeError(`Unsupported date input type: ${typeof input}`);
}

/**
 * Convert Unix timestamp in milliseconds to a native Date object.
 */
export function fromUnixTimestamp(timestampMs: number): Date {
  if (!Number.isFinite(timestampMs) || isNaN(timestampMs)) {
    throw new TypeError(`Invalid timestamp: ${timestampMs}`);
  }
  return new Date(timestampMs);
}

/**
 * Check if a given value is a valid finite Unix timestamp in milliseconds.
 */
export function isValidTimestamp(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

/**
 * Format any date input to standard ISO-8601 UTC string (e.g. "2026-11-19T09:30:00.000Z").
 */
export function toISOString(input?: Date | string | number): string {
  const ts = toUnixTimestamp(input);
  return new Date(ts).toISOString();
}

/**
 * Format date to 'YYYY-MM-DD' (or other separators like '/' or '.').
 * Uses UTC date values to prevent timezone shift.
 */
export function formatDate(
  input: Date | string | number,
  separator: '-' | '/' | '.' = '-'
): string {
  const d = new Date(toUnixTimestamp(input));
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}${separator}${month}${separator}${day}`;
}

/**
 * Format date and time to 'YYYY-MM-DD HH:mm:ss' (or without seconds: 'YYYY-MM-DD HH:mm').
 * Uses UTC date values.
 */
export function formatDateTime(
  input: Date | string | number,
  includeSeconds: boolean = true
): string {
  const d = new Date(toUnixTimestamp(input));
  const dateStr = formatDate(d, '-');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  if (!includeSeconds) {
    return `${dateStr} ${hours}:${minutes}`;
  }
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * Extract the 4-digit UTC year from a date.
 */
export function getYear(input: Date | string | number): number {
  return new Date(toUnixTimestamp(input)).getUTCFullYear();
}

/**
 * Extract the 1-based UTC month (1-12) from a date.
 */
export function getMonth(input: Date | string | number): number {
  return new Date(toUnixTimestamp(input)).getUTCMonth() + 1;
}

/**
 * Get UTC timestamp boundaries (start and end in ms) for an entire year.
 * Useful for D1 timeline index range queries (`occurred_at BETWEEN :start AND :end`).
 */
export function getYearRange(year: number): { start: number; end: number } {
  const start = Date.UTC(year, 0, 1, 0, 0, 0, 0);
  const end = Date.UTC(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get UTC timestamp boundaries for a specific month (month: 1-12).
 */
export function getMonthRange(
  year: number,
  month: number
): { start: number; end: number } {
  if (month < 1 || month > 12) {
    throw new RangeError(`Month must be between 1 and 12, got: ${month}`);
  }
  const start = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
  // Using day 0 of next month gives the last day of the current month
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999);
  return { start, end };
}

export interface RelativeTimeOptions {
  locale?: 'zh' | 'en';
}

/**
 * Format relative elapsed time (e.g. "刚刚", "5 分钟前", "3 天前", or "just now", "5 minutes ago").
 */
export function formatRelativeTime(
  input: Date | string | number,
  nowInput?: Date | string | number,
  options: RelativeTimeOptions = { locale: 'zh' }
): string {
  const timestamp = toUnixTimestamp(input);
  const now = toUnixTimestamp(nowInput);
  const diffMs = now - timestamp;
  const isZh = options.locale !== 'en';

  if (diffMs < 0) {
    // In future
    return isZh ? '未来' : 'in the future';
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return isZh ? '刚刚' : 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return isZh ? `${minutes} 分钟前` : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return isZh ? `${hours} 小时前` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return isZh ? `${days} 天前` : `${days} day${days > 1 ? 's' : ''} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return isZh ? `${months} 个月前` : `${months} month${months > 1 ? 's' : ''} ago`;
  }

  const years = Math.floor(days / 365);
  return isZh ? `${years} 年前` : `${years} year${years > 1 ? 's' : ''} ago`;
}
