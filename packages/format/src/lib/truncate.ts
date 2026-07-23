import { clampCount, toGraphemes } from './graphemes';

/**
 * Truncate the end of a string to at most `max` grapheme clusters, appending an
 * ellipsis when characters are removed.
 *
 * ```ts
 * truncate('The quick brown fox', 9); // 'The quic…'
 * ```
 *
 * Guarantees:
 * - grapheme-safe — never splits an emoji, flag or combining mark;
 * - the returned string never exceeds `max` graphemes (ellipsis included);
 * - `max` is clamped to a non-negative integer;
 * - `null`/`undefined` become `''`.
 *
 * @param value    the string to truncate
 * @param max      maximum length in graphemes, ellipsis included (default `20`)
 * @param ellipsis appended when truncation occurs (default `'…'`)
 */
export function truncate(
  value: string | null | undefined,
  max = 20,
  ellipsis = '…',
): string {
  if (!value) {
    return '';
  }

  const limit = clampCount(max);
  if (limit === 0) {
    return '';
  }

  const graphemes = toGraphemes(value);
  if (graphemes.length <= limit) {
    return value;
  }

  const ellipsisGraphemes = toGraphemes(ellipsis);
  // If the ellipsis alone would exceed the limit, return the first `limit`
  // graphemes of the ellipsis so the cap is always respected.
  if (ellipsisGraphemes.length >= limit) {
    return ellipsisGraphemes.slice(0, limit).join('');
  }

  const keep = limit - ellipsisGraphemes.length;
  return `${graphemes.slice(0, keep).join('')}${ellipsis}`;
}
