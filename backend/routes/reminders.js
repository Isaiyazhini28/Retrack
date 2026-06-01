import express from "express";
import pool from "../db.js";

const router = express.Router();

// Core reminder logic function
const checkReminders = async () => {
  const [rows] = await pool.query(`
    SELECT i.id, i.interview_date,
           c.first_name, c.last_name
    FROM interviews i
    JOIN external_candidates c ON c.id = i.candidate_id
    WHERE i.interview_date IS NOT NULL
  `);

  for (const i of rows) {
    const diffMs = new Date(i.interview_date) - new Date();
    const diffHours = diffMs / (1000 * 60 * 60);

    // 24H reminder
    if (diffHours <= 24 && diffHours > 23) {
      const [r] = await pool.query(
        `SELECT reminder_24h_sent FROM interviews WHERE id = ?`,
        [i.id]
      );

      if (!r[0].reminder_24h_sent) {
        await pool.query(
          `INSERT INTO notifications (title, message)
           VALUES (?, ?)`,
          [
            "Interview Reminder (24h)",
            `${i.first_name} ${i.last_name} interview in 24 hours`,
          ]
        );
        await pool.query(
          `UPDATE interviews SET reminder_24h_sent = TRUE WHERE id = ?`,
          [i.id]
        );
      }
    }

    // 1H reminder
    if (diffHours <= 1 && diffHours > 0.9) {
      const [r] = await pool.query(
        `SELECT reminder_1h_sent FROM interviews WHERE id = ?`,
        [i.id]
      );

      if (!r[0].reminder_1h_sent) {
        await pool.query(
          `INSERT INTO notifications (title, message)
           VALUES (?, ?)`,
          [
            "Interview Reminder (1h)",
            `${i.first_name} ${i.last_name} interview in 1 hour`,
          ]
        );
        await pool.query(
          `UPDATE interviews SET reminder_1h_sent = TRUE WHERE id = ?`,
          [i.id]
        );
      }
    }
  }
};

// POST route for real reminder checks (used by frontend or cron)
router.post("/check", async (req, res) => {
  try {
    await checkReminders();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Reminder check failed" });
  }
});

// Optional GET route for testing in browser
router.get("/check", async (req, res) => {
  res.json({ message: "Reminder route exists. Use POST to trigger reminders." });
});

export default router;
