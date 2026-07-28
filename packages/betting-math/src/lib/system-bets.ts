import { generateCombinations } from './combinations';

/**
 * Every "full cover" line for a system bet: every `k`-fold combination of
 * leg indices, for each `k` in `folds`.
 *
 * ```ts
 * // A Trixie over 3 legs: 3 doubles + 1 treble.
 * getFullCoverLines(3, [2, 3]);
 * // [[0,1],[0,2],[1,2], [0,1,2]]
 *
 * // A Lucky 15 over 4 legs: 4 singles + 6 doubles + 4 trebles + 1 fourfold.
 * getFullCoverLines(4, [1, 2, 3, 4]);
 * ```
 *
 * This package ships no named-system table (no "Trixie"/"Yankee" constants)
 * — every system bet is just a `(legCount, folds)` pair. See the README's
 * recipes table for the standard `folds` arrays behind each common name.
 *
 * Lines are grouped by ascending fold size, then in the same lexicographic
 * order `generateCombinations` produces within each fold. Duplicate fold
 * values in `folds` are ignored (each fold size contributes its lines once).
 *
 * Throws if `legCount` isn't a positive integer, or if any fold is outside
 * `[1, legCount]`.
 */
export function getFullCoverLines(
  legCount: number,
  folds: readonly number[],
): readonly (readonly number[])[] {
  if (!Number.isInteger(legCount) || legCount < 1) {
    throw new RangeError(
      `getFullCoverLines: legCount must be a positive integer, got ${legCount}.`,
    );
  }
  const uniqueSortedFolds = [...new Set(folds)].sort((a, b) => a - b);
  for (const fold of uniqueSortedFolds) {
    if (!Number.isInteger(fold) || fold < 1 || fold > legCount) {
      throw new RangeError(
        `getFullCoverLines: fold ${fold} is out of range — must be an integer in [1, ${legCount}].`,
      );
    }
  }

  const legIndices = Array.from({ length: legCount }, (_, i) => i);
  return uniqueSortedFolds.flatMap((fold) =>
    generateCombinations(legIndices, fold),
  );
}

/**
 * The number of lines {@link getFullCoverLines} would generate, without
 * generating them — `Σ C(legCount, fold)` over the (deduplicated) `folds`.
 *
 * Useful for validating a stake total or displaying a bet's line count
 * without paying the cost of enumerating every combination.
 */
export function countFullCoverLines(
  legCount: number,
  folds: readonly number[],
): number {
  if (!Number.isInteger(legCount) || legCount < 1) {
    throw new RangeError(
      `countFullCoverLines: legCount must be a positive integer, got ${legCount}.`,
    );
  }
  const uniqueFolds = new Set(folds);
  let total = 0;
  for (const fold of uniqueFolds) {
    if (!Number.isInteger(fold) || fold < 1 || fold > legCount) {
      throw new RangeError(
        `countFullCoverLines: fold ${fold} is out of range — must be an integer in [1, ${legCount}].`,
      );
    }
    total += binomialCoefficient(legCount, fold);
  }
  return total;
}

function binomialCoefficient(n: number, k: number): number {
  const effectiveK = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < effectiveK; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}
