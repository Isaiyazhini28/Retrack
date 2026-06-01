import cron from "node-cron";
import { processPendingLeaves } from "../services/leaveService.js";

// Run every hour
cron.schedule("0 * * * *", async () => {
  console.log("🕒 Running leave AI cron job");
  await processPendingLeaves();
});