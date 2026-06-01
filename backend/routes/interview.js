import express from "express";
import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { sendShortlistMail, sendRejectionMail  } from "../services/notify.js";
import { scheduleNextRound } from "../utils/sheetsSync.js";
import { transitionCandidate } from "../services/stateMachine.js";
import { runRecruitmentPipeline } from "../routes/recruitmentPipeline.js";



const router = express.Router();
// 🔹 Create Level 1 interviews for all shortlisted candidates


// 🔹 Generate random interview slot after closing date
async function getRandomInterviewTime(db, closingDate) {
  let date = new Date(closingDate);
  date.setDate(date.getDate() + 10);

  for (let i = 0; i < 365; i++) {
    if (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
      continue;
    }

    const possibleSlots = [];
    for (let hour = 10; hour < 16; hour++) {
      for (let min of [0, 30]) {
        const slot = new Date(date);
        slot.setHours(hour, min, 0, 0);
        possibleSlots.push(slot);
      }
    }
    const slot16 = new Date(date);
    slot16.setHours(16, 0, 0, 0);
    possibleSlots.push(slot16);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [rows] = await db.query(
      "SELECT interview_date FROM interviews WHERE interview_date BETWEEN ? AND ?",
      [
        dayStart.toISOString().slice(0, 19).replace("T", " "),
        dayEnd.toISOString().slice(0, 19).replace("T", " ")
      ]
    );

    const booked = new Set(rows.map(r => new Date(r.interview_date).getTime()));
    const freeSlots = possibleSlots.filter(slot => !booked.has(slot.getTime()));

    if (freeSlots.length > 0) {
      return freeSlots[Math.floor(Math.random() * freeSlots.length)];
    }

    date.setDate(date.getDate() + 1);
  }

  throw new Error("No free interview slots available.");
}

// 🟢 GET all candidates with latest interview info
// 🟢 GET all candidates with latest interview info
// 🟢 GET all candidates with interview status
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ec.id as candidate_id,
        ec.first_name,
        ec.last_name,
        ec.email,
        ec.position,
        ec.ai_score,
        ec.shortlist_status,

        MAX(CASE WHEN i.level_id = 1 THEN i.status END) as aptitude_status,
        MAX(CASE WHEN i.level_id = 1 THEN i.test_score END) as aptitude_score,

        MAX(CASE WHEN i.level_id = 2 THEN i.status END) as technical_status,
        MAX(CASE WHEN i.level_id = 2 THEN i.test_score END) as technical_score,

        MAX(CASE WHEN i.level_id = 3 THEN i.status END) as hr_status,
        MAX(CASE WHEN i.level_id = 3 THEN i.test_score END) as hr_score,
        MAX(CASE WHEN i.level_id = 3 THEN i.interview_date END) as hr_date,
        MAX(CASE WHEN i.level_id = 3 THEN i.meeting_link END) as hr_link

      FROM external_candidates ec
      LEFT JOIN interviews i ON ec.id = i.candidate_id
      GROUP BY ec.id, ec.position
      ORDER BY ec.id DESC
    `);

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// router.post("/submit-score", async (req, res) => {
//   const { token, score } = req.body;

//   try {
//     // 1️⃣ Find candidate using aptitude_token
//     const [rows] = await pool.query(
//       `SELECT id, email, shortlist_status, current_level
//        FROM external_candidates
//        WHERE aptitude_token = ?`,
//       [token]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ message: "Invalid token" });
//     }

//     const candidate = rows[0];

//     // 2️⃣ Only shortlisted candidates allowed
//     if (candidate.shortlist_status !== "shortlisted") {
//       return res.status(400).json({ message: "Candidate not shortlisted" });
//     }

//     const numericScore = Number(score);
//     const passed = numericScore >= 20;

//     // 3️⃣ Update aptitude result in candidate table
//     await pool.query(
//       `UPDATE external_candidates
//        SET aptitude_score = ?,
//            aptitude_status = ?,
//            current_level = ?
//        WHERE id = ?`,
//       [
//         numericScore,
//         passed ? "passed" : "failed",
//         passed ? 2 : 1,
//         candidate.id
//       ]
//     );

//     if (passed) {
//       // 4️⃣ Schedule Technical (Level 2)
//       await scheduleNextRound(candidate.id, 1);

//       return res.json({
//         message: "Aptitude passed. Technical round scheduled.",
//       });

//     } else {

//       // 5️⃣ Reject candidate
//       await pool.query(
//         `UPDATE external_candidates
//          SET shortlist_status = 'rejected'
//          WHERE id = ?`,
//         [candidate.id]
//       );

//       await sendRejectionMail(candidate.email);

//       return res.json({
//         message: "Aptitude failed. Candidate rejected.",
//       });
//     }

//   } catch (err) {
//     console.error("Aptitude Submit Error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });









// 🟢 Schedule next round for candidate
router.post("/:candidateId/next", async (req, res) => {
  const { candidateId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM interviews
       WHERE candidate_id=? 
       ORDER BY level_id DESC LIMIT 1`,
      [candidateId]
    );

    if (!rows.length) return res.json({ message: "No previous round found" });

    const currentLevel = rows[0].level_id;
    await scheduleNextRound(candidateId, currentLevel);

    res.json({ message: "Next round scheduled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});




// 🟢 Mark a specific interview as Passed and schedule next
// router.post("/:id/pass", async (req, res) => {
//   const interviewId = req.params.id;

//   try {
//     // 1️⃣ Get current interview
//     const [rows] = await pool.query(
//       `SELECT * FROM interviews WHERE id = ?`,
//       [interviewId]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ message: "Interview not found" });
//     }

//     const interview = rows[0];

//     // 2️⃣ Mark current as Passed
//     await pool.query(
//       `UPDATE interviews 
//        SET status = 'Passed', test_status = 'completed' 
//        WHERE id = ?`,
//       [interviewId]
//     );

//     // 3️⃣ Create next round
//     if (interview.level_id === 1) {
//       // Aptitude → Technical (level_id = 2)
//       await pool.query(
//         `INSERT INTO interviews 
//          (candidate_id, level_id, status, test_status)
//          VALUES (?, 2, 'Scheduled', 'pending')`,
//         [interview.candidate_id]
//       );

//       return res.json({ message: "Moved to Technical" });
//     }

//     if (interview.level_id === 2) {
//       // Technical → HR (level_id = 3)
//       await pool.query(
//         `INSERT INTO interviews 
//          (candidate_id, level_id, status)
//          VALUES (?, 3, 'Scheduled')`,
//         [interview.candidate_id]
//       );

//       return res.json({ message: "Moved to HR" });
//     }

//     return res.json({ message: "All rounds completed" });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


// POST /api/interviews/:id/fail
// router.post("/:id/fail", async (req, res) => {
//   const { id } = req.params;
//   try {
//     // 1️⃣ Update interview status to 'Failed'
//     const [updateResult] = await pool.query(
//       `UPDATE interviews SET status='Failed' WHERE id = ?`,
//       [id]
//     );

//     if (updateResult.affectedRows === 0) {
//       return res.status(404).json({ message: "Interview not found" });
//     }

//     // 2️⃣ Get candidate email & name
//     const [candidate] = await pool.query(
//       `SELECT ec.email 
//        FROM external_candidates ec
//        JOIN interviews i ON i.candidate_id = ec.id
//        WHERE i.id = ?`,
//       [id]
//     );

//     // 3️⃣ Send rejection email
//     if (candidate.length > 0) {
//       await sendRejectionMail(candidate[0].email);
//     }

//     res.json({ message: "Interview marked as Failed and rejection email sent" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.post("/:interviewId/status", async (req, res) => {
  const { interviewId } = req.params;
  const { status } = req.body;

  try {

    const [rows] = await pool.query(
      `SELECT candidate_id, level_id 
       FROM interviews 
       WHERE id=?`,
      [interviewId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Interview not found" });

    const { candidate_id, level_id } = rows[0];

    // Map level + status → event
    let event = null;

    if (level_id === 1 && status === "Passed") event = "APTITUDE_PASS";
    if (level_id === 1 && status === "Rejected") event = "APTITUDE_FAIL";

    if (level_id === 2 && status === "Passed") event = "TECH_PASS";
    if (level_id === 2 && status === "Rejected") event = "TECH_FAIL";

    if (level_id === 3 && status === "Passed") event = "HR_PASS";
    if (level_id === 3 && status === "Rejected") event = "HR_FAIL";

    if (!event)
      return res.status(400).json({ message: "Invalid transition" });

    await transitionCandidate(candidate_id, event);

    res.json({ message: `Interview marked as ${status}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});




// 🔹 Validate Interview Link
router.get("/test/:token", async (req, res) => {
  const { token } = req.params;

  const [rows] = await pool.query(
    `SELECT id, interview_expiry, test_status, meeting_link
     FROM interviews 
     WHERE interview_token = ?`,
    [token]
  );

  if (!rows.length) return res.send("Invalid Link");

  const interview = rows[0];

  if (interview.test_status === "completed")
    return res.send("Test already submitted.");

  if (new Date() > new Date(interview.interview_expiry)) {
    await pool.query(
      `UPDATE interviews 
       SET test_status = 'expired',
           status = 'rejected'
       WHERE id = ?`,
      [interview.id]
    );

    await pool.query(
      `UPDATE external_candidates
       SET shortlist_status = 'rejected'
       WHERE id = (
         SELECT candidate_id FROM interviews WHERE id = ?
       )`,
      [interview.id]
    );

    return res.send("Link Expired");
  }

  // 🔥 Redirect to Google Form
  res.redirect(interview.meeting_link);
});


router.get("/interview-scores", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        i.level_id,
        l.level_name,
        i.test_score,
        i.status,
        i.interview_date
      FROM interviews i
      JOIN external_candidates c ON c.id = i.candidate_id
      JOIN role_interview_levels l ON l.id = i.level_id
      WHERE i.test_status = 'completed'
      ORDER BY i.interview_date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching scores" });
  }
});
  

     


   

export default router;

// export const scheduleNextRound = async (candidateId, currentLevel) => {
//   try {

//     const nextLevel = Number(currentLevel) + 1;

//     if (nextLevel > 3) return;

//     // 🚨 Prevent duplicate
//     const [existing] = await pool.query(
//       `SELECT id FROM interviews 
//        WHERE candidate_id = ? AND level_id = ?`,
//       [candidateId, nextLevel]
//     );

//     if (existing.length > 0) return;

//     const token = uuidv4();
//     let interviewDate = null;
//     let expiryTime = null;
//     let meetingLink = null;

//     // =========================
//     // TECHNICAL ROUND (48 HRS)
//     // =========================
//     if (nextLevel === 2) {

//       expiryTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
//       meetingLink = `http://localhost:3000/test/${token}`;

//       await pool.query(`
//         INSERT INTO interviews 
//         (candidate_id, level_id, status, interview_token, interview_expiry, test_status, meeting_link)
//         VALUES (?, 2, 'Scheduled', ?, ?, 'pending', ?)`,
//         [candidateId, token, expiryTime, meetingLink]
//       );

//       const [candidate] = await pool.query(
//         `SELECT email FROM external_candidates WHERE id=?`,
//         [candidateId]
//       );

//       await sendShortlistMail(
//         candidate[0].email,
//         null,
//         "Technical",
//         meetingLink,
//         expiryTime
//       );

//       console.log("✅ Technical round created (48hr expiry)");
//     }

//     // =========================
//     // HR ROUND
//     // =========================
//     if (nextLevel === 3) {

//       const [candidate] = await pool.query(
//         `SELECT email, position FROM external_candidates WHERE id=?`,
//         [candidateId]
//       );

//       const position = candidate[0].position;

//       // 🔥 SAME POSITION → SAME TIME SLOT
//       const [existingHR] = await pool.query(`
//         SELECT interview_date, meeting_link
//         FROM interviews i
//         JOIN external_candidates ec ON ec.id = i.candidate_id
//         WHERE i.level_id = 3
//         AND ec.position = ?
//         LIMIT 1`,
//         [position]
//       );

//       if (existingHR.length > 0) {
//         interviewDate = existingHR[0].interview_date;
//         meetingLink = existingHR[0].meeting_link;
//       } else {
//         interviewDate = new Date();
//         interviewDate.setDate(interviewDate.getDate() + 2);
//         interviewDate.setHours(11, 0, 0, 0);

//         meetingLink = "https://meet.google.com/hr-round-link";
//       }

//       await pool.query(`
//         INSERT INTO interviews
//         (candidate_id, level_id, interview_date, status, meeting_link)
//         VALUES (?, 3, ?, 'Scheduled', ?)`,
//         [candidateId, interviewDate, meetingLink]
//       );

//       await sendShortlistMail(
//         candidate[0].email,
//         interviewDate,
//         "HR",
//         meetingLink,
//         null
//       );

//       console.log("✅ HR round scheduled");
//     }

//   } catch (err) {
//     console.error("Schedule Error:", err);
//   }
// };

router.post("/run-pipeline", async (req, res) => {
  try {
    await runRecruitmentPipeline();
    res.json({ message: "Recruitment pipeline executed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Pipeline execution failed." });
  }
});






