import express from "express";
import pool from "../db.js";
import { deleteJob } from '../controllers/jobController.js';

const router = express.Router();
router.delete('/:id', deleteJob);

router.post("/", async (req, res) => {
  try {
    // ✅ 1. Destructure FIRST
    const {
      job_id,
      title,
      department,
      skills,
      experience,
      employment_type,
      openings,
      description,
      status,
      opening_date,
      closing_date
    } = req.body;

    // ✅ 2. Convert date to YYYY-MM-DD (NO TIME)
    const formatDate = (date) =>
      date ? new Date(date).toISOString().split("T")[0] : null;

    const openingDate = formatDate(opening_date);
    const closingDate = formatDate(closing_date);

    // ✅ 3. Auto-close if date < today
    const today = new Date().toISOString().split("T")[0];
    let finalStatus = status || "open";

    if (closingDate && closingDate < today) {
      finalStatus = "closed";
    }

    // ✅ 4. Insert
    await pool.query(
      `INSERT INTO jobs
      (jobId, title, department, skills, experience, employmentType,
       openings, description, status, opening_date, closing_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job_id,
        title,
        department,
        skills,
        experience,
        employment_type,
        Number(openings) || 0,
        description,
        finalStatus,
        openingDate,
        closingDate
      ]
    );

    res.json({ message: "Job created successfully" });

  } catch (err) {
    console.error("POST /api/jobs error:", err);
    res.status(500).json({ error: "Job insert failed", details: err.message });
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

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      job_id, title, department, skills, experience,
      employment_type, openings, opening_date, closing_date,
      description, status
    } = req.body;

    const sql = `
      UPDATE jobs SET
        jobId=?, title=?, department=?, skills=?, experience=?,
        employmentType=?, openings=?, opening_date=?, closing_date=?, description=?, status=?
      WHERE id=?
    `;

    const [result] = await pool.query(sql, [
      job_id || null,              // map job_id → jobId
      title,
      department,
      skills,
      experience,
      employment_type || null,     // map employment_type → employmentType
      Number(openings) || 0,       // ensure openings is a number
      opening_date || null,
      closing_date || null,
      description,
      status,
      id
    ]);

    if (result.affectedRows === 0) return res.status(404).json({ error: "Job not found" });

    res.json({ message: "Job updated successfully" });

  } catch (err) {
    console.error("PUT /api/jobs/:id error:", err);
    res.status(500).json({ error: "Job update failed", details: err.message });
  }
});




export default router;
