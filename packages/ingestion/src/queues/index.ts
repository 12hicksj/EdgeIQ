import { Queue } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");

export const redisConnection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || "6379"),
  ...(redisUrl.password && { password: decodeURIComponent(redisUrl.password) }),
  maxRetriesPerRequest: null as null,
};

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
