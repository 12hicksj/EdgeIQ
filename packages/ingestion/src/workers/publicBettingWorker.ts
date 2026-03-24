import { Worker, Job } from "bullmq";
import { prisma } from "@betting/db";
import { getPublicBetting } from "../clients/actionNetwork";
import { redisConnection } from "../queues";

interface PublicBettingJobData {
  gameId: string;
  externalGameId: string;
}

async function processPublicBettingJob(
  job: Job<PublicBettingJobData>
): Promise<void> {
  const { gameId, externalGameId } = job.data;
  console.log(`Processing public betting job for game: ${gameId}`);

  const bettingData = await getPublicBetting(externalGameId);

  await prisma.publicBettingData.create({
    data: {
      gameId,
      homeTicketPct: bettingData.homeTicketPct,
      awayTicketPct: bettingData.awayTicketPct,
      homeMoneyPct: bettingData.homeMoneyPct,
      awayMoneyPct: bettingData.awayMoneyPct,
      capturedAt: new Date(),
    },
  });

  console.log(`Saved public betting data for game ${gameId}`);
}

export const publicBettingWorker = new Worker<PublicBettingJobData>(
  "publicBetting",
  processPublicBettingJob,
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

publicBettingWorker.on("completed", (job) => {
  console.log(`Public betting job ${job.id} completed`);
});

publicBettingWorker.on("failed", (job, err) => {
  console.error(`Public betting job ${job?.id} failed:`, err.message);
});
