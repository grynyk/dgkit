/**
 * Every `k`-element combination of `items`, in lexicographic index order.
 *
 * ```ts
 * generateCombinations(['a', 'b', 'c'], 2);
 * // [['a','b'], ['a','c'], ['b','c']]
 * ```
 *
 * Returns `[[]]` (one empty combination) when `k === 0`, and `[]` when `k`
 * is negative or greater than `items.length` — a bet with no legs or asking
 * for more folds than there are selections has no combinations, not an
 * error, since callers (see `system-bets.ts`) sweep a whole range of `k`.
 */
export function generateCombinations<T>(
  items: readonly T[],
  k: number,
): readonly (readonly T[])[] {
  if (!Number.isInteger(k) || k < 0 || k > items.length) {
    return [];
  }
  if (k === 0) {
    return [[]];
  }

  const result: T[][] = [];
  const current: T[] = [];

  function recurse(start: number): void {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    // Prune: stop once there aren't enough remaining items to fill the
    // combination, instead of walking to the end and finding nothing.
    const remainingNeeded = k - current.length;
    for (let i = start; i <= items.length - remainingNeeded; i++) {
      current.push(items[i]);
      recurse(i + 1);
      current.pop();
    }
  }

  recurse(0);
  return result;
}
