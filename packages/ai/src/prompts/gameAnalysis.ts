import type { Game, OddsSnapshot, PublicBettingData } from "@edgeiq/db";
import type { LineMovementResult } from "@edgeiq/models";

export interface GameAnalysisParams {
  game: Game;
  latestOdds: OddsSnapshot;
  lineMovement: LineMovementResult;
  publicBetting: PublicBettingData;
  edgeScore: number;
  injuryNotes?: string;
}

export const GAME_ANALYSIS_SYSTEM_PROMPT = `You are a sharp sports betting analyst. You identify edges based on line movement, public betting percentages, and market inefficiencies. Be concise and data-driven. Never recommend betting more than 2 units on any single game.`;

/**
 * Build the game analysis prompt for Claude
 *
 * @param params - GameAnalysisParams with all game metrics
 * @returns Formatted prompt string for Claude
 */
export function buildGameAnalysisPrompt(params: GameAnalysisParams): string {
  const {
    game,
    latestOdds,
    lineMovement,
    publicBetting,
    edgeScore,
    injuryNotes,
  } = params;

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

  return `**GAME: ${game.awayTeam} @ ${game.homeTeam}**
Sport: ${game.sport}
Commence Time: ${game.commenceTime.toISOString()}

**CURRENT ODDS (${latestOdds.bookmaker})**
Home Odds: ${latestOdds.homeOdds > 0 ? "+" : ""}${latestOdds.homeOdds}
Away Odds: ${latestOdds.awayOdds > 0 ? "+" : ""}${latestOdds.awayOdds}
Market: ${latestOdds.market}

**LINE MOVEMENT**
${spreadInfo}
${totalInfo}
Sharp Money Indicator: ${lineMovement.isSharp ? "YES - Reverse line movement detected" : "No"}

**PUBLIC BETTING PERCENTAGES**
Home: ${publicBetting.homeTicketPct.toFixed(1)}% of tickets / ${publicBetting.homeMoneyPct.toFixed(1)}% of money
Away: ${publicBetting.awayTicketPct.toFixed(1)}% of tickets / ${publicBetting.awayMoneyPct.toFixed(1)}% of money

**ALGORITHMIC EDGE SCORE: ${edgeScore}/10**

${injuryNotes ? `**INJURY NOTES**\n${injuryNotes}\n` : ""}

In 3-4 sentences, summarize the betting situation for this game. Then provide:
1) Edge score rationale — explain what factors drove the score
2) Key factors — list the 3-5 most important factors as bullet points
3) Recommendation — STRONG_BET / LEAN / PASS with brief reasoning`;
}
