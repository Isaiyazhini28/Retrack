import pool from "../db.js";
import { aiScoreResume } from "../services/aiSemanticScore.js";

export const processCandidate = async (candidate) => {
  const [[job]] = await pool.query(
    "SELECT * FROM jobs WHERE id = ?",
    [candidate.job_id]
  );

  if (!job) {
    console.log("❌ Job not found for candidate", candidate.id);
    return;
  }

  const { score, shortlist } = await aiScoreResume(
    candidate.resume_text,
    job.description
  );

  const status = shortlist ? "shortlisted" : "rejected";

  await pool.query(
    "UPDATE external_candidates SET ai_score=?, shortlist_status=? WHERE id=?",
    [score, status, candidate.id]
  );

  console.log(`✅ ${candidate.email} → ${score}% → ${status}`);
};
