import { processCandidates } from "../services/aiJobProcessor.js";
import pool from "../db.js";

async function run() {
  const [jobs] = await pool.query("SELECT * FROM jobs WHERE status='closed'");
  for (const job of jobs) {
    await processCandidates(job);
  }
  console.log("✅ AI scoring completed for all candidates");
}

run();
