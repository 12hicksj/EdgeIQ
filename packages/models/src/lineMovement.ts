import type { OddsSnapshot, PublicBettingData } from "@betting/db";

/**
 * Result of line movement analysis between snapshots
 */
export interface LineMovementResult {
  /** Opening spread (first snapshot) */
  openingSpread: number | null;
  /** Current spread (most recent snapshot) */
  currentSpread: number | null;
  /** Absolute change in spread */
  delta: number;
  /** Direction: "toward_home" | "toward_away" | "none" */
  direction: "toward_home" | "toward_away" | "none";
  /** True if reverse-line-movement detected (sharp money indicator) */
  isSharp: boolean;
  /** Opening total (first snapshot) */
  openingTotal: number | null;
  /** Current total (most recent snapshot) */
  currentTotal: number | null;
}

/**
 * Detect line movement from a series of OddsSnapshot records
 *
 * Compares the first and last snapshots in the provided array.
 * The array should be sorted ascending by capturedAt.
 *
 * @param snapshots - Array of OddsSnapshot records ordered by capturedAt ASC
 * @returns LineMovementResult describing spread/total changes
 */
export function detectLineMovement(
  snapshots: OddsSnapshot[]
): LineMovementResult {
  if (snapshots.length === 0) {
    return {
      openingSpread: null,
      currentSpread: null,
      delta: 0,
      direction: "none",
      isSharp: false,
      openingTotal: null,
      currentTotal: null,
    };
  }

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];

  const openingSpread = first.spread ?? null;
  const currentSpread = last.spread ?? null;
  const openingTotal = first.total ?? null;
  const currentTotal = last.total ?? null;

  let delta = 0;
  let direction: LineMovementResult["direction"] = "none";

  if (openingSpread !== null && currentSpread !== null) {
    delta = Math.abs(currentSpread - openingSpread);
    if (currentSpread > openingSpread) {
      direction = "toward_away"; // positive spread = home team underdog gaining
    } else if (currentSpread < openingSpread) {
      direction = "toward_home"; // home team becoming more favored
    }
  } else if (openingTotal !== null && currentTotal !== null) {
    delta = Math.abs(currentTotal - openingTotal);
    if (currentTotal !== openingTotal) {
      direction = currentTotal > openingTotal ? "toward_home" : "toward_away";
    }
  }

  return {
    openingSpread,
    currentSpread,
    delta,
    direction,
    isSharp: false, // set by detectReverseLineMovement
    openingTotal,
    currentTotal,
  };
}

/**
 * Detect reverse line movement (sharp money indicator)
 *
 * Returns true if the line moved against the public — i.e., the public
 * is betting >55% on one side but the line moved the other way.
 * This typically indicates sharp (professional) money on the other side.
 *
 * @param publicBetting - Most recent PublicBettingData record
 * @param movement - LineMovementResult from detectLineMovement
 * @returns true if reverse-line-movement is detected
 */
export function detectReverseLineMovement(
  publicBetting: PublicBettingData,
  movement: LineMovementResult
): boolean {
  if (movement.direction === "none" || movement.delta < 0.5) {
    return false; // no meaningful movement
  }

  const publicFavorsHome = publicBetting.homeTicketPct > 55;
  const publicFavorsAway = publicBetting.awayTicketPct > 55;

  if (publicFavorsHome && movement.direction === "toward_away") {
    // Public betting home but line moving toward away team = sharp money on away
    return true;
  }

  if (publicFavorsAway && movement.direction === "toward_home") {
    // Public betting away but line moving toward home team = sharp money on home
    return true;
  }

  return false;
}
