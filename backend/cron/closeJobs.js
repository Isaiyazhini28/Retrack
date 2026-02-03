import pool from "../db.js";
import { processCandidate } from "../services/autoPipeline.js";

export const closeJobs = async () => {
  const [jobs] = await pool.query(`
    SELECT * FROM jobs 
    WHERE closing_date <= CURDATE()
    AND status = 'open'
  `);

  for (const job of jobs) {
    await pool.query(
      "UPDATE jobs SET status='closed' WHERE id=?",
      [job.id]
    );

    const [candidates] = await pool.query(
      "SELECT * FROM external_candidates WHERE job_id=?",
      [job.id]
    );

    for (const c of candidates) {
      await processCandidate(c);
    }

    await pool.query(
      "UPDATE jobs SET ai_processed=1 WHERE id=?",
      [job.id]
    );

    console.log(`🤖 AI processed job ${job.title}`);
  }
};
