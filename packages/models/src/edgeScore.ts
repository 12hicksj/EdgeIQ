import type { PublicBettingData } from "@betting/db";
import type { LineMovementResult } from "./lineMovement";

/**
 * Parameters for computing the edge score
 */
export interface EdgeScoreParams {
  /** Line movement analysis result */
  lineMovement: LineMovementResult;
  /** Most recent public betting data */
  publicBetting: PublicBettingData;
  /** Kelly fraction (quarter-Kelly recommended bet size) */
  kellyFraction: number;
  /** True if a key injury has been reported for this game */
  injuryFlag: boolean;
}

/**
 * Compute a 0–10 edge score for a betting opportunity
 *
 * Scoring rules (additive):
 * - +3 if reverse-line-movement (sharp indicator) is detected
 * - +2 if public money % and ticket % diverge by >15 points (steam move signal)
 * - +2 if kellyFraction > 0.05
 * - +1 if movementMagnitude > 1.5 (significant line move)
 * - -1 if injuryFlag is true (key injury reported)
 *
 * Result is clamped between 0 and 10.
 *
 * @param params - EdgeScoreParams
 * @returns Edge score between 0 and 10
 */
export function computeEdgeScore(params: EdgeScoreParams): number {
  const { lineMovement, publicBetting, kellyFraction, injuryFlag } = params;

  let score = 0;

  // +3 if sharp indicator (reverse-line-movement)
  if (lineMovement.isSharp) {
    score += 3;
  }

  // +2 if money % and ticket % diverge by more than 15 points
  // Divergence = |homeMoneyPct - homeTicketPct| or |awayMoneyPct - awayTicketPct|
  const homeDivergence = Math.abs(
    publicBetting.homeMoneyPct - publicBetting.homeTicketPct
  );
  const awayDivergence = Math.abs(
    publicBetting.awayMoneyPct - publicBetting.awayTicketPct
  );
  if (homeDivergence > 15 || awayDivergence > 15) {
    score += 2;
  }

  // +2 if Kelly fraction suggests meaningful edge
  if (kellyFraction > 0.05) {
    score += 2;
  }

  // +1 if significant line movement
  if (lineMovement.delta > 1.5) {
    score += 1;
  }

  // -1 if key injury reported
  if (injuryFlag) {
    score -= 1;
  }

  // Clamp between 0 and 10
  return Math.max(0, Math.min(10, score));
}
