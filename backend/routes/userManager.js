// employees.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// ── GET all employees with skills, background verification, and today's availability ──
router.get("/employees", async (req, res) => {
  try {
    const [employees] = await db.query(`
  SELECT 
    e.id, e.first_name, e.last_name, e.email, e.department, e.salary,
    e.status, e.contract_type, e.employee_code, e.date_of_joining, e.created_at,
    COUNT(DISTINCT es.id) AS skill_count,
    MAX(bv.background_check_status) AS background_verification_status,
    CASE 
      WHEN MAX(CASE 
                 WHEN lr.start_date <= CURDATE() 
                      AND lr.end_date >= CURDATE() 
                      AND lr.status='Approved' 
                 THEN 1 ELSE 0 END
              ) = 1 THEN 'On Leave'
      ELSE 'Available'
    END AS availability_today
  FROM employees e
  LEFT JOIN employee_skills es ON es.employee_id = e.id
  LEFT JOIN background_verifications bv ON bv.email = e.email
  LEFT JOIN leave_requests lr ON lr.employee_id = e.id
  GROUP BY e.id
  ORDER BY e.created_at DESC
`);

    // Fetch skills for all employees
    const employeeIds = employees.map(emp => emp.id);
    let skillsMap = {};
    if (employeeIds.length) {
      const [skills] = await db.query(`
        SELECT es.id, es.employee_id, s.name AS skill_name, es.proficiency AS level
        FROM employee_skills es
        JOIN skills s ON s.id=es.skill_id
        WHERE es.employee_id IN (?)
      `, [employeeIds]);
      skills.forEach(s => {
        if (!skillsMap[s.employee_id]) skillsMap[s.employee_id] = [];
        skillsMap[s.employee_id].push(s);
      });
    }

    const result = employees.map(emp => ({ ...emp, skills: skillsMap[emp.id] || [] }));
    res.json(result);
  } catch (err) {
    console.error(err); // <-- log actual error for debugging
    res.status(500).json({ message: err.message });
  }
});

// ── GET employee by ID ──
router.get("/employees/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM employees WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Employee not found" });
    const emp = rows[0];

    const [skills] = await db.query(`
      SELECT es.id, s.name AS skill_name, es.proficiency AS level
      FROM employee_skills es
      JOIN skills s ON s.id = es.skill_id
      WHERE es.employee_id=?
    `, [emp.id]);

    res.json({ ...emp, skills });
  } catch (err) {
    console.error("GET /employees/:id error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET employee stats ──
router.get("/employees-stats", async (req, res) => {
  try {
    const [byDept] = await db.query(`
      SELECT department, COUNT(*) AS count
      FROM employees
      GROUP BY department
    `);

    const [byContract] = await db.query(`
      SELECT contract_type, COUNT(*) AS count
      FROM employees
      GROUP BY contract_type
    `);

    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status='Active') AS active,
        SUM(status='offboarding') AS offboarding,
        SUM(status='offboarded') AS offboarded
      FROM employees
    `);

    res.json({
      summary: summaryRows[0] || {},
      byDept,
      byContract
    });
  } catch (err) {
    console.error("GET /employees-stats error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── ADD skill ──
router.post("/employees/:id/skills", async (req, res) => {
  try {
    const { skill_name, level } = req.body;
    if (!skill_name) return res.status(400).json({ message: "Skill required" });

    // Find or create skill
    const [skillRows] = await db.query("SELECT id FROM skills WHERE name=?", [skill_name]);
    let skillId;
    if (skillRows.length) skillId = skillRows[0].id;
    else {
      const [insertSkill] = await db.query("INSERT INTO skills (name) VALUES (?)", [skill_name]);
      skillId = insertSkill.insertId;
    }

    const [insert] = await db.query(`
      INSERT INTO employee_skills (employee_id, skill_id, proficiency) VALUES (?,?,?)
    `, [req.params.id, skillId, level]);

    res.json({ id: insert.insertId, skill_name, level });
  } catch (err) {
    console.error("POST /employees/:id/skills error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── REMOVE skill ──
router.delete("/employees/:id/skills/:skillId", async (req, res) => {
  try {
    await db.query("DELETE FROM employee_skills WHERE id=? AND employee_id=?", [req.params.skillId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /employees/:id/skills/:skillId error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── EDIT employee ──
router.put("/employees/:id", async (req, res) => {
  try {
    const { salary, status, department, contract_type } = req.body;
    await db.query(`
      UPDATE employees SET salary=?, status=?, department=?, contract_type=? WHERE id=?
    `, [salary, status, department, contract_type, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /employees/:id error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;