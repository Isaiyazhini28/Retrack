// ================================================================
// sidebar_routes.js — Express routes for all sidebar modules
// Paste and register in server.js:
//   import { calRouter } from './routes/sidebar_routes.js';
//   import { attRouter } from './routes/sidebar_routes.js';
//   import { boardRouter } from './routes/sidebar_routes.js';
//   import { settingsRouter } from './routes/sidebar_routes.js';
// ================================================================

import express from "express";
import db from "../db.js"; // mysql2/promise pool

// ================================================================
// CALENDAR ROUTES
// ================================================================
const calRouter = express.Router();

calRouter.get("/events", async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = "SELECT * FROM calendar_events";
    let params = [];
    if (start && end) {
      query += " WHERE start_date BETWEEN ? AND ?";
      params = [start, end];
    }
    query += " ORDER BY start_date, start_time";
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

calRouter.get("/upcoming", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM calendar_events WHERE start_date >= CURDATE() ORDER BY start_date LIMIT 10"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

calRouter.post("/events", async (req, res) => {
  const { employee_id, title, description, event_type, start_date, end_date, start_time, end_time, all_day, color, created_by } = req.body;
  try {
    const [r] = await db.query(
      `INSERT INTO calendar_events 
        (employee_id, title, description, event_type, start_date, end_date, start_time, end_time, all_day, color, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [employee_id || null, title, description || "", event_type || "Other", start_date, end_date || null, start_time || null, end_time || null, all_day ? 1 : 0, color || "#38BDF8", created_by || null]
    );
    res.json({ id: r.insertId, message: "Event created" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

calRouter.put("/events/:id", async (req, res) => {
  const { title, description, event_type, start_date, end_date, start_time, end_time, all_day, color } = req.body;
  try {
    await db.query(
      `UPDATE calendar_events 
       SET title=?, description=?, event_type=?, start_date=?, end_date=?, start_time=?, end_time=?, all_day=?, color=? 
       WHERE id=?`,
      [title, description, event_type, start_date, end_date || null, start_time || null, end_time || null, all_day ? 1 : 0, color, req.params.id]
    );
    res.json({ message: "Updated" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

calRouter.delete("/events/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM calendar_events WHERE id=?", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ================================================================
// ATTENDANCE ROUTES
// ================================================================
const attRouter = express.Router();

attRouter.get("/", async (req, res) => {
  try {
    const { start, end, employee_id } = req.query;
    let sql = `SELECT a.*, e.first_name, e.last_name, e.employee_code, e.department 
               FROM attendance_records a 
               JOIN employees e ON e.id = a.employee_id 
               WHERE 1=1`;
    const params = [];
    if (start && end) { sql += " AND a.date BETWEEN ? AND ?"; params.push(start, end); }
    if (employee_id)  { sql += " AND a.employee_id = ?"; params.push(employee_id); }
    sql += " ORDER BY a.date DESC, e.first_name";
    
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET KPI Summary for today
attRouter.get("/today-summary", async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT COUNT(*) AS total,
        SUM(status='Present') AS present,
        SUM(status='Absent') AS absent,
        SUM(status='Late') AS late,
        SUM(status='Work From Home') AS wfh,
        SUM(status='On Leave') AS on_leave
      FROM attendance_records WHERE date = CURDATE()
    `);
    res.json(summary || {total:0, present:0, absent:0, late:0, wfh:0, on_leave:0});
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET Monthly percentage summary
attRouter.get("/monthly-summary", async (req, res) => {
  try {
    const { year, month } = req.query;
    const start = `${year}-${month}-01`;
    const end   = `${year}-${month}-31`;
    const [rows] = await db.query(`
      SELECT e.id, e.first_name, e.last_name, e.department,
        COUNT(a.id) AS total_days,
        SUM(a.status IN ('Present','Work From Home','Half Day')) AS attended,
        ROUND(SUM(a.status IN ('Present','Work From Home','Half Day')) / NULLIF(COUNT(a.id),0) * 100, 1) AS pct
      FROM employees e
      LEFT JOIN attendance_records a ON a.employee_id=e.id AND a.date BETWEEN ? AND ?
      WHERE e.status='Active'
      GROUP BY e.id ORDER BY e.first_name
    `, [start, end]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Bulk Insert Route (Called by "Mark All Present" button)
attRouter.post("/bulk-mark", async (req, res) => {
  const { records } = req.body;
  try {
    for (const r of records) {
      const [[emp]] = await db.query("SELECT employee_code FROM employees WHERE id=?", [r.employee_id]);
      await db.query(
        `INSERT INTO attendance_records 
          (employee_id, employee_code, date, status, work_hours, marked_by)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), work_hours=VALUES(work_hours)`,
        [r.employee_id, emp?.employee_code||"", r.date, r.status||"Present", r.work_hours||8, null]
      );
    }
    res.json({ message: `${records.length} records marked` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ================================================================
// DISPLAY BOARD ROUTES
// ================================================================
const boardRouter = express.Router();

boardRouter.get("/announcements", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM announcements 
       WHERE active=1 AND (end_date IS NULL OR end_date >= CURDATE()) 
       ORDER BY pinned DESC, priority DESC, created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

boardRouter.post("/announcements", async (req, res) => {
  const { title, content, category, priority, pinned, posted_by, posted_by_name, start_date, end_date } = req.body;
  try {
    const [r] = await db.query(
      `INSERT INTO announcements 
        (title, content, category, priority, pinned, posted_by, posted_by_name, start_date, end_date)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [title, content, category||"General", priority||"Normal", pinned?1:0, posted_by||null, posted_by_name||"", start_date||null, end_date||null]
    );
    res.json({ id: r.insertId, message: "Posted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

boardRouter.put("/announcements/:id", async (req, res) => {
  const { title, content, category, priority, pinned, active, end_date } = req.body;
  try {
    await db.query(
      `UPDATE announcements 
       SET title=?, content=?, category=?, priority=?, pinned=?, active=?, end_date=? 
       WHERE id=?`,
      [title, content, category, priority, pinned?1:0, active?1:0, end_date||null, req.params.id]
    );
    res.json({ message: "Updated" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

boardRouter.delete("/announcements/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM announcements WHERE id=?", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ================================================================
// SETTINGS ROUTES
// ================================================================
const settingsRouter = express.Router();

settingsRouter.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM system_settings ORDER BY group_name, setting_key");
    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.group_name]) grouped[r.group_name] = [];
      grouped[r.group_name].push(r);
    });
    res.json({ flat: rows, grouped });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

settingsRouter.put("/", async (req, res) => {
  const { updates, updated_by } = req.body;
  try {
    for (const u of updates) {
      await db.query(
        "UPDATE system_settings SET setting_val=?, updated_by=?, updated_at=NOW() WHERE id=?",
        [u.setting_val, updated_by||null, u.id]
      );
    }
    res.json({ message: `${updates.length} settings saved` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

settingsRouter.put("/:key", async (req, res) => {
  const { setting_val, updated_by } = req.body;
  try {
    await db.query(
      "UPDATE system_settings SET setting_val=?, updated_by=? WHERE setting_key=?",
      [setting_val, updated_by||null, req.params.key]
    );
    res.json({ message: "Setting updated" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ================================================================
// EXPORT ROUTERS
// ================================================================
export { calRouter, attRouter, boardRouter, settingsRouter };