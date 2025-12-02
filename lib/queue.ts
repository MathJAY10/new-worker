import IORedis from "ioredis";
import { Queue } from "bullmq";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL env var is required");
}

export const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 5);
export const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? 3);

export const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const pdfQueue = new Queue("pdf-processing", {
  connection,
  defaultJobOptions: {
    attempts: MAX_RETRIES,
    removeOnComplete: false,
    removeOnFail: false,
  },
});
