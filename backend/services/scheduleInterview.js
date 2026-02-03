import pool from "../db.js";

export const scheduleInterview = async (candidateId) => {
  const [levels] = await pool.query(
    "SELECT id FROM role_interview_levels ORDER BY step_order LIMIT 1"
  );

  const interviewDate = new Date();
  interviewDate.setDate(interviewDate.getDate() + 2);

  await pool.query(
    "INSERT INTO interviews(candidate_id, level_id, interview_date) VALUES (?, ?, ?)",
    [candidateId, levels[0].id, interviewDate]
  );

  return interviewDate;
};
