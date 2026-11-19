import { describe, it, expect } from 'vitest';
import {
  toUnixTimestamp,
  fromUnixTimestamp,
  isValidTimestamp,
  toISOString,
  formatDate,
  formatDateTime,
  getYear,
  getMonth,
  getYearRange,
  getMonthRange,
  formatRelativeTime,
} from '../src/index.js';

describe('Date and Timestamp utilities', () => {
  it('should convert various inputs to millisecond timestamps', () => {
    const fixedMs = 1732014000000;
    const dateObj = new Date(fixedMs);
    const isoStr = dateObj.toISOString();

    expect(toUnixTimestamp(fixedMs)).toBe(fixedMs);
    expect(toUnixTimestamp(dateObj)).toBe(fixedMs);
    expect(toUnixTimestamp(isoStr)).toBe(fixedMs);
  });

  it('should throw on invalid date inputs', () => {
    expect(() => toUnixTimestamp('invalid-date-string')).toThrow(TypeError);
    expect(() => toUnixTimestamp(NaN)).toThrow(TypeError);
  });

  it('should validate timestamps with isValidTimestamp', () => {
    expect(isValidTimestamp(1732014000000)).toBe(true);
    expect(isValidTimestamp(0)).toBe(true);
    expect(isValidTimestamp(-10)).toBe(false);
    expect(isValidTimestamp(NaN)).toBe(false);
    expect(isValidTimestamp('1732014000000')).toBe(false);
  });

  it('should format date and datetime strings in UTC', () => {
    // 2026-11-19T09:40:05.000Z
    const testDate = new Date(Date.UTC(2026, 10, 19, 9, 40, 5));
    expect(toISOString(testDate)).toBe('2026-11-19T09:40:05.000Z');
    expect(formatDate(testDate)).toBe('2026-11-19');
    expect(formatDate(testDate, '/')).toBe('2026/11/19');
    expect(formatDateTime(testDate, true)).toBe('2026-11-19 09:40:05');
    expect(formatDateTime(testDate, false)).toBe('2026-11-19 09:40');
  });

  it('should extract year and month', () => {
    const testDate = new Date(Date.UTC(2026, 10, 19));
    expect(getYear(testDate)).toBe(2026);
    expect(getMonth(testDate)).toBe(11); // 1-based month
  });

  it('should calculate year range correctly', () => {
    const { start, end } = getYearRange(2026);
    expect(new Date(start).toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(new Date(end).toISOString()).toBe('2026-12-31T23:59:59.999Z');
    expect(start < end).toBe(true);
  });

  it('should calculate month range correctly', () => {
    const { start, end } = getMonthRange(2026, 2); // February 2026 (non-leap year, 28 days)
    expect(new Date(start).toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(new Date(end).toISOString()).toBe('2026-02-28T23:59:59.999Z');

    expect(() => getMonthRange(2026, 13)).toThrow(RangeError);
  });

  it('should format relative time in Chinese and English', () => {
    const now = 1732014000000;
    // 30 seconds ago
    expect(formatRelativeTime(now - 30 * 1000, now, { locale: 'zh' })).toBe('刚刚');
    expect(formatRelativeTime(now - 30 * 1000, now, { locale: 'en' })).toBe('just now');

    // 5 minutes ago
    expect(formatRelativeTime(now - 5 * 60 * 1000, now, { locale: 'zh' })).toBe('5 分钟前');
    expect(formatRelativeTime(now - 5 * 60 * 1000, now, { locale: 'en' })).toBe('5 minutes ago');

    // 2 hours ago
    expect(formatRelativeTime(now - 2 * 3600 * 1000, now, { locale: 'zh' })).toBe('2 小时前');
    expect(formatRelativeTime(now - 2 * 3600 * 1000, now, { locale: 'en' })).toBe('2 hours ago');

    // 3 days ago
    expect(formatRelativeTime(now - 3 * 24 * 3600 * 1000, now, { locale: 'zh' })).toBe('3 天前');
    expect(formatRelativeTime(now - 3 * 24 * 3600 * 1000, now, { locale: 'en' })).toBe('3 days ago');
  });
});
