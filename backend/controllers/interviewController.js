import express from "express";
import pool from "../db.js";

const router = express.Router();

/**
 * GET /api/interviews
 * Fetch latest interview per candidate
 */
router.get("/", async (req, res) => {
  try {
    // Get all interviews joined with candidates & levels
    const [rows] = await pool.query(`
      SELECT 
        ec.id AS candidate_id,
        ec.first_name,
        ec.last_name,
        ec.email,
        ec.position,
        ec.ai_score,
        ec.shortlist_status,
        i.id AS interview_id,
        i.status AS interview_status,
        i.interview_date,
        rl.level_name AS round,
        rl.step_order
      FROM external_candidates ec
      LEFT JOIN interviews i 
        ON i.candidate_id = ec.id
      LEFT JOIN role_interview_levels rl 
        ON i.level_id = rl.id
      ORDER BY ec.id, rl.step_order DESC
    `);

    // Keep only the latest interview per candidate
    const latestMap = {};
rows.forEach(i => {
  // Only take the first row per candidate (latest round)
  if (!latestMap[i.candidate_id]) {
    latestMap[i.candidate_id] = {
      candidate_id: i.candidate_id,
      first_name: i.first_name,
      last_name: i.last_name,
      position: i.position,
      ai_score: i.ai_score,
      shortlist_status: i.shortlist_status,
      interview_id: i.interview_id || null,          // unique per row
      round: i.level_name || "N/A",
      status: i.interview_status || "N/A",
      interview_date: i.interview_date || null
    };
  }
});




    return res.json(Object.values(latestMap));
  } catch (err) {
    console.error("❌ Fetch interviews error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/interviews/:id/status
 * Update interview status (Passed / Failed)
 */
// POST /api/interviews/:id/status
router.post("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Fetch interview info
    const [interviews] = await pool.query(
      `SELECT candidate_id, level_id FROM interviews WHERE id=?`,
      [id]
    );
    if (!interviews.length) return res.status(404).json({ message: "Interview not found" });

    const { candidate_id, level_id } = interviews[0];

    // Update interview status
    await pool.query(`UPDATE interviews SET status=? WHERE id=?`, [status, id]);

    // Level 3 passed → create offer
    if (level_id === 3 && status === "Passed") {
      const [existingOffer] = await pool.query(
        `SELECT id FROM offer_letters WHERE candidate_id=?`,
        [candidate_id]
      );

      if (existingOffer.length === 0) {
        // Get candidate info
        const [candidate] = await pool.query(
          `SELECT id AS candidate_id, email, position FROM external_candidates WHERE id=?`,
          [candidate_id]
        );

        await pool.query(
          `INSERT INTO offer_letters (candidate_id, job_id, offer_status, passed_at)
           VALUES (?, ?, 'Passed', NOW())`,
          [candidate[0].candidate_id, candidate[0].position] // replace job_id mapping if different
        );

        console.log(`✅ Offer letter created for candidate ${candidate_id}`);
      }
    }

    return res.json({ message: `Interview marked as ${status}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
/**
 * POST /api/interviews/:candidateId/next
 * Schedule next interview round for a candidate
 */
router.post("/:candidateId/next", async (req, res) => {
  const { candidateId } = req.params;

  try {
    // Get latest interview for candidate
    const [current] = await pool.query(`
      SELECT i.id AS interview_id, i.level_id, rl.step_order
      FROM interviews i
      JOIN role_interview_levels rl ON i.level_id = rl.id
      WHERE i.candidate_id = ?
      ORDER BY rl.step_order DESC LIMIT 1
    `, [candidateId]);

    let nextLevelId;

    if (current.length === 0) {
      // If no interview exists, schedule first round
      const [levels] = await pool.query(`SELECT id FROM role_interview_levels ORDER BY step_order ASC LIMIT 1`);
      nextLevelId = levels[0].id;
    } else {
      const currStep = current[0].step_order;
      const [nextLevel] = await pool.query(`
        SELECT id FROM role_interview_levels 
        WHERE step_order > ? ORDER BY step_order ASC LIMIT 1
      `, [currStep]);

      if (!nextLevel.length) return res.json({ message: "All rounds completed" });
      nextLevelId = nextLevel[0].id;
    }

    // Schedule next round
    await pool.query(`
      INSERT INTO interviews (candidate_id, level_id, interview_date, status)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Scheduled')
    `, [candidateId, nextLevelId]);

    return res.json({ message: "Next round scheduled", level_id: nextLevelId });
  } catch (err) {
    console.error("❌ Next round error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
