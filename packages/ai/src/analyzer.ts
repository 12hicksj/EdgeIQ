import { prisma } from "@betting/db";
import type { AIAnalysis } from "@betting/db";
import { anthropic, MODEL } from "./client";
import {
  buildGameAnalysisPrompt,
  GAME_ANALYSIS_SYSTEM_PROMPT,
  type GameAnalysisParams,
} from "./prompts/gameAnalysis";
import { buildDailyDigestPrompt } from "./prompts/dashboardSummary";

function extractRecommendation(
  text: string
): "STRONG_BET" | "LEAN" | "PASS" {
  if (/STRONG_BET/i.test(text)) return "STRONG_BET";
  if (/\bLEAN\b/i.test(text)) return "LEAN";
  return "PASS";
}

function extractKeyFactors(text: string): string[] {
  const factors: string[] = [];
  const bulletRegex = /^[-•*]\s+(.+)$/gm;
  let match;
  while ((match = bulletRegex.exec(text)) !== null) {
    factors.push(match[1].trim());
  }
  return factors.slice(0, 5);
}

/**
 * Analyze a game using Claude and persist the result
 *
 * Calls Claude with the game analysis prompt, parses the response
 * to extract edge score rationale, key factors, and recommendation,
 * then persists an AIAnalysis record to the database.
 *
 * @param params - GameAnalysisParams with game metrics
 * @returns Persisted AIAnalysis record
 */
export async function analyzeGame(
  params: GameAnalysisParams
): Promise<AIAnalysis> {
  const userPrompt = buildGameAnalysisPrompt(params);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: GAME_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  const recommendation = extractRecommendation(responseText);
  const keyFactors = extractKeyFactors(responseText);

  // Extract summary (first 3-4 sentences)
  const sentences = responseText.split(/(?<=[.!?])\s+/);
  const summary = sentences.slice(0, 4).join(" ");

  const analysis = await prisma.aIAnalysis.create({
    data: {
      gameId: params.game.id,
      edgeScore: params.edgeScore,
      summary,
      keyFactors: JSON.stringify(keyFactors),
      recommendation,
      generatedAt: new Date(),
    },
  });

  return analysis;
}

/**
 * Generate a daily betting digest using Claude
 *
 * Fetches all games and analyses for the given date, calls Claude
 * with the daily digest prompt, and returns the markdown string.
 *
 * @param date - Date to generate digest for
 * @returns Markdown formatted daily digest
 */
export async function generateDailyDigest(date: Date): Promise<string> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const games = await prisma.game.findMany({
    where: {
      commenceTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const gameIds = games.map((g) => g.id);
  const analyses = await prisma.aIAnalysis.findMany({
    where: {
      gameId: { in: gameIds },
      generatedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { edgeScore: "desc" },
  });

  const prompt = buildDailyDigestPrompt(games, analyses);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
