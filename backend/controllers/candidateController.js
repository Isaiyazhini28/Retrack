import Candidate from "../models/Candidate.js";
import XLSX from "xlsx";

import pool from "../db.js";
import { parseResume } from "../services/resumeParser.js";

export const applyCandidate = async (req, res) => {
  try {
    const { name, email, phone, jobId, source } = req.body;

    const resumeText = await parseResume(req.file.path);

    await pool.query(
      "INSERT INTO external_candidates (first_name, email, phone, position, resume_url, resume_text) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, phone, jobId, req.file.filename, resumeText]
    );

    res.status(201).json({ message: "Candidate applied successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to apply candidate" });
  }
};

export const getCandidates = async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM external_candidates ORDER BY created_at DESC");
  res.json(rows);
};

export const exportCandidatesExcel = async (req, res) => {
  const candidates = await Candidate.find().lean();
  const worksheet = XLSX.utils.json_to_sheet(candidates);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", "attachment; filename=candidates.xlsx");
  res.send(buffer);
};

export const aiShortlist = async (req, res) => {
  const jobId = req.params.jobId;
  try {
    // fetch job description
    const [jobRows] = await pool.query(`SELECT description FROM jobs WHERE id = ?`, [jobId]);
    if (!jobRows.length) return res.status(404).json({ message: "Job not found" });
    const jobDesc = jobRows[0].description;

    // fetch external candidates for this job
    const [candidates] = await pool.query(
      `SELECT id, resume_url FROM external_candidates WHERE position = ?`,
      [jobId]
    );

    // placeholder scoring
    const scored = candidates.map(c => {
      const score = Math.floor(Math.random() * 40 + 60); // 60–100
      return { id: c.id, score };
    });

    // update scores in DB
    for (const c of scored) {
      const shortlist = c.score >= 65 ? "shortlisted" : "pending";
      await pool.query(
        `UPDATE external_candidates SET ai_score = ?, shortlist_status = ? WHERE id = ?`,
        [c.score, shortlist, c.id]
      );
    }

    res.json(scored);
  } catch (err) {
    console.error("❌ AI SHORTLIST ERROR:", err);
    res.status(500).json({ message: "AI shortlisting failed", error: err.message });
  }
};



