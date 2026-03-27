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

export const GAME_ANALYSIS_SYSTEM_PROMPT = `You are a sharp sports betting analyst. Assess betting value using market odds, line movement, and public betting patterns.

EDGE SCORE — express as one decimal (e.g. 6.4, never just 6):
- 8.0-10.0: Strong edge — sharp money signal, clear reverse line movement, or obvious market mispricing
- 5.5-7.9: Moderate edge — favorable line movement, mild sharp action, or slight implied probability edge
- 3.5-5.4: Slight lean — minor signals, mostly efficient market
- 1.0-3.4: No edge — market appears fully efficient

When only moneyline odds are available, anchor around 4.5-5.5 for evenly matched games. A notable mismatch in true probability vs. posted odds can push to 6.5-7.0. Never exceed 7.5 without a concrete sharp-money signal. Always use exactly one decimal place.`;

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

  const publicSection = publicBetting
    ? `Public Betting:\nHome: ${publicBetting.homeTicketPct.toFixed(1)}% tickets / ${publicBetting.homeMoneyPct.toFixed(1)}% money\nAway: ${publicBetting.awayTicketPct.toFixed(1)}% tickets / ${publicBetting.awayMoneyPct.toFixed(1)}% money`
    : "Public Betting: Not available";

  return `GAME: ${game.awayTeam} @ ${game.homeTeam}
Sport: ${game.sport}
Tip-off: ${game.commenceTime.toISOString()}

ODDS (${latestOdds.bookmaker})
Home (${game.homeTeam}): ${latestOdds.homeOdds > 0 ? "+" : ""}${latestOdds.homeOdds} => ${homeTrue}% true prob
Away (${game.awayTeam}): ${latestOdds.awayOdds > 0 ? "+" : ""}${latestOdds.awayOdds} => ${awayTrue}% true prob
Vig: ${vig}%

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
