import { describe, it, expect } from 'vitest';
import { slugify } from '../src/text/slugify';

describe('slugify (@archive/shared)', () => {
  it('normalizes ASCII text with spaces and punctuation', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('  Kyoto  Autumn  2026 ')).toBe('kyoto-autumn-2026');
  });

  it('preserves CJK characters distinctly without colliding', () => {
    expect(slugify('旅行')).toBe('旅行');
    expect(slugify('摄影')).toBe('摄影');
    expect(slugify('旅行')).not.toBe(slugify('摄影'));
    expect(slugify('京都 红叶 2026')).toBe('京都-红叶-2026');
  });

  it('handles empty or symbol-only strings safely', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
    expect(slugify('+++')).toBe('%2B%2B%2B');
  });
});
