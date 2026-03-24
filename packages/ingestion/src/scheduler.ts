import cron from "node-cron";
import { oddsQueue, publicBettingQueue } from "./queues";
import { prisma } from "@betting/db";

const NFL_SPORT = "americanfootball_nfl";
const NBA_SPORT = "basketball_nba";
const MARKETS = ["spreads", "totals", "h2h"];

/**
 * Schedule odds and public betting data polling
 */
export function startScheduler(): void {
  console.log("Starting scheduler...");

  // Poll odds every 10 minutes during 6am–midnight
  cron.schedule("*/10 6-23 * * *", async () => {
    console.log("Scheduling odds fetch jobs...");
    await oddsQueue.add("fetch-nfl-odds", {
      sport: NFL_SPORT,
      markets: MARKETS,
    });
    await oddsQueue.add("fetch-nba-odds", {
      sport: NBA_SPORT,
      markets: MARKETS,
    });
  });

  // Poll public betting percentages every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    console.log("Scheduling public betting fetch jobs...");

    // Fetch all scheduled games and enqueue public betting jobs
    const scheduledGames = await prisma.game.findMany({
      where: {
        status: "SCHEDULED",
        commenceTime: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // next 7 days
        },
      },
      select: { id: true, externalId: true },
    });

    for (const game of scheduledGames) {
      await publicBettingQueue.add(`fetch-betting-${game.id}`, {
        gameId: game.id,
        externalGameId: game.externalId,
      });
    }
  });

  console.log("Scheduler started. Cron jobs registered.");
}
