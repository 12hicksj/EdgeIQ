import cron from "node-cron";
import { oddsQueue, publicBettingQueue } from "./queues";
import { prisma } from "@edgeiq/db";

const NFL_SPORT = "americanfootball_nfl";
const NBA_SPORT = "basketball_nba";
// Quota cost per call: 3 markets x 1 region = 3 credits
// Two sports per cycle = 6 credits per 10-minute tick
const MARKETS = ["h2h", "spreads", "totals"];

/**
 * Schedule odds and public betting data polling.
 *
 * Quota usage:
 *  - Odds (every 10 min, 6am-midnight): 6 credits/cycle (2 sports x 3 markets x 1 region)
 *  - Scores (every 30 min): 2 credits/call per sport (daysFrom=1)
 *  - getEvents is FREE - no quota cost
 */
export function startScheduler(): void {
  console.log("Starting scheduler...");

  // Poll odds every 10 minutes during 6am-midnight
  cron.schedule("*/10 6-23 * * *", async () => {
    console.log("Scheduling odds fetch jobs...");
    const commenceTimeTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await oddsQueue.add("fetch-nfl-odds", { sport: NFL_SPORT, markets: MARKETS, commenceTimeTo });
    await oddsQueue.add("fetch-nba-odds", { sport: NBA_SPORT, markets: MARKETS, commenceTimeTo });
  });

  cron.schedule("*/30 * * * *", async () => {
    console.log("Scheduling public betting fetch jobs...");
    const scheduledGames = await prisma.game.findMany({
      where: {
        status: "SCHEDULED",
        commenceTime: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, externalId: true },
    });
    for (const game of scheduledGames) {
      await publicBettingQueue.add(`fetch-betting-${game.id}`, { gameId: game.id, externalGameId: game.externalId });
    }
  });

  // Update completed/live game scores every 30 minutes (2 credits per sport)
  cron.schedule("*/30 * * * *", async () => {
    console.log("Scheduling scores update jobs...");
    await oddsQueue.add("update-nfl-scores", { sport: NFL_SPORT, markets: [], updateScores: true });
    await oddsQueue.add("update-nba-scores", { sport: NBA_SPORT, markets: [], updateScores: true });
  });

  console.log("Scheduler started. Cron jobs registered.");
}
