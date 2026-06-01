import pool from "../db.js";
import { aiScoreResume } from "../services/aiSemanticScore.js";
import { scheduleInterview } from "../services/scheduleInterview.js";

export const runAIForJob = async (jobId) => {
  const [[job]] = await pool.query(
    "SELECT * FROM jobs WHERE id = ?",
    [jobId]
  );

  if (!job) {
    console.log("❌ Job not found:", jobId);
    return;
  }

  const [candidates] = await pool.query(
    `
    SELECT *
    FROM external_candidates
    WHERE LOWER(position) = LOWER(?)
      AND (shortlist_status IS NULL OR shortlist_status = 'pending')
    `,
    [job.title]
  );

  console.log(`🤖 AI running for job: ${job.title}`);
  console.log(`👥 Candidates found: ${candidates.length}`);

  for (const candidate of candidates) {
    if (!candidate.resume_text) {
      console.log("⚠️ Resume missing for:", candidate.email);
      continue;
    }

    const { score, shortlist } = await aiScoreResume(
      candidate.resume_text,
      job.description
    );

    const status = shortlist ? "shortlisted" : "rejected";

    await pool.query(
      `
      UPDATE external_candidates
      SET ai_score = ?, shortlist_status = ?
      WHERE id = ?
      `,
      [score, status, candidate.id]
    );

    if (shortlist) {
      await scheduleInterview(candidate.id);
    }

    console.log(
      `✅ ${candidate.email} → ${score}% → ${status}`
    );
  }
};
