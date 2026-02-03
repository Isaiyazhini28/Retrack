import cron from "node-cron";
import pool from "../db.js";
import { processCandidate } from "../services/autoPipeline.js";

cron.schedule("*/10 * * * *", async () => {
  const [candidates] = await pool.query(
    "SELECT * FROM external_candidates WHERE shortlist_status='pending'"
  );
  const [[job]] = await pool.query("SELECT * FROM jobs WHERE status='open'");

  for (const c of candidates) {
    await processCandidate(c, job);
  }

  console.log("Processed AI candidates");
});
