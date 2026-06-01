import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM admin_notifications ORDER BY created_at DESC"
    );
    res.json(rows);   // 👈 returns ARRAY
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch admin notifications" });
  }
});

router.get("/", async (req, res) => {
  console.log("✅ ADMIN NOTIFICATIONS API HIT");
  try {
    const [rows] = await pool.query(
      "SELECT * FROM notifications ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch admin notifications" });
  }
});

router.post("/:id/read", async (req, res) => {
  await pool.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = ?",
    [req.params.id]
  );
  res.json({ success: true });
});

export default router;
