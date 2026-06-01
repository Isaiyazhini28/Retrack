import cron from "node-cron";
import { google } from "googleapis";
import pool from "../db.js";

const SPREADSHEET_ID = "1wAXx2HWtN9VgNFLDojRPhwRzMatKC8q8D-DXD5s8QfM";
const RANGE = "'Form responses'!A2:Z'";

async function syncInterviewScores() {
  try {
    console.log("🔄 Auto Score Sync Running...");

    const auth = new google.auth.GoogleAuth({
      keyFile: "service-account.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = result.data.values || [];
    if (!rows.length) return;

    for (const row of rows) {
      const email = (row[1] || "").trim().toLowerCase();
      const rawScore = row[2];

      if (!email) continue;

      if (!rawScore || isNaN(rawScore)) {
        console.log(`⚠ Skipping invalid score for ${email}`);
        continue;
      }

      const score = Number(rawScore);

      const [candidates] = await pool.query(
        `SELECT id FROM external_candidates WHERE LOWER(email)=?`,
        [email]
      );

      if (!candidates.length) continue;

      const candidateId = candidates[0].id;

      // ✅ Update only latest interview
      const [updateResult] = await pool.query(
        `UPDATE interviews
         SET test_score=?,
             test_status='completed',
             status = CASE WHEN ? >= 20 THEN 'Passed' ELSE 'Rejected' END
         WHERE id = (
           SELECT id FROM (
             SELECT id FROM interviews
             WHERE candidate_id=?
             ORDER BY id DESC
             LIMIT 1
           ) x
         )
         AND test_status <> 'completed'`,
        [score, score, candidateId]
      );

      if (updateResult.affectedRows === 0) continue;

      console.log(
        score >= 20
          ? `✅ ${email} passed (${score})`
          : `❌ ${email} rejected (${score})`
      );
    }

    console.log("✅ Interview scores synced");
  } catch (err) {
    console.error("❌ Google Sheet sync error:", err.message);
  }
}

/* ⏰ Run Every 1 Minute */
cron.schedule("0 * * * *", () => {
  syncInterviewScores();
});

export default syncInterviewScores;
