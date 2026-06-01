import express from "express";
import pool from "../db.js";
import { google } from "googleapis";
import { processCandidate } from "../services/autoPipeline.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import axios from "axios";

const router = express.Router();

/* ---------- Parse PDF from URL ---------- */
const parseResumeFromUrl = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
    });

    const data = new Uint8Array(response.data);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }

    console.log(`📄 Parsed resume (${text.length} chars)`);
    return text.trim();
  } catch (err) {
    console.warn(`⚠ Failed to parse resume (${url}):`, err.message);
    return "";
  }
};

/* ================= SYNC FROM GOOGLE SHEET ================= */
router.get("/sync", async (req, res) => {
  try {
    console.log("🔄 External candidate sync started");

    const auth = new google.auth.GoogleAuth({
      keyFile: "service-account.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const SHEET_ID = "1ukmmK6aojGxbl2PvbGkPHn_xqIRLEHmpQyqfGeDAlgk";
    const RANGE = "'Form responses'!A2:H";

    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = sheetRes.data.values || [];
    if (!rows.length) {
      return res.json({ message: "No candidates found", inserted: 0 });
    }

    let insertedCount = 0;

    for (const [index, r] of rows.entries()) {
      try {
        const [first_name, last_name, email, phone, position, experience, resume_url] =
          r.map((v) => (v || "").trim());

        if (!email || !position || !resume_url) continue;

        // 1️⃣ Insert candidate (skip if already exists)
        const [insertResult] = await pool.query(
          `INSERT IGNORE INTO external_candidates
           (first_name, last_name, email, phone, position, experience, resume_url)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [first_name, last_name, email, phone, position, experience, resume_url]
        );

        if (insertResult.affectedRows === 0) continue;

        insertedCount++;

        // 2️⃣ Parse resume
        const resumeText = await parseResumeFromUrl(resume_url);

        // FIX: unified invalid-resume handling — was using two different status columns
        if (!resumeText || resumeText.length < 100) {
          console.warn(`⚠ Resume extraction failed for: ${email}`);
          await pool.query(
            `UPDATE external_candidates
             SET shortlist_status='invalid_resume'
             WHERE email=? AND position=?`,
            [email, position]
          );
          continue;
        }

        // 3️⃣ Save parsed resume text
        await pool.query(
          `UPDATE external_candidates SET resume_text=? WHERE email=? AND position=?`,
          [resumeText, email, position]
        );

        // 4️⃣ Fetch inserted candidate row
        const [candidates] = await pool.query(
          `SELECT * FROM external_candidates WHERE email=? AND position=?`,
          [email, position]
        );
        if (!candidates.length) continue;
        const candidate = candidates[0];

        // FIX: removed duplicate ai_score>0 skip check — only one guard needed
        if (candidate.ai_score && candidate.ai_score > 0) {
          console.log(`⏩ Skipping already scored: ${email}`);
          continue;
        }

        // 5️⃣ Fetch matching job
        const [jobs] = await pool.query(
          `SELECT * FROM jobs WHERE title=? LIMIT 1`,
          [position]
        );
        if (!jobs.length) {
          console.warn(`⚠ No matching job found for: ${position}`);
          continue;
        }
        const job = jobs[0];

        // 6️⃣ Run AI scoring + schedule aptitude if shortlisted
        await processCandidate(candidate, job);

        console.log(`✅ Fully processed ${email}`);
      } catch (err) {
        console.error(`❌ Row ${index + 2} failed:`, err.message);
      }
    }

    res.json({
      message: "External candidates synced successfully",
      inserted: insertedCount,
      totalFromSheet: rows.length,
    });
  } catch (err) {
    console.error("❌ SYNC ERROR:", err);
    res.status(500).json({ message: "Sync failed", error: err.message });
  }
});

/* ================= CLEAR ALL ================= */
router.delete("/clear", async (req, res) => {
  try {
    await pool.query("DELETE FROM interviews");
    await pool.query("DELETE FROM external_candidates");
    res.json({ success: true });
  } catch (err) {
    console.error("CLEAR ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= GET ALL ================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        first_name  AS firstName,
        last_name   AS lastName,
        email,
        phone,
        position,
        experience,
        resume_url        AS resumeUrl,
        ai_score          AS aiScore,
        shortlist_status  AS shortlistStatus,
        created_at
      FROM external_candidates
      ORDER BY id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch candidates" });
  }
});

export default router;