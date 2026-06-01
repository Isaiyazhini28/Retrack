import pool from "../db.js";
import { getAIScore } from "./aiScore.js";
import { v4 as uuidv4 } from "uuid";
import { sendShortlistMail } from "../services/notify.js";


export async function processCandidates(job) {
  try {
    // 1️⃣ Fetch pending candidates for this job
    const [candidates] = await pool.query(
      `SELECT * FROM external_candidates 
       WHERE job_id = ? AND (ai_score IS NULL OR ai_score = 0)`,
      [job.id]
    );

    if (!candidates.length) return;

    for (const candidate of candidates) {
      if (!candidate.resume_text) continue;

      // 2️⃣ Prepare job description
      const jobDescription = `
        Title: ${job.title || ""}
        Skills: ${job.skills || ""}
        Experience: ${job.experience || ""}
        Description: ${job.description || ""}
        Requirements: ${job.requirements || ""}
      `;

      // 3️⃣ Get AI score
      const { score = 0, shortlist = false } = await getAIScore(
        candidate.resume_text,
        jobDescription
      );

      const status = shortlist ? "shortlisted" : "rejected";

      // 4️⃣ Update candidate AI score
      await pool.query(
        `UPDATE external_candidates
         SET ai_score = ?, shortlist_status = ?
         WHERE id = ?`,
        [score, status, candidate.id]
      );

      // 5️⃣ Schedule first interview if shortlisted
 // 5️⃣ If shortlisted → Send Aptitude Link
if (status === "shortlisted") {

  // Prevent duplicate sending
  if (candidate.interview_token) continue;

  const token = uuidv4();
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // Get first interview level
  const [levels] = await pool.query(
    `SELECT id, level_name 
     FROM role_interview_levels 
     ORDER BY step_order ASC 
     LIMIT 1`
  );

  if (!levels.length) continue;

  const levelId = levels[0].id;
  const levelName = levels[0].level_name;

  // Insert interview
  const [result] = await pool.query(
    `INSERT INTO interviews 
     (candidate_id, level_id, status)
     VALUES (?, ?, 'Scheduled')`,
    [candidate.id, levelId]
  );

  const interviewId = result.insertId;

  // Save token
  await pool.query(
    `UPDATE interviews
     SET interview_token = ?, 
         interview_expiry = ?, 
         test_status = 'pending'
     WHERE id = ?`,
    [token, expiry, interviewId]
  );

  const interviewLink = `http://localhost:5000/api/interviews/test/${token}`;

  await sendShortlistMail(
    candidate.email,
    new Date(),
    levelName,
    interviewLink,
    expiry
  );

  console.log(`📧 Interview link sent to ${candidate.email}`);
}



      console.log(`✅ ${candidate.email}: AI score=${score} → ${status}`);
    }
  } catch (err) {
    console.error("❌ Error processing candidates:", err);
  }
}
