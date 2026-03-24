import type { Bet } from "@betting/db";

/**
 * Summary of ROI across a collection of bets
 */
export interface ROISummary {
  /** Total number of bets placed */
  totalBets: number;
  /** Number of winning bets */
  wins: number;
  /** Number of losing bets */
  losses: number;
  /** Number of push (tie) bets */
  pushes: number;
  /** Total units wagered across all bets */
  totalUnitsWagered: number;
  /** Net units won (or lost if negative) */
  totalUnitsWon: number;
  /** Return on investment as a percentage */
  roi: number;
}

/**
 * Calculate Closing Line Value (CLV) for a single bet
 *
 * CLV measures whether you got better odds than the closing line.
 * Positive CLV means you beat the market — a sign of long-term edge.
 *
 * @param betOdds - American odds at time of bet placement
 * @param closingOdds - American odds at game start (closing line)
 * @returns CLV in percentage points (positive = beat the closing line)
 */
export function closingLineValue(
  betOdds: number,
  closingOdds: number
): number {
  const impliedProbBet = americanToImplied(betOdds);
  const impliedProbClosing = americanToImplied(closingOdds);

  // CLV = implied probability of closing line - implied probability of your bet
  // Positive means your bet had lower implied probability = better odds = positive CLV
  return (impliedProbClosing - impliedProbBet) * 100;
}

/**
 * Calculate ROI summary across a set of bets
 *
 * Units wagered = sum of all bet.units
 * Units won = sum of units * payout for wins, minus units for losses
 * Pushes return units (net 0)
 *
 * @param bets - Array of Bet records
 * @returns ROISummary with win/loss/push record, units, and ROI
 */
export function roiSummary(bets: Bet[]): ROISummary {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let totalUnitsWagered = 0;
  let totalUnitsWon = 0;

  for (const bet of bets) {
    totalUnitsWagered += bet.units;

    if (bet.result === "WIN") {
      wins++;
      const payout = americanOddsToPayout(bet.odds);
      totalUnitsWon += bet.units * payout;
    } else if (bet.result === "LOSS") {
      losses++;
      totalUnitsWon -= bet.units;
    } else if (bet.result === "PUSH") {
      pushes++;
      // push returns units, net 0
    }
    // PENDING bets don't affect ROI
  }

  const roi =
    totalUnitsWagered > 0 ? (totalUnitsWon / totalUnitsWagered) * 100 : 0;

  return {
    totalBets: bets.length,
    wins,
    losses,
    pushes,
    totalUnitsWagered,
    totalUnitsWon,
    roi,
  };
}

/** Convert American odds to decimal profit per unit wagered */
function americanOddsToPayout(americanOdds: number): number {
  if (americanOdds > 0) {
    return americanOdds / 100;
  } else {
    return 100 / Math.abs(americanOdds);
  }
}

/** Convert American odds to implied probability */
function americanToImplied(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}
