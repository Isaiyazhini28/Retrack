import pool from "../db.js";
import { getAIScore } from "./aiScore.js";
import { v4 as uuidv4 } from "uuid";
import { sendShortlistMail } from "./notify.js";

export async function processCandidate(candidate, job) {
  if (!candidate.resume_text) {
    console.warn(`⚠ No resume_text for ${candidate.email}, skipping`);
    return;
  }

  // Build a richer job description so spaCy has enough keywords to match against.
  // The old sparse format ("Title: X\nSkills: Y") gave Flask too few lemmas,
  // producing low keyword scores even for well-matched resumes.
  const jobText = [
    job.title        && `Job Title: ${job.title}`,
    job.department   && `Department: ${job.department}`,
    job.skills       && `Required Skills: ${job.skills}`,
    job.experience   && `Experience Required: ${job.experience}`,
    job.description  && `Job Description: ${job.description}`,
    job.requirements && `Requirements: ${job.requirements}`,
    job.employment_type && `Employment Type: ${job.employment_type}`,
  ]
    .filter(Boolean)
    .join("\n");

  console.log(`\n🔍 Scoring ${candidate.email} for "${job.title}"`);
  console.log(`   Resume length: ${candidate.resume_text.length} chars`);
  console.log(`   Job text length: ${jobText.length} chars`);

  const { score, shortlist } = await getAIScore(candidate.resume_text, jobText);
  const status = shortlist ? "shortlisted" : "rejected";

  await pool.query(
    `UPDATE external_candidates SET ai_score=?, shortlist_status=? WHERE id=?`,
    [score, status, candidate.id]
  );

  console.log(`✔ ${candidate.email}: score=${score} → ${status}`);

  if (!shortlist) return;

  // ── CREATE APTITUDE ROUND (LEVEL 1) ──
  const [existingApti] = await pool.query(
    `SELECT id FROM interviews WHERE candidate_id=? AND level_id=1`,
    [candidate.id]
  );

  if (existingApti.length === 0) {
    const token      = uuidv4();
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const meetingLink = `http://localhost:3000/test/${token}`;

    await pool.query(
      `INSERT INTO interviews
       (candidate_id, level_id, position, status, interview_token, interview_expiry, test_status, meeting_link)
       VALUES (?, 1, ?, 'Scheduled', ?, ?, 'pending', ?)`,
      [candidate.id, candidate.position, token, expiryTime, meetingLink]
    );

    await pool.query(
      `UPDATE external_candidates
       SET aptitude_status='sent', aptitude_token=?, aptitude_expiry=?
       WHERE id=?`,
      [token, expiryTime, candidate.id]
    );

    await sendShortlistMail(candidate.email, null, "Aptitude", meetingLink, expiryTime);

    console.log(`✅ Aptitude interview scheduled for ${candidate.email}`);
  } else {
    console.log(`⏩ Aptitude already exists for ${candidate.email}`);
  }
}