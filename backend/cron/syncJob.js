import cron from "node-cron";
import { syncSheetData } from "../services/sheetSync.js";

cron.schedule("0 0 * * *", () => {
  console.log("Running daily sheet sync...");
  syncSheetData();
});