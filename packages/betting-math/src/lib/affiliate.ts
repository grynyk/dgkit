import {
  addFractions,
  compareFractions,
  fraction,
  fractionToString,
  maxFraction,
  minFraction,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';

/**
 * iGaming affiliate commission economics: CPA, revenue-share, and hybrid
 * commission calculators, plus negative-carryover balance tracking across
 * settlement periods.
 *
 * Two caveats carry over from the rest of this package's "bring your own
 * numbers" philosophy (see `rule4.ts`, `cash-out.ts`):
 *
 * - **No NGR computation.** Net Gaming Revenue (`ngr`) is always a
 *   caller-supplied number — operators disagree on exactly what nets out
 *   (bonuses, chargebacks, payment fees, …) before revenue counts as "net,"
 *   so this module never derives it from raw deposits/withdrawals itself.
 * - **Carryover eligibility and payout thresholds are deal terms, not
 *   package defaults.** `periodCommission` in {@link applyNegativeCarryover}
 *   is conventionally the RevShare portion of a period alone — CPA is a
 *   flat per-action cost, typically paid regardless of NGR performance, and
 *   not clawed back by a losing period. A minimum-payout threshold on a
 *   *positive* balance (withholding a small payable amount until it
 *   accumulates) is a distinct deal term this module doesn't implement —
 *   layer it on top of `payable` yourself if your deal has one.
 */

/**
 * CPA (cost-per-acquisition) commission: a flat fee per qualifying action
 * (e.g. a first-time depositor).
 *
 * ```ts
 * calculateCpaCommission(40, fraction(75, 1)); // 3000 — 40 FTDs at $75 CPA
 * ```
 *
 * Throws if `qualifyingCount` isn't a non-negative integer, or `cpaRate` is
 * negative — a per-acquisition cost is never negative in any real deal.
 */
export function calculateCpaCommission(
  qualifyingCount: number,
  cpaRate: Fraction,
): Fraction {
  if (!Number.isInteger(qualifyingCount) || qualifyingCount < 0) {
    throw new RangeError(
      `calculateCpaCommission: qualifyingCount must be a non-negative integer, got ${qualifyingCount}.`,
    );
  }
  if (compareFractions(cpaRate, ZERO) < 0) {
    throw new RangeError(
      `calculateCpaCommission: cpaRate must be >= 0, got ${fractionToString(cpaRate)}.`,
    );
  }
  return multiplyFractions(fraction(qualifyingCount), cpaRate);
}

/**
 * RevShare commission: a percentage of Net Gaming Revenue (NGR) the
 * operator kept from referred players for the period.
 *
 * ```ts
 * calculateRevShareCommission(fraction(10_000, 1), fraction(15, 100)); // 1500
 * calculateRevShareCommission(fraction(-2_000, 1), fraction(15, 100)); // -300 — a losing period for the operator
 * ```
 *
 * `ngr` may be negative — a period where referred players won more than
 * they lost — which is exactly what feeds {@link applyNegativeCarryover}.
 * Throws if `revSharePercent` is outside `[0, 1]`.
 */
export function calculateRevShareCommission(
  ngr: Fraction,
  revSharePercent: Fraction,
): Fraction {
  requirePercent(revSharePercent, 'calculateRevShareCommission');
  return multiplyFractions(ngr, revSharePercent);
}

function requirePercent(value: Fraction, context: string): void {
  if (compareFractions(value, ZERO) < 0 || compareFractions(value, ONE) > 0) {
    throw new RangeError(
      `${context}: revSharePercent must be in [0, 1], got ${fractionToString(value)}.`,
    );
  }
}

/** Input for {@link calculateHybridCommission}. */
export interface HybridCommissionInput {
  readonly qualifyingCount: number;
  readonly cpaRate: Fraction;
  readonly ngr: Fraction;
  readonly revSharePercent: Fraction;
}

/** Breakdown returned by {@link calculateHybridCommission}. */
export interface HybridCommissionResult {
  readonly cpaPortion: Fraction;
  readonly revSharePortion: Fraction;
  readonly total: Fraction;
}

/**
 * Hybrid commission: a CPA portion plus a RevShare portion, combined.
 *
 * ```ts
 * calculateHybridCommission({
 *   qualifyingCount: 40,
 *   cpaRate: fraction(75, 1),
 *   ngr: fraction(10_000, 1),
 *   revSharePercent: fraction(15, 100),
 * });
 * // { cpaPortion: 3000, revSharePortion: 1500, total: 4500 }
 * ```
 *
 * Delegates to {@link calculateCpaCommission} and
 * {@link calculateRevShareCommission} — their validation errors propagate
 * unchanged. Returns the breakdown alongside the total for auditability.
 */
export function calculateHybridCommission(
  input: HybridCommissionInput,
): HybridCommissionResult {
  const cpaPortion = calculateCpaCommission(
    input.qualifyingCount,
    input.cpaRate,
  );
  const revSharePortion = calculateRevShareCommission(
    input.ngr,
    input.revSharePercent,
  );
  return {
    cpaPortion,
    revSharePortion,
    total: addFractions(cpaPortion, revSharePortion),
  };
}

/** Options for {@link applyNegativeCarryover} and {@link runCarryoverLedger}. */
export interface NegativeCarryoverOptions {
  /**
   * The maximum magnitude of deficit retained into the next period. Omit
   * for uncapped carryover (the full deficit always carries); `ZERO` means
   * no carryover at all (any deficit is forgiven every period). Must be
   * `>= 0` if provided.
   */
  readonly carryoverCap?: Fraction;
}

/** Result of one period's negative-carryover settlement. */
export interface CarryoverResult {
  /** Paid out this period. Always `>= 0`. */
  readonly payable: Fraction;
  /** Deficit carried into the next period. Always `<= 0`. */
  readonly carriedBalance: Fraction;
}

function requireNonPositive(value: Fraction, context: string): void {
  if (compareFractions(value, ZERO) > 0) {
    throw new RangeError(
      `${context} must be <= 0, got ${fractionToString(value)}.`,
    );
  }
}

/**
 * Settle one period against a negative-carryover balance.
 *
 * ```ts
 * applyNegativeCarryover(fraction(-500, 1), fraction(300, 1));
 * // { payable: 0, carriedBalance: -200 } — the deficit shrinks but isn't cleared
 *
 * applyNegativeCarryover(fraction(-200, 1), fraction(800, 1));
 * // { payable: 600, carriedBalance: 0 } — the deficit clears, the rest is paid
 * ```
 *
 * `total = previousCarryover + periodCommission`; `payable` is whatever of
 * that is positive, `carriedBalance` is whatever is negative — floored at
 * `-carryoverCap` when a cap is given, so a capped deal forgives any
 * deficit beyond it rather than carrying it forever.
 *
 * `periodCommission` is conventionally the RevShare portion of the period
 * alone — see this module's top-level doc comment. Throws if
 * `previousCarryover` is positive, or if `carryoverCap` is negative.
 */
export function applyNegativeCarryover(
  previousCarryover: Fraction,
  periodCommission: Fraction,
  options: NegativeCarryoverOptions = {},
): CarryoverResult {
  requireNonPositive(
    previousCarryover,
    'applyNegativeCarryover: previousCarryover',
  );
  const { carryoverCap } = options;
  if (carryoverCap !== undefined && compareFractions(carryoverCap, ZERO) < 0) {
    throw new RangeError(
      `applyNegativeCarryover: carryoverCap must be >= 0, got ${fractionToString(carryoverCap)}.`,
    );
  }

  const total = addFractions(previousCarryover, periodCommission);
  const payable = maxFraction(total, ZERO);
  const uncappedDeficit = minFraction(total, ZERO);
  const carriedBalance =
    carryoverCap !== undefined
      ? maxFraction(uncappedDeficit, subtractFractions(ZERO, carryoverCap))
      : uncappedDeficit;

  return { payable, carriedBalance };
}

/** One period's carryover settlement, with its input commission included for auditability. */
export interface CarryoverLedgerEntry extends CarryoverResult {
  readonly periodCommission: Fraction;
}

/** Options for {@link runCarryoverLedger}. */
export interface CarryoverLedgerOptions extends NegativeCarryoverOptions {
  /** The balance carried in from a prior run. Defaults to `ZERO`. */
  readonly initialCarryover?: Fraction;
}

/** The full result of running a sequence of periods through negative carryover. */
export interface CarryoverLedgerResult {
  readonly periods: readonly CarryoverLedgerEntry[];
  readonly totalPayable: Fraction;
  /** Persist this to resume the ledger with a later batch of periods. */
  readonly finalCarryover: Fraction;
}

/**
 * Fold a sequence of periods' carryover-eligible commission through
 * negative carryover, one after another.
 *
 * ```ts
 * runCarryoverLedger([fraction(-500, 1), fraction(300, 1), fraction(800, 1)]);
 * // period 1: -500        -> { payable: 0,   carriedBalance: -500 }
 * // period 2: -500 + 300  -> { payable: 0,   carriedBalance: -200 }
 * // period 3: -200 + 800  -> { payable: 600, carriedBalance: 0 }
 * // totalPayable: 600, finalCarryover: 0
 * ```
 *
 * Starts from `options.initialCarryover` (default `ZERO`) rather than
 * always from zero, so a real ledger can be resumed across batches without
 * replaying its entire history — persist `finalCarryover` and pass it back
 * in as the next batch's `initialCarryover`.
 */
export function runCarryoverLedger(
  periodCommissions: readonly Fraction[],
  options: CarryoverLedgerOptions = {},
): CarryoverLedgerResult {
  const initialCarryover = options.initialCarryover ?? ZERO;
  requireNonPositive(initialCarryover, 'runCarryoverLedger: initialCarryover');

  const periods: CarryoverLedgerEntry[] = [];
  let carryover = initialCarryover;
  let totalPayable = ZERO;

  for (const periodCommission of periodCommissions) {
    const { payable, carriedBalance } = applyNegativeCarryover(
      carryover,
      periodCommission,
      { carryoverCap: options.carryoverCap },
    );
    periods.push({ periodCommission, payable, carriedBalance });
    totalPayable = addFractions(totalPayable, payable);
    carryover = carriedBalance;
  }

  return { periods, totalPayable, finalCarryover: carryover };
}
