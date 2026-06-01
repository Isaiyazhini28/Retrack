import pool from "../db.js";
import { processCandidate } from "../services/autoPipeline.js";
import cron from "node-cron";

cron.schedule("0 * * * *", async () => {
  console.log("⏱ Checking pending AI candidates...");

  const [candidates] = await pool.query(`
    SELECT * FROM external_candidates
    WHERE ai_score = 0
  `);

  console.log("🟡 Pending candidates:", candidates.length);

  for (const candidate of candidates) {

    if (!candidate.resume_text) {
      console.log("⚠ No resume text for:", candidate.email);
      continue;
    }

    const [jobs] = await pool.query(
      `SELECT * FROM jobs WHERE title = ? LIMIT 1`,
      [candidate.position]
    );

    if (!jobs.length) {
      console.log("⚠ No matching job for:", candidate.position);
      continue;
    }

    const job = jobs[0];

    await processCandidate(candidate, job);

    console.log("✅ Processed:", candidate.email);
  }

  console.log("🚀 AI auto-processing cycle complete");
});
