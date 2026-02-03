import express from "express";
import pool from "../db.js";
const router = express.Router();



router.get("/summary", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM jobs WHERE status='open') AS openJobs,
        (SELECT COUNT(*) FROM jobs WHERE status='closed') AS closedJobs,
        (SELECT COUNT(*) FROM external_candidates) AS totalCandidates
    `);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Dashboard summary failed" });
  }
});

// BAR CHART DATA
router.get("/jobs-by-department", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT department AS dept, SUM(openings) AS openings
      FROM jobs
      GROUP BY department
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bar chart data failed" });
  }
});
export default router;

