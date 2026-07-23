import { describe, expect, it } from 'vitest';

import { middleTruncate } from './middle-truncate';

describe('middleTruncate', () => {
  it('truncates the middle of a long string', () => {
    expect(
      middleTruncate('0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 6, 4),
    ).toBe('0x71C7…976F');
  });

  it('uses the default head/tail/ellipsis', () => {
    expect(middleTruncate('abcdefghijklmnop')).toBe('abcde…lmnop');
  });

  it('returns the original when it is short enough', () => {
    expect(middleTruncate('short', 5, 5)).toBe('short');
    // Not worth truncating: the ellipsis would not shorten it.
    expect(middleTruncate('abcdefghij', 5, 5)).toBe('abcdefghij');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(middleTruncate(null)).toBe('');
    expect(middleTruncate(undefined)).toBe('');
    expect(middleTruncate('')).toBe('');
  });

  // --- Regression: the original implementation's bugs -----------------------

  it('handles tail = 0 without returning the whole string (slice(-0) bug)', () => {
    const out = middleTruncate('abcdefghijklmnop', 5, 0);
    expect(out).toBe('abcde…');
    expect(out.length).toBeLessThan('abcdefghijklmnop'.length);
  });

  it('clamps negative head/tail to zero', () => {
    expect(middleTruncate('abcdefghijklmnop', -2, 3)).toBe('…nop');
    expect(middleTruncate('abcdefghijklmnop', 3, -2)).toBe('abc…');
  });

  it('clamps NaN / non-finite head/tail to zero', () => {
    expect(middleTruncate('abcdefghijklmnop', Number.NaN, 3)).toBe('…nop');
    // Infinity is not finite → clamped to 0, so the tail is dropped.
    expect(
      middleTruncate('abcdefghijklmnop', 3, Number.POSITIVE_INFINITY),
    ).toBe('abc…');
  });

  it('floors fractional head/tail', () => {
    expect(middleTruncate('abcdefghijklmnop', 2.9, 2.9)).toBe('ab…op');
  });

  it('never returns a string longer than the input', () => {
    for (let head = 0; head <= 12; head++) {
      for (let tail = 0; tail <= 12; tail++) {
        const input = 'abcdefghijklmnop';
        const out = middleTruncate(input, head, tail, '...');
        expect(out.length).toBeLessThanOrEqual(input.length);
      }
    }
  });

  // --- Regression: unicode / grapheme safety --------------------------------

  it('does not split emoji ZWJ sequences (family emoji)', () => {
    const family = '👨‍👩‍👧‍👦';
    const input = `${family} reunion party ${family}`;
    // head 1 / tail 1 must keep exactly one whole family emoji each end.
    expect(middleTruncate(input, 1, 1)).toBe(`${family}…${family}`);
  });

  it('does not split flag emoji (regional indicators)', () => {
    const input = '🇺🇦🇺🇦🇺🇦 hello 🇺🇦🇺🇦🇺🇦';
    expect(middleTruncate(input, 2, 2)).toBe('🇺🇦🇺🇦…🇺🇦🇺🇦');
  });

  it('honours a custom ellipsis', () => {
    expect(
      middleTruncate('0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 6, 4, '...'),
    ).toBe('0x71C7...976F');
  });
});
