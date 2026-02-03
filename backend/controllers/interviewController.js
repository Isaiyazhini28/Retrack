import pool from "../db.js";
import { aiScoreResume } from "../services/aiSemanticScore.js";
import { scheduleInterview } from "../services/scheduleInterview.js";
import { sendRejectionMail, sendShortlistMail } from "../services/notify.js";
export const getInterviews = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        i.id AS interview_id,
        i.scheduled_at AS interview_date,
        i.status,
        ec.id AS candidate_id,
        ec.first_name,
        ec.last_name,
        ec.email,
        ec.phone,
        ec.position,
        ec.ai_score,
        ec.shortlist_status,
        rl.level_name AS round
      FROM interviews i
      LEFT JOIN external_candidates ec ON ec.id = i.candidate_id
      LEFT JOIN role_interview_levels rl ON rl.id = i.level_id
      ORDER BY i.scheduled_at ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ GET INTERVIEWS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch interviews", error: err.message });
  }
};


export const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await pool.query(
    "UPDATE interviews SET status=? WHERE candidate_id=?",
    [status, id]
  );

  res.json({ message: "Status updated" });
};



export const nextRound = async (req, res) => {
  const { id } = req.params;

  const [[last]] = await pool.query(`
    SELECT rl.step_order
    FROM interviews i
    JOIN role_interview_levels rl ON rl.id = i.level_id
    WHERE i.candidate_id=?
    ORDER BY rl.step_order DESC
    LIMIT 1
  `, [id]);

  const nextStep = last ? last.step_order + 1 : 1;

  const [[nextLevel]] = await pool.query(
    "SELECT id FROM role_interview_levels WHERE step_order=?",
    [nextStep]
  );

  if (!nextLevel) {
    return res.json({ message: "No more rounds" });
  }

  await pool.query(
    "INSERT INTO interviews(candidate_id, level_id, scheduled_at) VALUES (?,?,?)",
    [id, nextLevel.id, new Date()]
  );

  res.json({ message: "Moved to next round" });
};

export const aiShortlistAndSchedule = async (req, res) => {
  const { jobId } = req.params;

  try {
    const [[job]] = await pool.query("SELECT * FROM jobs WHERE id = ?", [jobId]);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const [candidates] = await pool.query(
      `
        SELECT id, first_name, last_name, email, resume_text, shortlist_status, ai_score
        FROM external_candidates
        WHERE position IN (?, ?, ?)
      `,
      [job.title, job.job_id, String(job.id)]
    );

    const results = [];

    for (const candidate of candidates) {
      if (candidate.shortlist_status === "shortlisted" || candidate.shortlist_status === "rejected") {
        const [[existing]] = await pool.query(
          "SELECT scheduled_at FROM interviews WHERE candidate_id = ? ORDER BY scheduled_at DESC LIMIT 1",
          [candidate.id]
        );

        results.push({
          id: candidate.id,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          email: candidate.email,
          score: candidate.ai_score ?? null,
          status: candidate.shortlist_status,
          interview_date: existing?.scheduled_at || null,
        });
        continue;
      }

      const { score, shortlist } = await aiScoreResume(
        candidate.resume_text,
        job.description
      );

      const status = shortlist ? "shortlisted" : "rejected";

      await pool.query(
        "UPDATE external_candidates SET ai_score = ?, shortlist_status = ? WHERE id = ?",
        [score, status, candidate.id]
      );

      let interviewDate = null;

      if (shortlist) {
        const [[existing]] = await pool.query(
          "SELECT scheduled_at FROM interviews WHERE candidate_id = ? ORDER BY scheduled_at DESC LIMIT 1",
          [candidate.id]
        );

        if (existing?.scheduled_at) {
          interviewDate = existing.scheduled_at;
        } else {
          interviewDate = await scheduleInterview(candidate.id);
        }

        await sendShortlistMail(candidate.email, score, interviewDate);
      } else {
        await sendRejectionMail(candidate.email, score);
      }

      results.push({
        id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        score,
        status,
        interview_date: interviewDate,
      });
    }

    res.json({ jobId, results });
  } catch (err) {
    console.error("❌ AI SHORTLIST SCHEDULE ERROR:", err);
    res.status(500).json({ message: "Failed to run AI shortlist", error: err.message });
  }
};

