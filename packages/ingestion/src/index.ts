import { oddsWorker } from "./workers/oddsWorker";
import { publicBettingWorker } from "./workers/publicBettingWorker";
import { startScheduler } from "./scheduler";

async function main() {
  console.log("Starting betting data ingestion service...");

  // Start workers
  console.log("Workers started: oddsWorker, publicBettingWorker");

  // Start scheduler
  startScheduler();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down...");
    await oddsWorker.close();
    await publicBettingWorker.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
