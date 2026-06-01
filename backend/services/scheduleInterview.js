import pool from "../db.js";

export const scheduleInterview = async (candidateId) => {
  const levelId = 1; // Level 1 / first round

  // 1️⃣ Check if interview already exists
  const [existing] = await pool.query(
    `SELECT * FROM interviews WHERE candidate_id=? AND level_id=?`,
    [candidateId, levelId]
  );

  if (existing.length > 0) return existing[0].id; // already scheduled

  // 2️⃣ Schedule for next day
  const [res] = await pool.query(
    `
    INSERT INTO interviews
    (candidate_id, level_id, interview_date, status)
    VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Scheduled')
    `,
    [candidateId, levelId]
  );

  return res.insertId;
};