/**
 * Result of collapsing the void entries out of one combination's legs.
 *
 * @typeParam T a leg-like value; this module doesn't care what it is beyond
 * the caller telling it which entries are void.
 */
export interface VoidCollapseResult<T> {
  /** The non-void legs, in their original relative order. */
  readonly legs: readonly T[];
  /** `true` when every leg in the combination was void. */
  readonly allVoid: boolean;
}

/**
 * Remove void legs from one combination, collapsing it to the next-lower
 * fold.
 *
 * ```ts
 * collapseVoidLegs([legA, legB, legC], [false, true, false]);
 * // { legs: [legA, legC], allVoid: false }  — a treble becomes a double
 * ```
 *
 * A combination whose legs are *all* void collapses to nothing
 * (`allVoid: true`) — the caller (see `settlement.ts`) treats that as a
 * void line and returns the stake, rather than settling an empty
 * accumulator.
 *
 * `isVoid` is a same-length parallel array rather than a predicate over
 * `legs` so this module stays agnostic to what a "leg" actually looks like
 * — the settlement engine decides what counts as void for the win part vs.
 * the each-way place part of the same leg.
 */
export function collapseVoidLegs<T>(
  legs: readonly T[],
  isVoid: readonly boolean[],
): VoidCollapseResult<T> {
  if (legs.length !== isVoid.length) {
    throw new RangeError(
      `collapseVoidLegs: legs (${legs.length}) and isVoid (${isVoid.length}) must be the same length.`,
    );
  }
  const surviving = legs.filter((_, i) => !isVoid[i]);
  return { legs: surviving, allVoid: surviving.length === 0 };
}
