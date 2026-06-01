// ================================================================
// routes/complaintManager.js
// ================================================================
import express from "express";
import db from "../db.js";

const router = express.Router();

// ── GET all complaints ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, e.first_name, e.last_name, e.employee_code, e.department
      FROM complaints c
      JOIN employees e ON e.id = c.employee_id
      ORDER BY c.filed_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ── STATS ─────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [complaints] = await db.query("SELECT * FROM complaints"); // fetch all complaints

    const summary = {
      total: complaints.length,
      open_count: complaints.filter(c => c.status === 'Open').length,
      under_review: complaints.filter(c => c.status === 'Under Review').length,
      resolved: complaints.filter(c => c.status === 'Resolved').length,
      critical: complaints.filter(c => c.priority === 'Critical').length,
    };

    const byCategory = Object.values(
      complaints.reduce((acc, c) => {
        if (!acc[c.category]) acc[c.category] = { category: c.category, total: 0 };
        acc[c.category].total++;
        return acc;
      }, {})
    );

    const byPriority = Object.values(
      complaints.reduce((acc, c) => {
        if (!acc[c.priority]) acc[c.priority] = { priority: c.priority, total: 0 };
        acc[c.priority].total++;
        return acc;
      }, {})
    );

    res.json({ summary, byCategory, byPriority });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// ── GET single complaint ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [[row]] = await db.query(`
      SELECT c.*, e.first_name, e.last_name
      FROM complaints c
      JOIN employees e ON e.id = c.employee_id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── FILE new complaint ────────────────────────────────────────
router.post("/", async (req, res) => {
  const { employee_id, subject, description, category, priority } = req.body;

  try {
    const [[emp]] = await db.query("SELECT * FROM employees WHERE id=?", [employee_id]);
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const [result] = await db.query(
      `INSERT INTO complaints (employee_id, employee_code, employee_name, department, subject, description, category, priority)
       VALUES (?,?,?,?,?,?,?,?)`,
      [emp.id, emp.employee_code, `${emp.first_name} ${emp.last_name}`, emp.department, subject, description, category, priority]
    );

    res.json({ id: result.insertId, message: "Complaint filed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE complaint (status / assign / resolve) ──────────────
router.put("/:id", async (req, res) => {
  const { status, assigned_to, resolution_note } = req.body;

  try {
    await db.query(
      "UPDATE complaints SET status=?, assigned_to=?, resolution_note=?, updated_at=NOW() WHERE id=?",
      [status, assigned_to, resolution_note, req.params.id]
    );
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



export default router;

// ================================================================
// In server.js / app.js register it like:
// import complaintRoutes from "./routes/complaintManager.js";
// app.use("/api/complaints", complaintRoutes);