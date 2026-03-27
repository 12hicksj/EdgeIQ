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
      : "Spread: N/A (insufficient history)";

  const totalInfo =
    lineMovement.openingTotal !== null && lineMovement.currentTotal !== null
      ? `Opening Total: ${lineMovement.openingTotal}
Current Total: ${lineMovement.currentTotal}`
      : "";

  const publicBettingInfo = publicBetting
    ? `Home: ${publicBetting.homeTicketPct.toFixed(1)}% of tickets / ${publicBetting.homeMoneyPct.toFixed(1)}% of money
Away: ${publicBetting.awayTicketPct.toFixed(1)}% of tickets / ${publicBetting.awayMoneyPct.toFixed(1)}% of money`
    : "Not available";

  // Derive implied probabilities from moneyline
  const homeImplied = latestOdds.homeOdds < 0
    ? (-latestOdds.homeOdds / (-latestOdds.homeOdds + 100)) * 100
    : (100 / (latestOdds.homeOdds + 100)) * 100;
  const awayImplied = latestOdds.awayOdds < 0
    ? (-latestOdds.awayOdds / (-latestOdds.awayOdds + 100)) * 100
    : (100 / (latestOdds.awayOdds + 100)) * 100;
  const vig = homeImplied + awayImplied - 100;

  return `**GAME: ${game.awayTeam} @ ${game.homeTeam}**
Sport: ${game.sport}
Commence Time: ${game.commenceTime.toISOString()}

**CURRENT ODDS (${latestOdds.bookmaker})**
Home Moneyline: ${latestOdds.homeOdds > 0 ? "+" : ""}${latestOdds.homeOdds} (implied: ${homeImplied.toFixed(1)}%)
Away Moneyline: ${latestOdds.awayOdds > 0 ? "+" : ""}${latestOdds.awayOdds} (implied: ${awayImplied.toFixed(1)}%)
Vig: ${vig.toFixed(1)}%

**LINE MOVEMENT**
${spreadInfo}
${totalInfo}
Sharp Money Indicator: ${lineMovement.isSharp ? "YES - Reverse line movement detected" : "No"}

**PUBLIC BETTING PERCENTAGES**
${publicBettingInfo}

${injuryNotes ? `**INJURY NOTES**
${injuryNotes}
` : ""}

Analyze this game and respond in this exact format:

EDGE_SCORE: [number 1-10]
BET: [Home: TeamName / Away: TeamName / None]
RECOMMENDATION: [STRONG_BET / LEAN / PASS]

SUMMARY:
[3-5 sentences analyzing this game. Discuss the matchup, the implied probabilities, any value you see in the line, and your reasoning. Be specific about which team has the edge and why.]

KEY_FACTORS:
- [factor 1]
- [factor 2]
- [factor 3]

Scoring guide:
- 8-10: Strong statistical or situational edge, clear value in the line
- 5-7: Moderate edge, one side has a meaningful advantage
- 3-4: Slight lean, evenly matched with minor edge
- 1-2: No clear edge, avoid
When line movement and public betting data are unavailable, base your score on implied probability analysis, the size of the favorite/underdog gap, and any contextual factors about the matchup. A typical game with no special indicators should score 4-6.`;
}
