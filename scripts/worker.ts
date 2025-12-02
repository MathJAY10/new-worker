import "dotenv/config";
import { Worker, Job } from "bullmq";
import { connection, WORKER_CONCURRENCY } from "../lib/queue";

console.log("🚀 Worker started...");

if (!process.env.REDIS_URL) {
  console.error("❌ REDIS_URL missing!");
  process.exit(1);
}

const worker = new Worker(
  "pdf-processing",
  async (job: Job) => {
    console.log(`📥 Received job ${job.id}`);

    const { filePath, fileName, userId } = job.data as {
      filePath: string;
      fileName: string;
      userId: string;
    };

    const { extractTextFromPDF, generateSummaryPDF } = await import("../lib/pdf");
    const { summarizeWithGemini } = await import("../lib/ai");
    const { prisma } = await import("../lib/prisma");

    const update = (p: number) => job.updateProgress(p);

    try {
      update(5);
      const fullText = await extractTextFromPDF(filePath);

      update(20);
      const chunks: string[] = [];
      const chunkSize = 4000;

      for (let i = 0; i < fullText.length; i += chunkSize) {
        chunks.push(fullText.slice(i, i + chunkSize));
      }

      update(40);
      const partialSummaries = [];

      for (let part of chunks) {
        const summary = await summarizeWithGemini(part);
        partialSummaries.push(summary);
      }

      const mergedSummary = partialSummaries.join("\n\n");

      update(80);
      const summaryPDFUrl = await generateSummaryPDF(mergedSummary, fileName);

      const newspaper = await prisma.newspaper.create({
        data: { title: fileName, fileUrl: summaryPDFUrl, userId },
      });

      const summary = await prisma.summary.create({
        data: { content: mergedSummary, newspaperId: newspaper.id, userId },
      });

      update(100);

      return { newspaperId: newspaper.id, summaryId: summary.id };
    } catch (err) {
      console.error("❌ Worker error:", err);
      throw err;
    }
  },
  { connection, concurrency: WORKER_CONCURRENCY }
);

worker.on("completed", (job) => console.log(`🎉 Completed job ${job.id}`));
worker.on("failed", (job, err) => console.log(`💀 Failed job ${job?.id}:`, err));
