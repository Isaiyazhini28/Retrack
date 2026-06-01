import cron from "node-cron";
import { autoAllocateTrainers } from "../controllers/trainerController.js";

// Run every second for testing
cron.schedule("0 * * * *", async () => {
  console.log("Running trainer allocation cron...");
  await autoAllocateTrainers();
});