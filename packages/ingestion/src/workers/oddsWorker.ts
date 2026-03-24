import { Worker, Job } from "bullmq";
import { prisma, GameStatus } from "@betting/db";
import { getOdds, OddsGame } from "../clients/oddsApi";
import { redisConnection } from "../queues";

interface OddsJobData {
  sport: string;
  markets: string[];
}

async function processOddsJob(job: Job<OddsJobData>): Promise<void> {
  const { sport, markets } = job.data;
  console.log(`Processing odds job for sport: ${sport}`);

  const games = await getOdds(sport, markets);

  for (const game of games) {
    // Upsert the Game record
    const dbGame = await prisma.game.upsert({
      where: { externalId: game.id },
      update: {
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: new Date(game.commence_time),
        updatedAt: new Date(),
      },
      create: {
        externalId: game.id,
        sport: game.sport_key,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: new Date(game.commence_time),
        status: GameStatus.SCHEDULED,
      },
    });

    // Insert OddsSnapshot records for each bookmaker/market combination
    const snapshots = [];
    for (const bookmaker of game.bookmakers) {
      for (const market of bookmaker.markets) {
        const homeOutcome = market.outcomes.find(
          (o) => o.name === game.home_team
        );
        const awayOutcome = market.outcomes.find(
          (o) => o.name === game.away_team
        );

        if (!homeOutcome || !awayOutcome) continue;

        snapshots.push({
          gameId: dbGame.id,
          bookmaker: bookmaker.key,
          market: market.key,
          homeOdds: homeOutcome.price,
          awayOdds: awayOutcome.price,
          spread: market.key === "spreads" ? homeOutcome.point : undefined,
          total:
            market.key === "totals"
              ? market.outcomes[0]?.point ?? undefined
              : undefined,
          capturedAt: new Date(),
        });
      }
    }

    if (snapshots.length > 0) {
      await prisma.oddsSnapshot.createMany({ data: snapshots });
    }
  }

  console.log(`Processed ${games.length} games for ${sport}`);
}

export const oddsWorker = new Worker<OddsJobData>(
  "odds",
  processOddsJob,
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

oddsWorker.on("completed", (job) => {
  console.log(`Odds job ${job.id} completed`);
});

oddsWorker.on("failed", (job, err) => {
  console.error(`Odds job ${job?.id} failed:`, err.message);
});
