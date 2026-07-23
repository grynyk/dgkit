import { describe, expect, it } from 'vitest';

import { graphemeLength } from './graphemes';
import { truncate } from './truncate';

describe('truncate', () => {
  it('truncates to the max length with an ellipsis', () => {
    expect(truncate('The quick brown fox', 9)).toBe('The quic…');
  });

  it('returns the original when short enough', () => {
    expect(truncate('short', 20)).toBe('short');
    expect(truncate('exactly ten', 11)).toBe('exactly ten');
  });

  it('returns empty for null/undefined/empty', () => {
    expect(truncate(null)).toBe('');
    expect(truncate(undefined)).toBe('');
    expect(truncate('')).toBe('');
  });

  it('returns empty when max clamps to zero', () => {
    expect(truncate('anything', 0)).toBe('');
    expect(truncate('anything', -5)).toBe('');
    expect(truncate('anything', Number.NaN)).toBe('');
  });

  it('never exceeds the max grapheme count', () => {
    for (let max = 1; max <= 25; max++) {
      const out = truncate('The quick brown fox jumps over', max, '...');
      expect(graphemeLength(out)).toBeLessThanOrEqual(max);
    }
  });

  it('returns a clipped ellipsis when max is smaller than the ellipsis', () => {
    expect(truncate('hello world', 2, '...')).toBe('..');
  });

  it('is grapheme-safe for emoji', () => {
    const family = '👨‍👩‍👧‍👦';
    const out = truncate(`${family}${family}${family} party`, 3);
    // Two whole families + a single-grapheme ellipsis = 3 graphemes.
    expect(out).toBe(`${family}${family}…`);
    expect(graphemeLength(out)).toBe(3);
  });

  it('honours a custom ellipsis', () => {
    expect(truncate('abcdefghij', 6, '...')).toBe('abc...');
  });
});
