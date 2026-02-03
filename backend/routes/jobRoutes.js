import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      job_id,
      title,
      department,
      skills,
      experience,
      employment_type,
      openings,
      description,
      status
    } = req.body;

    const sql = `
      INSERT INTO jobs
      (jobId, title, department, skills, experience, employmentType, openings, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      job_id,
      title,
      department,
      skills,
      experience,
      employment_type,
      Number(openings),
      description,
      status || "open"
    ]);

    res.json({ message: "Job created" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Job insert failed" });
  }
});
/* ================= GET ALL JOBS ================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM jobs");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

/* ================= GET JOB BY ID (optional) ================= */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM jobs WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Job not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

/* ================= CLOSE JOB & TRIGGER AI ================= */
router.put("/:id/close", async (req, res) => {
  try {
    const { id } = req.params;

    // Update job status to closed
    await pool.query("UPDATE jobs SET status='closed' WHERE id=?", [id]);

    // Trigger AI scoring workflow asynchronously
    processJobClosure(id);

    res.json({ message: "Job closed and AI evaluation started" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to close job" });
  }});


export default router;
