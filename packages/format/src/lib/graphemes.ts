/**
 * Split a string into user-perceived characters (grapheme clusters).
 *
 * Uses `Intl.Segmenter` when available so emoji ZWJ sequences (👨‍👩‍👧‍👦), flags
 * (🇺🇦) and combining marks (é as e + ◌́) are treated as single units. Falls
 * back to code points (`[...value]`) — astral-safe, though not ZWJ-aware — in
 * the rare environment without `Intl.Segmenter`.
 *
 * The segmenter is created lazily and cached; constructing one per call is
 * comparatively expensive.
 */
let segmenter: Intl.Segmenter | undefined;
let segmenterResolved = false;

function getSegmenter(): Intl.Segmenter | undefined {
  if (!segmenterResolved) {
    segmenterResolved = true;
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    }
  }
  return segmenter;
}

export function toGraphemes(value: string): string[] {
  const seg = getSegmenter();
  if (seg) {
    return Array.from(seg.segment(value), (part) => part.segment);
  }
  return Array.from(value);
}

/** Number of grapheme clusters in a string. */
export function graphemeLength(value: string): number {
  return toGraphemes(value).length;
}

/**
 * Coerce a length-like argument to a non-negative integer. `NaN`, negative and
 * non-finite values become `0`; fractional values are floored.
 */
export function clampCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}
