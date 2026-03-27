import type { Game, AIAnalysis } from "@edgeiq/db";

/**
 * Build the daily digest prompt for Claude
 *
 * Generates a prompt asking Claude to write a 150-word daily betting
 * digest covering the top 3 edges of the day.
 *
 * @param games - All games scheduled for the day
 * @param analyses - AI analyses for those games
 * @returns Formatted prompt string for Claude
 */
export function buildDailyDigestPrompt(
  games: Game[],
  analyses: AIAnalysis[]
): string {
  const topAnalyses = [...analyses]
    .sort((a, b) => b.edgeScore - a.edgeScore)
    .slice(0, 3);

  const gameMap = new Map(games.map((g) => [g.id, g]));

  const analysisBlocks = topAnalyses
    .map((analysis) => {
      const game = gameMap.get(analysis.gameId);
      if (!game) return "";
      return `${game.awayTeam} @ ${game.homeTeam}
Edge Score: ${analysis.edgeScore}/10
Recommendation: ${analysis.recommendation}
Summary: ${analysis.summary}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  return `You are writing a daily sports betting digest. Below are today's top betting edges identified by our system.

${analysisBlocks}

Write a concise 150-word daily betting digest that:
1. Opens with today's overall betting landscape
2. Highlights the top 3 edges with brief reasoning
3. Ends with a risk reminder about bankroll management

Format the response in clean markdown.`;
}
