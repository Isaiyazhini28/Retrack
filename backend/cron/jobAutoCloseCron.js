import pool from "../db.js";

export async function autoCloseJobs() {
  try {
    // Close jobs where closing_date < today and status != 'closed'
    const [jobs] = await pool.query(
      `UPDATE jobs
       SET status = 'closed'
       WHERE closing_date < NOW() AND status != 'closed'`
    );

    console.log(`✅ Auto-closed ${jobs.affectedRows} jobs`);
  } catch (err) {
    console.error("❌ Error auto-closing jobs:", err);
  }
}
