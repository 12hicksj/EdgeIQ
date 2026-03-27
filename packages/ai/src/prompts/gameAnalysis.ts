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

export const GAME_ANALYSIS_SYSTEM_PROMPT = `You are a sharp sports betting analyst. Score betting edge from 1.0 to 10.0 using a signal-based framework. Every game has a unique score — do NOT cluster near 5.0.

SIGNAL-BASED SCORING — start at 5.0, apply each adjustment that fits:

BULLISH signals (push score UP):
+2.5 to +3.5  Sharp reverse line movement confirmed (public overwhelmingly on one side, money moving the other)
+1.5 to +2.5  Clear line movement without public explanation (≥1.5 pt spread move, or sharp total shift)
+1.0 to +1.5  Mild but consistent public/money divergence (15-30 pt split between ticket% and money%)
+0.5 to +1.0  Slight line drift or minor steam suggesting informed action

BEARISH signals (push score DOWN):
-2.0 to -3.0  Zero movement + balanced public betting = efficient market (score floors at 1.5)
-1.0 to -1.5  Minimal data (1-2 snapshots only) with no detectable sharp signals
-0.5 to -1.0  Heavy favorite (true prob >70%) with movement in expected direction = square action, no edge
-0.5           High vig (>6%) without corresponding sharp signal = book neutralized exposure

CAPS: 8.5+ requires confirmed reverse line movement with supporting evidence. 1.5 is the floor for any game with odds data.

RECOMMENDATION thresholds:
STRONG_BET: 7.5+  |  LEAN: 5.5–7.4  |  PASS: below 5.5

Think through each applicable signal explicitly before outputting the score. Express score as exactly one decimal.`;

function impliedProb(americanOdds: number): number {
  if (americanOdds > 0) return 100 / (americanOdds + 100);
  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

export function buildGameAnalysisPrompt(params: GameAnalysisParams): string {
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

  return `GAME: ${game.awayTeam} @ ${game.homeTeam}
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

EDGE_SCORE: [X.X]
BET: [Home: TeamName | Away: TeamName | No Bet]
RECOMMENDATION: [STRONG_BET | LEAN | PASS]
SUMMARY: [2-3 sentences on the betting situation and what drives the score]
KEY_FACTORS:
- [factor 1]
- [factor 2]
- [factor 3]`;
}
