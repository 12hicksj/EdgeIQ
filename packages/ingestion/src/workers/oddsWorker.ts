import { Worker, Job } from "bullmq";
import { prisma, GameStatus } from "@betting/db";
import { getOdds, getScores } from "../clients/oddsApi";
import { redisConnection } from "../queues";

interface OddsJobData {
  sport: string;
  markets: string[];
  commenceTimeTo?: string;
  commenceTimeFrom?: string;
  updateScores?: boolean;
}

async function updateGameScores(sport: string): Promise<void> {
  const scoreGames = await getScores(sport, 1);
  for (const sg of scoreGames) {
    const newStatus = sg.completed
      ? GameStatus.FINAL
      : new Date(sg.commence_time) <= new Date()
        ? GameStatus.LIVE
        : GameStatus.SCHEDULED;
    await prisma.game.updateMany({
      where: { externalId: sg.id },
      data: { status: newStatus, updatedAt: new Date() },
    });
  }
  console.log(`Updated scores for ${scoreGames.length} ${sport} games`);
}

async function ingestOdds(job: Job<OddsJobData>): Promise<void> {
  const { sport, markets, commenceTimeFrom, commenceTimeTo } = job.data;
  console.log(`Processing odds job for sport: ${sport}`);

  const { games, rateLimit } = await getOdds(sport, markets, { commenceTimeFrom, commenceTimeTo });
  console.log(
    `Odds API: ${rateLimit.requestsRemaining} credits remaining ` +
    `(used ${rateLimit.requestsUsed}, last call cost ${rateLimit.requestsLast})`
  );

  const capturedAt = new Date();

  for (const game of games) {
    const dbGame = await prisma.game.upsert({
      where: { externalId: game.id },
      update: { homeTeam: game.home_team, awayTeam: game.away_team, commenceTime: new Date(game.commence_time), updatedAt: new Date() },
      create: { externalId: game.id, sport: game.sport_key, homeTeam: game.home_team, awayTeam: game.away_team, commenceTime: new Date(game.commence_time), status: GameStatus.SCHEDULED },
    });

    const snapshots = [];

    for (const bookmaker of game.bookmakers) {
      for (const market of bookmaker.markets) {
        // h2h — outcomes named by team; no point
        if (market.key === "h2h") {
          const homeOutcome = market.outcomes.find((o) => o.name === game.home_team);
          const awayOutcome = market.outcomes.find((o) => o.name === game.away_team);
          if (!homeOutcome || !awayOutcome) continue;
          snapshots.push({ gameId: dbGame.id, bookmaker: bookmaker.key, market: market.key, homeOdds: homeOutcome.price, awayOdds: awayOutcome.price, capturedAt });
        }
        // spreads — outcomes named by team; point = spread value
        else if (market.key === "spreads") {
          const homeOutcome = market.outcomes.find((o) => o.name === game.home_team);
          const awayOutcome = market.outcomes.find((o) => o.name === game.away_team);
          if (!homeOutcome || !awayOutcome) continue;
          snapshots.push({ gameId: dbGame.id, bookmaker: bookmaker.key, market: market.key, homeOdds: homeOutcome.price, awayOdds: awayOutcome.price, spread: homeOutcome.point ?? null, capturedAt });
        }
        // totals — outcomes are "Over" and "Under" (NOT team names)
        // Over odds stored as homeOdds, Under as awayOdds by convention
        else if (market.key === "totals") {
          const overOutcome = market.outcomes.find((o) => o.name === "Over");
          const underOutcome = market.outcomes.find((o) => o.name === "Under");
          if (!overOutcome || !underOutcome) continue;
          snapshots.push({ gameId: dbGame.id, bookmaker: bookmaker.key, market: market.key, homeOdds: overOutcome.price, awayOdds: underOutcome.price, total: overOutcome.point ?? null, capturedAt });
        }
      }
    }

    if (snapshots.length > 0) {
      await prisma.oddsSnapshot.createMany({ data: snapshots });
    }
  }

  console.log(`Processed ${games.length} games for ${sport}`);
}

async function processOddsJob(job: Job<OddsJobData>): Promise<void> {
  if (job.data.updateScores) return updateGameScores(job.data.sport);
  return ingestOdds(job);
}

export const oddsWorker = new Worker<OddsJobData>("odds", processOddsJob, {
  connection: redisConnection,
  concurrency: 2,
});

oddsWorker.on("completed", (job) => console.log(`Odds job ${job.id} completed`));
oddsWorker.on("failed", (job, err) => console.error(`Odds job ${job?.id} failed:`, err.message));
