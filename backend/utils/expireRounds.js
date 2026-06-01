import pool from "../db.js";

export const expireRounds = async () => {
  try {
    // Expire Aptitude
    await pool.query(`
      UPDATE external_candidates
      SET aptitude_status='expired'
      WHERE aptitude_expiry < NOW()
      AND aptitude_status='sent'
    `);

    // Expire Technical
    await pool.query(`
      UPDATE interviews
      SET test_status='expired',
          status='Failed'
      WHERE interview_expiry < NOW()
      AND test_status='pending'
    `);

    console.log("✅ Expire check completed");
  } catch (err) {
    console.error("❌ Expire Error:", err.message);
  }
};
