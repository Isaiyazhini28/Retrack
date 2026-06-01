import cron from "node-cron";
import { processSheetLeaves } from "../services/leaveSheetService.js";

// Run every 30 minutes
cron.schedule("*/30 * * * *", async () => {
  console.log("🕒 Syncing Google Sheet leaves automatically");
  await processSheetLeaves();
});