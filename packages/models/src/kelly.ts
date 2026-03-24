/**
 * Kelly Criterion calculator for sports betting
 */

export interface KellyResult {
  /** Recommended fraction of bankroll to wager */
  fraction: number;
  /** Edge percentage over the implied probability */
  edgePercent: number;
  /** Implied probability from the American odds */
  impliedProb: number;
  /** Fair (break-even) odds in American format */
  fairOdds: number;
}

/**
 * Convert American odds to implied probability
 * Handles both positive (+) and negative (-) American odds.
 *
 * @param americanOdds - American format odds (e.g. -110, +150)
 * @returns Implied probability as a decimal between 0 and 1
 */
export function impliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Calculate the Kelly fraction for a given bet
 *
 * Uses the formula: f = (b*p - q) / b
 * where b = decimal odds - 1, p = win probability, q = 1 - p
 *
 * Applies a fractional multiplier (default 0.25 for quarter-Kelly)
 * to reduce variance. Returns 0 if the edge is negative.
 *
 * @param winProbability - Your estimated win probability (0 to 1)
 * @param americanOdds - American format odds for the bet
 * @param fractionMultiplier - Fraction of full Kelly to use (default 0.25)
 * @returns KellyResult with fraction and supporting metrics
 */
export function kellyFraction(
  winProbability: number,
  americanOdds: number,
  fractionMultiplier = 0.25
): KellyResult {
  const impliedProb = impliedProbability(americanOdds);

  // Convert American odds to decimal odds
  let decimalOdds: number;
  if (americanOdds > 0) {
    decimalOdds = americanOdds / 100 + 1;
  } else {
    decimalOdds = 100 / Math.abs(americanOdds) + 1;
  }

  const b = decimalOdds - 1; // net odds received on the wager
  const p = winProbability;
  const q = 1 - p;

  const fullKelly = (b * p - q) / b;
  const fraction = Math.max(0, fullKelly * fractionMultiplier);

  const edgePercent = (p - impliedProb) * 100;

  // Fair odds: convert win probability to American odds
  let fairOdds: number;
  if (p >= 0.5) {
    fairOdds = -(p / (1 - p)) * 100;
  } else {
    fairOdds = ((1 - p) / p) * 100;
  }

  return {
    fraction,
    edgePercent,
    impliedProb,
    fairOdds,
  };
}
