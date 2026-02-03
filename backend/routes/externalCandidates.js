import express from "express";
import pool from "../db.js";
import { google } from "googleapis";
import { processCandidate } from "./processCandidate.js";

const router = express.Router();

/* ================= SYNC FROM GOOGLE SHEET ================= */
router.get("/sync", async (req, res) => {
  try {
    console.log("🔄 External candidate sync started");

    const auth = new google.auth.GoogleAuth({
      keyFile: "google-service.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const SHEET_ID = "1ukmmK6aojGxbl2PvbGkPHn_xqIRLEHmpQyqfGeDAlgk";
    const RANGE = "'Form responses'!A2:H";

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = result.data.values || [];
    if (!rows.length) {
      return res.json({ message: "No external candidates found", inserted: 0 });
    }

    let insertedCount = 0;

    for (const r of rows) {
      const [
        first_name,
        last_name,
        email,
        phone,
        position,
        experience,
        resume_url
      ] = r.map(cell => (cell || "").trim());

      if (!email || !position) continue;

      // Insert candidate (ignore duplicates)
      const [result] = await pool.query(
        `INSERT IGNORE INTO external_candidates
         (first_name, last_name, email, phone, position, experience, resume_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [first_name, last_name, email, phone, position, experience, resume_url]
      );

      if (result.affectedRows === 1) {
        insertedCount++;

        // Fetch inserted candidate
        const [inserted] = await pool.query(
          "SELECT * FROM external_candidates WHERE email=? AND position=?",
          [email, position]
        );

        if (inserted.length > 0) {
          const candidate = inserted[0];

          // Fetch matching job
          const [jobs] = await pool.query(
            "SELECT * FROM jobs WHERE title=? LIMIT 1",
            [position]
          );

          if (jobs.length > 0) {
            const job = jobs[0];

            // Run AI scoring
            try {
              await processCandidate(candidate, job);
              console.log(`✅ AI scored ${candidate.email} | Job: ${job.title}`);
            } catch (err) {
              console.error(`AI scoring failed for ${candidate.email}:`, err.message);
            }
          } else {
            console.warn(`⚠ No matching job found for candidate ${candidate.email} (${position})`);
          }
        }
      }
    }

    console.log(`✅ Sync completed | New rows inserted: ${insertedCount}`);

    res.json({
      message: "External candidates synced successfully",
      inserted: insertedCount,
      totalFromSheet: rows.length,
    });

  } catch (err) {
    console.error("❌ SYNC ERROR:", err);
    res.status(500).json({ message: "External candidate sync failed", error: err.message });
  }
});

/* ================= CLEAR ALL ================= */
router.delete("/clear", async (req, res) => {
  try {
    await pool.query("TRUNCATE TABLE external_candidates");
    res.json({ message: "All external candidates cleared" });
  } catch (err) {
    console.error("❌ CLEAR ERROR:", err);
    res.status(500).json({ message: "Failed to clear external candidates" });
  }
});

/* ================= GET ALL ================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM external_candidates ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch external candidates" });
  }
});

export default router;
