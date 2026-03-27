import type { Game, OddsSnapshot, PublicBettingData } from "@edgeiq/db";
import type { LineMovementResult } from "@edgeiq/models";

export interface GameAnalysisParams {
  game: Game;
  latestOdds: OddsSnapshot;
  lineMovement: LineMovementResult;
  publicBetting?: PublicBettingData | null;
  injuryNotes?: string;
}

export const GAME_ANALYSIS_SYSTEM_PROMPT = `You are a sharp sports betting analyst. You identify edges based on line movement, public betting percentages, and market inefficiencies. Be concise and data-driven. Never recommend betting more than 2 units on any single game.`;

export function buildGameAnalysisPrompt(params: GameAnalysisParams): string {
  const { game, latestOdds, lineMovement, publicBetting, injuryNotes } = params;

  const spreadInfo =
    lineMovement.openingSpread !== null && lineMovement.currentSpread !== null
      ? `Opening Spread: ${lineMovement.openingSpread > 0 ? "+" : ""}${lineMovement.openingSpread}
Current Spread: ${lineMovement.currentSpread > 0 ? "+" : ""}${lineMovement.currentSpread}
Spread Movement: ${lineMovement.delta.toFixed(1)} points ${lineMovement.direction}`
      : "Spread: N/A";

  const totalInfo =
    lineMovement.openingTotal !== null && lineMovement.currentTotal !== null
      ? `Opening Total: ${lineMovement.openingTotal}
Current Total: ${lineMovement.currentTotal}`
      : "";

  const publicBettingInfo = publicBetting
    ? `Home: ${publicBetting.homeTicketPct.toFixed(1)}% of tickets / ${publicBetting.homeMoneyPct.toFixed(1)}% of money
Away: ${publicBetting.awayTicketPct.toFixed(1)}% of tickets / ${publicBetting.awayMoneyPct.toFixed(1)}% of money`
    : "Not available";

  return `**GAME: ${game.awayTeam} @ ${game.homeTeam}**
Sport: ${game.sport}
Commence Time: ${game.commenceTime.toISOString()}

**CURRENT ODDS (${latestOdds.bookmaker})**
Home Moneyline: ${latestOdds.homeOdds > 0 ? "+" : ""}${latestOdds.homeOdds}
Away Moneyline: ${latestOdds.awayOdds > 0 ? "+" : ""}${latestOdds.awayOdds}
Market: ${latestOdds.market}

**LINE MOVEMENT**
${spreadInfo}
${totalInfo}
Sharp Money Indicator: ${lineMovement.isSharp ? "YES - Reverse line movement detected" : "No"}

**PUBLIC BETTING PERCENTAGES**
${publicBettingInfo}

${injuryNotes ? `**INJURY NOTES**\n${injuryNotes}\n` : ""}

Analyze this game and respond in this exact format:

EDGE_SCORE: [number 1-10]
BET: [Home: TeamName / Away: TeamName / None]
RECOMMENDATION: [STRONG_BET / LEAN / PASS]

SUMMARY:
[2-3 sentences explaining the betting situation and which side has value, or why to pass]

KEY_FACTORS:
- [factor 1]
- [factor 2]
- [factor 3]

Rules: STRONG_BET = edge score 7+, LEAN = 4-6, PASS = 1-3 or no clear edge. Always specify a team for STRONG_BET and LEAN.`;
}
