// cron/autoNextRound.js
import cron from 'node-cron';
import pool from '../db.js';
import { sendShortlistMail } from '../services/notify.js';
import  getRandomInterviewTime  from '../routes/interview.js';

// Runs every day at 00:00
cron.schedule('0 0 * * *', async () => {
  console.log("⏰ Auto-scheduling next interview rounds...");

  try {
    // 1️⃣ Get all interviews passed yesterday
    const [passedYesterday] = await pool.query(`
      SELECT i.id AS interview_id, i.candidate_id, i.level_id, rl.step_order, rl.level_name
      FROM interviews i
      JOIN role_interview_levels rl ON i.level_id = rl.id
      WHERE i.status = 'Passed' 
        AND DATE(i.interview_date) = CURDATE() - INTERVAL 1 DAY
    `);

    for (const interview of passedYesterday) {
      // 2️⃣ Get next level
      const [nextLevel] = await pool.query(`
        SELECT id, level_name, step_order
        FROM role_interview_levels
        WHERE step_order > ? 
          AND role_id = (SELECT role_id FROM role_interview_levels WHERE id = ?)
        ORDER BY step_order ASC
        LIMIT 1
      `, [interview.step_order, interview.level_id]);

      if (nextLevel.length === 0) continue; // all rounds done

      const nextLevelId = nextLevel[0].id;
      const nextLevelName = nextLevel[0].level_name;

      // 3️⃣ Avoid duplicate scheduling
      const [alreadyScheduled] = await pool.query(
        `SELECT 1 FROM interviews WHERE candidate_id=? AND level_id=? AND status='Scheduled'`,
        [interview.candidate_id, nextLevelId]
      );
      if (alreadyScheduled.length > 0) {
        console.log(`Skipping candidate ${interview.candidate_id}, already scheduled.`);
        continue;
      }

      // 4️⃣ Schedule interview
      const interviewDateObj = await getRandomInterviewTime(pool);

      // Convert to MySQL DATETIME string (local)
      const localDate = new Date(interviewDateObj.getTime() - (interviewDateObj.getTimezoneOffset() * 60000));
      const interviewDate = localDate.toISOString().slice(0, 19).replace('T', ' ');

      await pool.query(`
        INSERT INTO interviews (candidate_id, level_id, interview_date, status)
        VALUES (?, ?, ?, 'Scheduled')
      `, [interview.candidate_id, nextLevelId, interviewDate]);

      // 5️⃣ Send email
      const [candidate] = await pool.query(`
        SELECT email, first_name
        FROM external_candidates
        WHERE id = ?
      `, [interview.candidate_id]);

      if (candidate.length > 0) {
        const message = `
Hello ${candidate[0].first_name},

Your next interview has been scheduled.

Date & Time: ${interviewDate}
Round: ${nextLevelName}

Please be prepared.

Best regards,
Recruitment Team
        `;
        await sendShortlistMail(candidate[0].email, null, message);
      }

      console.log(`📧 Candidate ${interview.candidate_id} scheduled for ${nextLevelName} on ${interviewDate}`);
    }

    console.log("✅ Auto-scheduling job completed.");
  } catch (err) {
    console.error("❌ Error in auto-scheduler:", err);
  }
});
