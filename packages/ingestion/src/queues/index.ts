import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
};

export const oddsQueue = new Queue("odds", {
  connection: redisConnection,
  defaultJobOptions,
});

export const publicBettingQueue = new Queue("publicBetting", {
  connection: redisConnection,
  defaultJobOptions,
});
