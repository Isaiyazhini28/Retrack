// routes/tasksRoutes.js
import express from "express";
import db from "../db.js";

const router = express.Router();

/* ================================
   GET ALL TASKS
================================ */
router.get("/all", async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT t.*, e.first_name AS assigned_name
      FROM tasks t
      LEFT JOIN employees e ON t.assigned_to = e.id
    `);
    res.json(tasks);
  } catch (err) {
    console.error("❌ Failed to fetch tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/* ================================
   UPDATE TASK STATUS
================================ */
router.post("/update-status", async (req, res) => {
  try {
    const { taskId, status } = req.body;

    if (!taskId || !status) {
      return res.status(400).json({ error: "taskId and status are required" });
    }

    await db.query(
      "UPDATE tasks SET status = ? WHERE id = ?",
      [status, taskId]
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("❌ Failed to update task status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;