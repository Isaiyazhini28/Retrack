import cron from "node-cron";
import pool from "../db.js";
import { sendInterviewReminderMail, createInAppNotification } from "../services/notify.js";

// 🔹 Run every 15 minutes
cron.schedule("0 * * * *", async () => {
  try {
    const now = new Date();

    // Get all scheduled interviews in next 24 hours that haven't received 24h or 2h reminders
    const [interviews] = await pool.query(
      `SELECT i.id AS interview_id,
              i.candidate_id,
              i.interview_date,
              i.reminder_24h_sent,
              i.reminder_2h_sent,
              ec.first_name,
              ec.email
       FROM interviews i
       JOIN external_candidates ec ON i.candidate_id = ec.id
       WHERE i.status = 'Scheduled'
         AND i.interview_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)`
    );

    for (const interview of interviews) {
      const interviewDate = new Date(interview.interview_date);
      const diffMs = interviewDate - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      let reminderType = null;

      if (diffHours <= 24 && diffHours > 23.75 && !interview.reminder_24h_sent) {
        reminderType = "24h";
      } else if (diffHours <= 2 && diffHours > 1.75 && !interview.reminder_2h_sent) {
        reminderType = "2h";
      }

      if (!reminderType) continue;

      const beforeText = reminderType === "24h" ? "in 24 hours" : "in 2 hours";

      // Send Email
      await sendInterviewReminderMail(
        interview.email,
        interview.first_name,
        interview.interview_date
      );

      // Create in-app notification
      await createInAppNotification(
        interview.candidate_id,
        "Interview Reminder",
        `Your interview is scheduled ${beforeText} on ${interviewDate.toLocaleString()}`
      );

      // Update reminder flag
      if (reminderType === "24h") {
        await pool.query(`UPDATE interviews SET reminder_24h_sent = 1 WHERE id = ?`, [interview.interview_id]);
      } else if (reminderType === "2h") {
        await pool.query(`UPDATE interviews SET reminder_2h_sent = 1 WHERE id = ?`, [interview.interview_id]);
      }

      console.log(`✅ ${reminderType} reminder sent for candidate ${interview.candidate_id}`);
    }
  } catch (err) {
    console.error("❌ Error in interview reminder cron:", err);
  }
});

console.log("🕒 Interview reminder cron job started with duplicate prevention.");
