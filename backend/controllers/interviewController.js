import pool from "../db.js";
export const getInterviews = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ec.id AS candidate_id,
        ec.first_name,
        ec.last_name,
        ec.email,
        ec.phone,
        ec.position,
        ec.ai_score,
        ec.shortlist_status,
        i.id AS interview_id,
        rl.level_name AS round,
        i.status,
        i.scheduled_at
      FROM external_candidates ec
      LEFT JOIN interviews i ON i.candidate_id = ec.id
      LEFT JOIN role_interview_levels rl ON rl.id = i.level_id
      ORDER BY rl.step_order ASC, i.scheduled_at ASC
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
    "INSERT INTO interviews(candidate_id, level_id, interview_date) VALUES (?,?,?)",
    [id, nextLevel.id, new Date()]
  );

  res.json({ message: "Moved to next round" });
};

