import type { Game, OddsSnapshot, PublicBettingData } from "@edgeiq/db";
import type { LineMovementResult } from "@edgeiq/models";

export interface GameAnalysisParams {
  game: Game;
  latestOdds: OddsSnapshot;
  lineMovement: LineMovementResult;
  snapshotCount: number;
  publicBetting?: PublicBettingData | null;
  injuryNotes?: string;
}

export const GAME_ANALYSIS_SYSTEM_PROMPT = `You are a sharp sports betting analyst providing context on top of a pre-computed signal score.

You will receive a RAW_SIGNAL_SCORE already calculated from market data (line movement, public/money divergence, vig, spread). Your job is to output a FINAL score by adjusting it ±1.5 based on factors the market data alone can't capture:

ADJUST UP (+0.5 to +1.5) if you know:
- This sport/matchup has historically sharp line movement patterns
- One team has a meaningful situational edge (rest, travel, motivation)
- The game total or spread suggests a style matchup that creates overlay

ADJUST DOWN (-0.5 to -1.5) if you know:
- This is a very public-facing game (big market teams, primetime) inflating the signals
- The matchup is lopsided in a way not captured by odds alone
- There is a known reason for the line move that isn't sharp action

HOLD (0 adjustment) if you have no meaningful additional context beyond the signal data.

RECOMMENDATION thresholds (use FINAL score):
STRONG_BET: 7.0+  |  LEAN: 5.0–6.9  |  PASS: below 5.0

Express FINAL score as exactly one decimal. The RAW_SIGNAL_SCORE is your anchor — only move away from it with genuine reasoning.`;

function impliedProb(americanOdds: number): number {
  if (americanOdds > 0) return 100 / (americanOdds + 100);
  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

export function computeRawSignalScore(params: GameAnalysisParams): number {
  const { latestOdds, lineMovement, snapshotCount, publicBetting } = params;

  const homeImp = impliedProb(latestOdds.homeOdds);
  const awayImp = impliedProb(latestOdds.awayOdds);
  const juice = homeImp + awayImp;
  const vig = juice - 1;
  const favProb = Math.max(homeImp, awayImp) / juice;

  let score = 5.0;

  // --- Line movement signal (strongest available signal) ---
  if (lineMovement.isSharp) {
    // Confirmed reverse line movement: public one way, money the other
    score += lineMovement.delta >= 1.5 ? 3.0 : 2.5;
  } else if (lineMovement.delta >= 2.0) {
    score += 2.0;
  } else if (lineMovement.delta >= 1.0) {
    score += 1.0;
  } else if (lineMovement.delta >= 0.5) {
    score += 0.5;
  } else if (snapshotCount >= 8 && lineMovement.delta === 0) {
    // Many snapshots, zero movement = efficient market confirmed
    score -= 0.75;
  }

  // --- Public / money divergence signal ---
  if (publicBetting) {
    const homeDiv = Math.abs(publicBetting.homeTicketPct - publicBetting.homeMoneyPct);
    const awayDiv = Math.abs(publicBetting.awayTicketPct - publicBetting.awayMoneyPct);
    const maxDiv = Math.max(homeDiv, awayDiv);

    if (maxDiv >= 30) score += 2.0;
    else if (maxDiv >= 20) score += 1.5;
    else if (maxDiv >= 12) score += 0.75;
    else if (maxDiv >= 6) score += 0.25;
    // balanced public = no adjustment (neither bullish nor bearish)
  } else {
    // No public data: slight uncertainty penalty when line is also stable
    if (lineMovement.delta === 0) score -= 0.25;
  }

  // --- Data quality ---
  if (snapshotCount <= 1) score -= 1.0;
  else if (snapshotCount <= 3) score -= 0.25;

  // --- Overlay penalty for heavy favorites ---
  if (favProb > 0.78) score -= 1.0;
  else if (favProb > 0.68) score -= 0.5;

  // --- Vig signal ---
  // High vig without sharp signal = books have heavy public exposure
  if (vig > 0.065 && !lineMovement.isSharp) score -= 0.25;

  return Math.max(1.5, Math.min(9.0, Math.round(score * 10) / 10));
}

export function buildGameAnalysisPrompt(params: GameAnalysisParams, rawSignalScore: number): string {
  const { game, latestOdds, lineMovement, snapshotCount, publicBetting, injuryNotes } = params;

  const homeImplied = impliedProb(latestOdds.homeOdds);
  const awayImplied = impliedProb(latestOdds.awayOdds);
  const totalJuice = homeImplied + awayImplied;
  const homeTrue = ((homeImplied / totalJuice) * 100).toFixed(1);
  const awayTrue = ((awayImplied / totalJuice) * 100).toFixed(1);
  const vig = ((totalJuice - 1) * 100).toFixed(2);

  let lineSection: string;
  if (snapshotCount <= 1) {
    lineSection = `Line Movement: No history yet (${snapshotCount} snapshot captured so far)`;
  } else if (lineMovement.delta === 0) {
    lineSection = `Line Movement: Stable across ${snapshotCount} snapshots — no movement detected`;
  } else {
    const sp =
      lineMovement.openingSpread !== null && lineMovement.currentSpread !== null
        ? `Opening: ${lineMovement.openingSpread > 0 ? "+" : ""}${lineMovement.openingSpread} / Current: ${lineMovement.currentSpread > 0 ? "+" : ""}${lineMovement.currentSpread} (${lineMovement.delta.toFixed(1)} pts ${lineMovement.direction}, ${snapshotCount} snapshots)`
        : "Spread: N/A";
    const tot =
      lineMovement.openingTotal !== null && lineMovement.currentTotal !== null
        ? `\nTotal: ${lineMovement.openingTotal} -> ${lineMovement.currentTotal}`
        : "";
    lineSection = `${sp}${tot}\nSharp money: ${lineMovement.isSharp ? "YES — reverse line movement" : "No"}`;
  }

  let publicSection: string;
  if (publicBetting) {
    const homeDiv = Math.abs(publicBetting.homeTicketPct - publicBetting.homeMoneyPct);
    const awayDiv = Math.abs(publicBetting.awayTicketPct - publicBetting.awayMoneyPct);
    const maxDiv = Math.max(homeDiv, awayDiv);
    const sharpSide = homeDiv > awayDiv
      ? (publicBetting.homeMoneyPct > publicBetting.homeTicketPct ? `Away (sharp money vs public on ${game.homeTeam})` : `Home (sharp money vs public on ${game.awayTeam})`)
      : (publicBetting.awayMoneyPct > publicBetting.awayTicketPct ? `Home (sharp money vs public on ${game.awayTeam})` : `Away (sharp money vs public on ${game.homeTeam})`);
    const divergenceLabel = maxDiv >= 20 ? `STRONG divergence (${maxDiv.toFixed(0)}pt gap) — ${sharpSide}`
      : maxDiv >= 10 ? `Mild divergence (${maxDiv.toFixed(0)}pt gap) — ${sharpSide}`
      : `Balanced (${maxDiv.toFixed(0)}pt gap — no clear sharp signal)`;
    publicSection = `Public Betting:\nHome: ${publicBetting.homeTicketPct.toFixed(1)}% tickets / ${publicBetting.homeMoneyPct.toFixed(1)}% money\nAway: ${publicBetting.awayTicketPct.toFixed(1)}% tickets / ${publicBetting.awayMoneyPct.toFixed(1)}% money\nSignal: ${divergenceLabel}`;
  } else {
    publicSection = "Public Betting: Not available";
  }

  const vigNum = parseFloat(vig);
  const vigLabel = vigNum > 6 ? `HIGH (${vig}%) — books have heavy exposure, square-heavy action likely`
    : vigNum > 4 ? `Normal (${vig}%)`
    : `Low (${vig}%) — sharp/efficient market`;
  const homeTrueNum = parseFloat(homeTrue);
  const favoriteLabel = homeTrueNum > 72 ? `${game.homeTeam} heavy favorite (${homeTrue}% true prob) — limited overlay`
    : homeTrueNum < 28 ? `${game.awayTeam} heavy favorite (${awayTrue}% true prob) — limited overlay`
    : `Competitive matchup (${homeTrue}% / ${awayTrue}%)`;

  return `RAW_SIGNAL_SCORE: ${rawSignalScore.toFixed(1)} (computed from line movement, public/money %, vig, data quality)

GAME: ${game.awayTeam} @ ${game.homeTeam}
Sport: ${game.sport}
Tip-off: ${game.commenceTime.toISOString()}

ODDS (${latestOdds.bookmaker})
Home (${game.homeTeam}): ${latestOdds.homeOdds > 0 ? "+" : ""}${latestOdds.homeOdds} => ${homeTrue}% true prob
Away (${game.awayTeam}): ${latestOdds.awayOdds > 0 ? "+" : ""}${latestOdds.awayOdds} => ${awayTrue}% true prob
Vig: ${vigLabel}
Matchup: ${favoriteLabel}

LINE MOVEMENT
${lineSection}

${publicSection}
${injuryNotes ? `\nINJURY NOTES\n${injuryNotes}` : ""}

Respond in this EXACT format:

EDGE_SCORE: [X.X — your final adjusted score]
ADJUSTMENT: [+X.X or -X.X or 0.0 — how much you moved from RAW_SIGNAL_SCORE and why in one phrase]
BET: [Home: TeamName | Away: TeamName | No Bet]
RECOMMENDATION: [STRONG_BET | LEAN | PASS]
SUMMARY: [2-3 sentences on the betting situation and what drives the score]`;
}
