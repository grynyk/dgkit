import { describe, expect, it } from 'vitest';

import { fileSize } from './file-size';

describe('fileSize', () => {
  it('formats bytes below the base unchanged', () => {
    expect(fileSize(0)).toBe('0 B');
    expect(fileSize(512)).toBe('512 B');
  });

  it('formats binary (1024-based) units by default', () => {
    expect(fileSize(1024)).toBe('1 KiB');
    expect(fileSize(1536)).toBe('1.5 KiB');
    expect(fileSize(1024 * 1024)).toBe('1 MiB');
    expect(fileSize(1024 ** 3)).toBe('1 GiB');
  });

  it('formats decimal (1000-based) units on request', () => {
    expect(fileSize(1000, { standard: 'decimal' })).toBe('1 kB');
    expect(fileSize(1_500_000, { standard: 'decimal' })).toBe('1.5 MB');
  });

  it('respects maximumFractionDigits', () => {
    expect(fileSize(1536, { maximumFractionDigits: 0 })).toBe('2 KiB');
    expect(fileSize(1590, { maximumFractionDigits: 2 })).toBe('1.55 KiB');
  });

  it('keeps the sign for negative sizes', () => {
    expect(fileSize(-2048)).toBe('-2 KiB');
  });

  it('supports a custom separator', () => {
    expect(fileSize(2048, { separator: '' })).toBe('2KiB');
  });

  it('caps at the largest known unit', () => {
    expect(fileSize(1024 ** 6 * 3)).toBe('3 EiB');
  });

  it('returns 0 B for non-finite input', () => {
    expect(fileSize(Number.NaN)).toBe('0 B');
    expect(fileSize(Number.POSITIVE_INFINITY)).toBe('0 B');
  });

  it('formats with an explicit locale (deterministic separators)', () => {
    // 1000.5 KiB stays in-unit (< 1024) and is ≥ 1000, so grouping shows:
    // en-US groups with a comma, de-DE with a dot.
    const bytes = 1000.5 * 1024;
    expect(fileSize(bytes, { locale: 'en-US', maximumFractionDigits: 1 })).toBe(
      '1,000.5 KiB',
    );
    expect(fileSize(bytes, { locale: 'de-DE', maximumFractionDigits: 1 })).toBe(
      '1.000,5 KiB',
    );
  });
});
