import { google } from "googleapis";
import pool from "../db.js";
import { transitionCandidate } from "../services/stateMachine.js";
import { sendShortlistMail, sendRejectionMail, createInAppNotification } from "../services/notify.js";
import { v4 as uuidv4 } from "uuid";

const SHEETS = {
  APTI: "1wAXx2HWtN9VgNFLDojRPhwRzMatKC8q8D-DXD5s8QfM",
  TECH: "1P1lmLycDLEtyWYqrCzIxeaNO3Pbs_GnpyRzz0A88yXA",
  HR: "1BaAVRzy0glt0WTEOkiPBqXouJFaieYUOEUlb-BPT4Pw",
};
const RANGE = "'Form responses'!A2:D";
const PASS_THRESHOLD = 20;

async function fetchSheet(sheetId) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "service-account.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: RANGE });
  return res.data.values || [];
}

function normalizeRow(row) {
  return {
    email: (row[1] || "").trim().toLowerCase(),
    position: (row[3] || "").trim().toLowerCase(),
    score: Number(row[2] || 0),
  };
}

export async function processRound(roundName, levelId, sheetId) {
  console.log(`\n🔹 Processing ${roundName} Round...`);
  const rows = await fetchSheet(sheetId);

  for (const row of rows) {
    const { email, position, score } = normalizeRow(row);
    if (!email || !position || isNaN(score)) continue;

    const passed = score >= PASS_THRESHOLD;

    const [candidates] = await pool.query(
      `SELECT id FROM external_candidates WHERE LOWER(TRIM(email))=? AND LOWER(TRIM(position))=?`,
      [email, position]
    );
    if (!candidates.length) continue;

    const candidateId = candidates[0].id;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    let transactionSuccess = false;

    try {
      // 1️⃣ Check existing interview
      const [existing] = await conn.query(
        `SELECT status FROM interviews WHERE candidate_id=? AND level_id=?`,
        [candidateId, levelId]
      );

      if (existing.length && existing[0].status === "Passed") {
        await conn.rollback();
        conn.release();
        continue;
      }

      // 2️⃣ Insert or update interview result
      await conn.query(
        `INSERT INTO interviews
          (candidate_id, level_id, position, test_score, test_status, status, round_type, interview_token)
         VALUES (?, ?, ?, ?, 'completed', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           test_score=VALUES(test_score),
           test_status='completed',
           status=VALUES(status)`,
        [candidateId, levelId, position, score, passed ? "Passed" : "Rejected", roundName.toLowerCase(), uuidv4()]
      );

      // 3️⃣ Transition candidate state
      await transitionCandidate(candidateId, `${roundName.toUpperCase()}_${passed ? "PASS" : "FAIL"}`, conn);

      await conn.commit();
      transactionSuccess = true;
    } catch (err) {
      await conn.rollback();
      console.error(`❌ Transaction failed for ${email}:`, err);
    } finally {
      conn.release();
    }

    // 4️⃣ Send notifications **after transaction**
    if (transactionSuccess) {
      try {
        if (passed) {
          const interviewLink =
            roundName === "HR"
              ? process.env.HR_MEET_LINK
              : process.env.TECH_FORM_LINK;
          const expiryTime =
            roundName !== "HR" ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null;

          await sendShortlistMail(email, new Date(), roundName, interviewLink, expiryTime);
          await createInAppNotification(candidateId, `${roundName} Result`, "You have been shortlisted.");
          console.log(`✅ Shortlist email sent to ${email}`);
        } else {
          await sendRejectionMail(email);
          await createInAppNotification(candidateId, `${roundName} Result`, "You were not shortlisted.");
          console.log(`❌ Rejection email sent to ${email}`);
        }
      } catch (err) {
        console.error(`⚠️ Notification/Email failed for ${email}:`, err);
      }
    }
  }
}
export async function runRecruitmentPipeline() {
  console.log("🔄 Recruitment Pipeline Running...");

  await processRound("APTI", 1, SHEETS.APTI);
  await processRound("TECH", 2, SHEETS.TECH);
  await processRound("HR", 3, SHEETS.HR);

  console.log("✅ Recruitment Pipeline Completed");
}