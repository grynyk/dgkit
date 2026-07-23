import { clampCount, graphemeLength, toGraphemes } from './graphemes';

/**
 * Truncate the middle of a string, keeping its start and end.
 *
 * Ideal for hashes, wallet addresses, file paths and long IDs:
 *
 * ```ts
 * middleTruncate('0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 6, 4);
 * // '0x71C7…976F'
 * ```
 *
 * Guarantees:
 * - grapheme-safe — never splits an emoji, flag or combining mark;
 * - `head`/`tail` are clamped to non-negative integers (`tail = 0` keeps only
 *   the start — it does **not** fall through to returning the whole string);
 * - the result is never longer than the input: if truncating wouldn't save at
 *   least the ellipsis's length, the original string is returned unchanged;
 * - `null`/`undefined` become `''`.
 *
 * @param value    the string to truncate
 * @param head     graphemes to keep from the start (default `5`)
 * @param tail     graphemes to keep from the end (default `5`)
 * @param ellipsis the separator inserted in the middle (default `'…'`)
 */
export function middleTruncate(
  value: string | null | undefined,
  head = 5,
  tail = 5,
  ellipsis = '…',
): string {
  if (!value) {
    return '';
  }

  const headCount = clampCount(head);
  const tailCount = clampCount(tail);
  const ellipsisCount = graphemeLength(ellipsis);

  const graphemes = toGraphemes(value);
  // Only truncate when it actually shortens the string; otherwise the ellipsis
  // could make the output as long as (or longer than) the input.
  if (graphemes.length <= headCount + tailCount + ellipsisCount) {
    return value;
  }

  const start = graphemes.slice(0, headCount).join('');
  // `slice(length - tailCount)` — never `slice(-tailCount)`, so `tail = 0`
  // correctly yields an empty end instead of the whole string.
  const end = graphemes.slice(graphemes.length - tailCount).join('');
  return `${start}${ellipsis}${end}`;
}
