import { prisma } from "@edgeiq/db";
import type { AIAnalysis } from "@edgeiq/db";
import { anthropic, MODEL } from "./client";
import {
  buildGameAnalysisPrompt,
  GAME_ANALYSIS_SYSTEM_PROMPT,
  type GameAnalysisParams,
} from "./prompts/gameAnalysis";
import { buildDailyDigestPrompt } from "./prompts/dashboardSummary";
import { detectLineMovement, detectReverseLineMovement } from "@edgeiq/models";

function extractEdgeScore(text: string): number {
  const match = text.match(/EDGE_SCORE:\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    const score = parseFloat(match[1]);
    return Math.min(10, Math.max(1, score));
  }
  return 5;
}

function extractRecommendation(text: string): "STRONG_BET" | "LEAN" | "PASS" {
  const match = text.match(/RECOMMENDATION:\s*(STRONG_BET|LEAN|PASS)/i);
  if (match) {
    const val = match[1].toUpperCase();
    if (val === "STRONG_BET" || val === "LEAN" || val === "PASS") return val;
  }
  return "PASS";
}

function extractBetSide(text: string): string | null {
  const match = text.match(/^BET:\s*(.+)/im);
  if (!match) return null;
  const val = match[1].trim();
  if (/^none$/i.test(val)) return null;
  return val;
}

function extractSummary(text: string): string {
  const match = text.match(/SUMMARY:\s*([\s\S]*?)(?=KEY_FACTORS:|$)/i);
  if (match) return match[1].trim();
  return text.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
}

function extractKeyFactors(text: string): string[] {
  const match = text.match(/KEY_FACTORS:\s*([\s\S]*)/i);
  const section = match ? match[1] : text;
  const factors: string[] = [];
  const bulletRegex = /^[-•*]\s+(.+)$/gm;
  let m;
  while ((m = bulletRegex.exec(section)) !== null) {
    factors.push(m[1].trim());
  }
  return factors.slice(0, 5);
}

export async function analyzeGame(params: GameAnalysisParams): Promise<AIAnalysis> {
  const userPrompt = buildGameAnalysisPrompt(params);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: GAME_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "";

  const edgeScore = extractEdgeScore(responseText);
  const recommendation = extractRecommendation(responseText);
  const betSide = extractBetSide(responseText);
  const rawSummary = extractSummary(responseText);
  const summary = betSide ? `${betSide} — ${rawSummary}` : rawSummary;
  const keyFactors = extractKeyFactors(responseText);

  const analysis = await prisma.aIAnalysis.create({
    data: {
      gameId: params.game.id,
      edgeScore,
      summary,
      keyFactors: JSON.stringify(keyFactors),
      recommendation,
      generatedAt: new Date(),
    },
  });

  return analysis;
}

export async function analyzeUnanalyzedGames(): Promise<number> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const thirtyMinFromNow = new Date(Date.now() + 30 * 60 * 1000);

  const games = await prisma.game.findMany({
    where: {
      commenceTime: { gt: thirtyMinFromNow },
      oddsSnapshots: { some: {} },
      aiAnalyses: {
        none: { generatedAt: { gt: sixHoursAgo } },
      },
    },
    include: {
      oddsSnapshots: { orderBy: { capturedAt: "asc" } },
      publicBettingData: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
    take: 20,
  });

  let analyzed = 0;
  for (const game of games) {
    const latestH2h = [...game.oddsSnapshots].reverse().find((s) => s.market === "h2h");
    if (!latestH2h) continue;

    const lineMovement = detectLineMovement(game.oddsSnapshots);
    const publicBetting = game.publicBettingData[0] ?? null;
    if (publicBetting) {
      lineMovement.isSharp = detectReverseLineMovement(publicBetting, lineMovement);
    }

    try {
      await analyzeGame({ game, latestOdds: latestH2h, lineMovement, publicBetting });
      analyzed++;
    } catch {
      // Skip failed analyses — don't block the page load
    }
  }

  return analyzed;
}

export async function generateDailyDigest(date: Date): Promise<string> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const games = await prisma.game.findMany({
    where: { commenceTime: { gte: startOfDay, lte: endOfDay } },
  });

  const gameIds = games.map((g) => g.id);
  const analyses = await prisma.aIAnalysis.findMany({
    where: {
      gameId: { in: gameIds },
      generatedAt: { gte: startOfDay, lte: endOfDay },
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
