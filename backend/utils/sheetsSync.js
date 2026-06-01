import cron from "node-cron";
import { google } from "googleapis";
import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { sendShortlistMail, sendRejectionMail } from "../services/notify.js";
import { transitionCandidate } from "../services/stateMachine.js";

const SPREADSHEET_ID = "1wAXx2HWtN9VgNFLDojRPhwRzMatKC8q8D-DXD5s8QfM";
const RANGE = "'Form responses'!A2:D";


// -----------------------
// 1️⃣ Fetch Google Sheet Data
// -----------------------
async function fetchSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "service-account.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });

  return result.data.values || [];
}


// -----------------------
// 2️⃣ Schedule Next Round
// -----------------------
export async function scheduleNextRound(candidateId, currentLevel, conn = pool, position) {
  const nextLevel = Number(currentLevel) + 1;
  const [candidateRows] = await conn.query(
    `SELECT pipeline_state, email FROM external_candidates WHERE id=?`,
    [candidateId]
  );

  if (!candidateRows.length) return null;

  const pipelineState = candidateRows[0].pipeline_state;
  const email = candidateRows[0].email;

  if (pipelineState.endsWith('_FAILED') || pipelineState === 'AI_REJECTED') {
    console.log("⚠ Candidate already failed. Skipping next round:", candidateId);
    return null;
  }

  if (nextLevel > 3) return null;

  try {
    const token = uuidv4();

    if (nextLevel === 2) {
      const expiryTime = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await conn.query(
        `INSERT INTO interviews
          (candidate_id, level_id, position, status, test_status, interview_token, interview_expiry, meeting_link, round_type)
         VALUES (?, 2, ?, 'Scheduled', 'pending', ?, ?, ?, 'technical')
         ON DUPLICATE KEY UPDATE 
           status='Scheduled', test_status='pending', interview_token=VALUES(interview_token), interview_expiry=VALUES(interview_expiry), meeting_link=VALUES(meeting_link)`,
        [candidateId, position, token, expiryTime, process.env.TECH_FORM_LINK]
      );

      return { email, type: "Technical", meetingLink: process.env.TECH_FORM_LINK, expiryTime };
    }

    if (nextLevel === 3) {
      const interviewDate = new Date();
      interviewDate.setDate(interviewDate.getDate() + 2);
      interviewDate.setHours(11, 0, 0, 0);

      await conn.query(
        `INSERT INTO interviews
          (candidate_id, level_id, position, interview_date, status, meeting_link, round_type)
         VALUES (?, 3, ?, ?, 'Scheduled', ?, 'hr')
         ON DUPLICATE KEY UPDATE 
           status='Scheduled', interview_date=VALUES(interview_date), meeting_link=VALUES(meeting_link)`,
        [candidateId, position, interviewDate, process.env.HR_MEET_LINK]
      );

      return { email, type: "HR", interviewDate, meetingLink: process.env.HR_MEET_LINK };
    }

  } catch (err) {
    console.error("Schedule Error:", err);
    throw err;
  }
}



// -----------------------
// 3️⃣ Main Recruitment Pipeline
// -----------------------
// -----------------------
// 3️⃣ Main Recruitment Pipeline (Aptitude Sync)
// -----------------------
export async function autoRecruitmentPipeline() {
  try {
    console.log("🔄 Recruitment Pipeline Running...");

    const rows = await fetchSheetData();

    for (const row of rows) {
      const email = (row[1] || "").trim().toLowerCase();
const position = (row[3] || "").trim().toLowerCase(); // NEW: normalize
const rawScore = row[2];// NEW: include position

      if (!email || isNaN(rawScore) || !position) continue;

      const score = Number(rawScore);
      const passed = score >= 20;

      // 🔹 Fetch candidate by email + position
      const [candidates] = await pool.query(
        `SELECT id FROM external_candidates 
WHERE LOWER(TRIM(email))=? AND LOWER(TRIM(position))=?`,
        [email, position]
      );

      if (!candidates.length) {
        console.log("❌ No match:", email, position);
        continue;
      }

      const candidateId = candidates[0].id;

      const conn = await pool.getConnection();
      await conn.beginTransaction();

      try {
        const [existingAptitude] = await conn.query(
          `SELECT status FROM interviews
           WHERE candidate_id=? AND level_id=1`,
          [candidateId]
        );

        if (existingAptitude.length && existingAptitude[0].status === "Passed") {
          console.log("⏭ Aptitude already processed:", email, position);
          await conn.rollback();
          conn.release();
          continue;
        }

    await conn.query(
  `INSERT INTO interviews
(candidate_id, level_id, position, test_score, test_status, status, round_type)
VALUES (?, 1, ?, ?, 'completed', ?, 'aptitude')
ON DUPLICATE KEY UPDATE
  test_score = VALUES(test_score),
  test_status = 'completed',
  status = VALUES(status)`,
  [candidateId, position, score, passed ? 'Passed' : 'Rejected']
);
if (!position) {
  console.warn("❌ Skipping row: position missing for", email);
  continue; // skip this row
}
        // ✅ Let State Machine Handle Everything
        await transitionCandidate(
          candidateId,
          passed ? "APTITUDE_PASS" : "APTITUDE_FAIL",
          conn
        );

        await conn.commit();
        console.log("✅ Processed:", email, position);

      } catch (err) {
        await conn.rollback();
        console.error("❌ Transaction failed:", err);
      } finally {
        conn.release();
      }
    }

  } catch (err) {
    console.error("❌ Pipeline error:", err);
  }
}


// -----------------------
// 4️⃣ Technical Sync (Level 2) - Email + Position
// -----------------------
export async function autoTechnicalSync() {
  try {
    console.log("🔄 Technical Sheet Sync Running...");

    const auth = new google.auth.GoogleAuth({
      keyFile: "service-account.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1P1lmLycDLEtyWYqrCzIxeaNO3Pbs_GnpyRzz0A88yXA",
      range: "'Form responses'!A2:D",
    });

    const rows = response.data.values || [];

    for (const row of rows) {
     const email = (row[1] || "").trim().toLowerCase();
const position = (row[3] || "").trim().toLowerCase(); // NEW: normalize
const rawScore = row[2]; // NEW

      if (!email || isNaN(rawScore) || !position) continue;

      const score = Number(rawScore);
      const passed = score >= 20;

      // 🔹 Fetch candidate by email + position
      const [candidate] = await pool.query(
        `SELECT id FROM external_candidates 
WHERE LOWER(TRIM(email))=? AND LOWER(TRIM(position))=?`,
        [email, position]
      );

      if (!candidate.length) continue;

      const candidateId = candidate[0].id;

      // Skip if already processed
      const [existing] = await pool.query(
        `SELECT status FROM interviews
         WHERE candidate_id=? AND level_id=2`,
        [candidateId]
      );

      if (existing.length && existing[0].status === "Passed") {
        console.log("⏭ Technical already processed:", email, position);
        continue;
      }

      // 🔥 STATE MACHINE HANDLES EVERYTHING ELSE
      const conn = await pool.getConnection();
      await conn.beginTransaction();

      try {
   await conn.query(
  `INSERT INTO interviews
(candidate_id, level_id, position, test_score, test_status, status, round_type)
VALUES (?, 2, ?, ?, 'completed', ?, 'technical')
ON DUPLICATE KEY UPDATE
  test_score = VALUES(test_score),
  test_status = 'completed',
  status = VALUES(status)`,
  [candidateId, position, score, passed ? 'Passed' : 'Rejected']
);
if (!position) {
  console.warn("❌ Skipping row: position missing for", email);
  continue; // skip this row
}
        await transitionCandidate(
          candidateId,
          passed ? "TECH_PASS" : "TECH_FAIL",
          conn
        );

        await conn.commit();
        console.log("✅ Technical Processed:", email, position);

      } catch (err) {
        await conn.rollback();
        console.error("❌ Technical Transaction Failed:", err);
      } finally {
        conn.release();
      }
    }

  } catch (error) {
    console.error("❌ Technical Sync Error:", error);
  }
}


// -----------------------
// 4️⃣ Cron (Every Minute)
// -----------------------
let isRunning = false;

cron.schedule("0 * * * *", async () => {
  if (isRunning) {
    console.log("⚠ Previous cycle still running. Skipping...");
    return;
  }

  isRunning = true;

  try {
    await processAIScreening();
    await autoRecruitmentPipeline();
    await expireInterviews();
    await autoTechnicalSync();
    await autoHRSync();
  } catch (err) {
    console.error("Cron error:", err);
  } finally {
    isRunning = false;
  }
});

export default autoRecruitmentPipeline;


// export async function autoTechnicalSync() {
//   try {
//     console.log("🔄 Technical Sheet Sync Running...");

//     const auth = new google.auth.GoogleAuth({
//       keyFile: "service-account.json",
//       scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
//     });

//     const sheets = google.sheets({ version: "v4", auth });

//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId: "1P1lmLycDLEtyWYqrCzIxeaNO3Pbs_GnpyRzz0A88yXA",
//       range: "'Form responses'!A2:D",
//     });

//     const rows = response.data.values || [];

//     for (const row of rows) {

//       const email = (row[1] || "").trim().toLowerCase();
//       const rawScore = row[2];

//       if (!email || isNaN(rawScore)) continue;

//       const score = Number(rawScore);
//       const passed = score >= 20;

//       const [candidate] = await pool.query(
//         `SELECT id FROM external_candidates
//          WHERE LOWER(TRIM(email))=?`,
//         [email]
//       );

//       if (!candidate.length) continue;

//       const candidateId = candidate[0].id;

//       // Skip if already processed
//       const [existing] = await pool.query(
//         `SELECT status FROM interviews
//          WHERE candidate_id=? AND level_id=2`,
//         [candidateId]
//       );

//       if (existing.length && existing[0].status === "Passed") {
//         console.log("⏭ Technical already processed:", email);
//         continue;
//       }

 

//       // 🔥 STATE MACHINE HANDLES EVERYTHING ELSE
//      const conn = await pool.getConnection();
// await conn.beginTransaction();

// try {

//   await conn.query(
//   `INSERT INTO interviews
//    (candidate_id, level_id, test_score, test_status, status, round_type)
//    VALUES (?, 2, ?, 'completed', ?, 'technical')
//    ON DUPLICATE KEY UPDATE
//      test_score = VALUES(test_score),
//      test_status = 'completed',
//      status = VALUES(status)`,
//   [candidateId, score, passed ? 'Passed' : 'Rejected']
// );

//   await transitionCandidate(
//     candidateId,
//     passed ? "TECH_PASS" : "TECH_FAIL",
//     conn
//   );

//   await conn.commit();
//   console.log("✅ Technical Processed:", email);

// } catch (err) {
//   await conn.rollback();
//   console.error("❌ Technical Transaction Failed:", err);
// } finally {
//   conn.release();
// }

//     }

//   } catch (error) {
//     console.error("❌ Technical Sync Error:", error);
//   }
// }

async function expireInterviews() {
  try {
    await pool.query(`
      UPDATE interviews i
JOIN external_candidates ec ON ec.id = i.candidate_id
SET 
  i.test_status = 'expired',
  i.status = 'Rejected',
  ec.shortlist_status = 'rejected'
WHERE 
  i.test_status = 'pending'
  AND i.interview_expiry IS NOT NULL
  AND i.interview_expiry < NOW()
  AND i.level_id = 2;
    `);
    const [expiredCandidates] = await pool.query(`
  SELECT candidate_id
  FROM interviews
  WHERE test_status='expired'
  AND level_id=2
`);

for (const row of expiredCandidates) {
 const conn = await pool.getConnection();
await conn.beginTransaction();

try {
  await transitionCandidate(row.candidate_id, "TECH_FAIL", conn);
  await conn.commit();
} catch (err) {
  await conn.rollback();
} finally {
  conn.release();
}
}

    console.log("✅ Expired interviews processed");
  } catch (err) {
    console.error("Expire error:", err);
  }
}
async function processAIScreening() {

  const AI_THRESHOLD = 20;

  const [candidates] = await pool.query(
    `SELECT id, email, ai_score, pipeline_state
     FROM external_candidates`
  );

for (const c of candidates) {

  if (c.pipeline_state !== "APTITUDE_PENDING") continue;

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {

    if (c.ai_score < AI_THRESHOLD) {
      await transitionCandidate(c.id, "AI_FAIL", conn);
      console.log("❌ AI Rejected:", c.email);
    } else {
      await transitionCandidate(c.id, "AI_PASS", conn);
      console.log("✅ AI Passed:", c.email);
    }

    await conn.commit();

  } catch (err) {
    await conn.rollback();
    console.error("❌ AI Transaction Failed:", err);
  } finally {
    conn.release();
  }
}
}

export async function autoHRSync() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: "service-account.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1BaAVRzy0glt0WTEOkiPBqXouJFaieYUOEUlb-BPT4Pw",
      range: "'Form responses'!A2:D",
    });

    const rows = response.data.values || [];

    for (const row of rows) {
      const email = (row[1] || "").trim().toLowerCase();
const position = (row[3] || "").trim().toLowerCase(); // NEW: normalize
const rawScore = row[2]; // NEW

      if (!email || !position) continue;

      const [candidate] = await pool.query(
        `SELECT id FROM external_candidates 
WHERE LOWER(TRIM(email))=? AND LOWER(TRIM(position))=?`,
        [email, position]
      );

      if (!candidate.length) continue;

      const candidateId = candidate[0].id;
      const score = Number(rawScore);
      const passed = score > 20;

      const conn = await pool.getConnection();
      await conn.beginTransaction();

      try {
        // Insert/Update HR result
        await conn.query(
  `INSERT INTO interviews
(candidate_id, level_id, position, test_score, test_status, status, round_type)
VALUES (?, 3, ?, ?, 'completed', ?, 'hr')
ON DUPLICATE KEY UPDATE
  test_score = VALUES(test_score),
  test_status = 'completed',
  status = VALUES(status)`,
  [candidateId, position, score, passed ? 'Passed' : 'Rejected']
);
if (!position) {
  console.warn("❌ Skipping row: position missing for", email);
  continue; // skip this row
}

        await transitionCandidate(
          candidateId,
          passed ? "HR_PASS" : "HR_FAIL",
          conn
        );

        await conn.commit();
        console.log("✅ HR Processed:", email, position);

      } catch (err) {
        await conn.rollback();
        console.error("❌ HR Transaction Failed:", email, position, err);
      } finally {
        conn.release();
      }
    }

  } catch (err) {
    console.error("❌ HR Sync Error:", err);
  }
}
