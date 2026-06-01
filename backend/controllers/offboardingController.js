// backend/controllers/OffboardingController.js
import * as OffboardingService from "../services/offboardingService.js";
import pool from "..//db.js";

export const triggerOffboarding = async (req, res) => {
  try {
    const { employeeId, lastDay, successorEmail } = req.body;
    const result = await OffboardingService.triggerOffboarding(
      employeeId,
      lastDay,
      successorEmail
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getOffboardingStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const status = await OffboardingService.getOffboardingStatus(employeeId);
    res.json(status);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const tasks = await OffboardingService.getAllTasks();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getAllSurveys = async (req, res) => {
  try {
    const surveys = await OffboardingService.getAllSurveys();
    res.json(surveys);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
export const getOffboardingStats = async (req, res) => {
  try {
    const stats = await OffboardingService.getOffboardingStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
export const importTasksFromExcel = async (req, res) => {
  const rows = req.body;

  try {
    let inserted = 0;
    let updated = 0;

    for (const row of rows) {
      let dueDate = row.DueDate
        ? new Date(row.DueDate).toISOString().split("T")[0]
        : null;

      // Skip invalid rows
      if (!row.employee_id || !row.task_name || !row.assigned_to) {
        console.warn("Skipping invalid row:", row);
        continue;
      }

      const [result] = await pool.query(
        `INSERT INTO offboarding_tasks
          (employee_id, task_name, assigned_to, due_date, status)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           due_date = VALUES(due_date),
           task_name = VALUES(task_name),
           assigned_to = VALUES(assigned_to)`,
        [
          row.employee_id,
          row.task_name,
          row.assigned_to,
          dueDate,
          row.status || "pending",
        ]
      );

      if (result.affectedRows === 1) {
  inserted++;
} else if (result.affectedRows === 2) {
  updated++;
}
    }

    res.json({
      message: "Tasks imported/updated successfully",
      inserted,
      updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Excel import failed" });
  }
};
export const importSurveyExcel = async (req, res) => {
  try {
    const rows = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No data received from Excel" });
    }

    let updated = 0;
    let inserted = 0;

    for (const row of rows) {
      const employeeId = row.ID || row.id;
      const status = (row.Status || row.status || "").toLowerCase();
      // Use actual survey link from Excel if provided, fallback to your Google Form link
      const surveyLink = row.SurveyLink || row.survey_link || "https://docs.google.com/forms/d/e/1FAIpQLSeTxppiTROMmKOXoizwzcJh6ax_f2sGZx0d0vQ6LBmLtCxlGA/viewform?usp=header";

      if (!employeeId || !status) continue; // skip invalid row

      // Check if survey already exists for this employee
      const [existing] = await pool.query(
        `SELECT id FROM exit_surveys WHERE employee_id = ?`,
        [employeeId]
      );

      if (existing.length > 0) {
        // Update existing
        await pool.query(
          `UPDATE exit_surveys SET status = ?, survey_link = ? WHERE employee_id = ?`,
          [status, surveyLink, employeeId]
        );
        updated++;
      } else {
        // Insert new
        await pool.query(
          `INSERT INTO exit_surveys (employee_id, survey_link, status) VALUES (?, ?, ?)`,
          [employeeId, surveyLink, status]
        );
        inserted++;
      }
    }

    res.json({ message: "Survey Excel processed", updated, inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Survey Excel import failed" });
  }
};
// ── Get all offboarding/offboarded employees with release date ──
export const getOffboardingEmployees = async (req, res) => {
  try {
    const [employees] = await pool.query(`
      SELECT 
        e.id, e.first_name, e.last_name, e.email, e.department, e.salary,
        e.status, e.contract_type, e.employee_code, e.date_of_joining, e.created_at,
        lr.end_date AS release_date,
        COUNT(DISTINCT es.id) AS skill_count
      FROM employees e
      LEFT JOIN employee_skills es ON es.employee_id = e.id
      LEFT JOIN leave_requests lr ON lr.employee_id = e.id
      WHERE e.status IN ('offboarding', 'offboarded')
      GROUP BY e.id
      ORDER BY lr.end_date ASC, e.created_at DESC
    `);

    res.json(employees);
  } catch (err) {
    console.error("GET /offboarding/employees error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
// backend/controllers/OffboardingController.js
export const getOffboardedEmployees = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id, employee_code, first_name, last_name, email, status, last_day AS release_date,
        contract_type, department, salary, date_of_joining, created_at, updated_at
      FROM employees
      WHERE status = 'offboarded'
      ORDER BY last_day DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /offboarding/employees/list error:", err);
    res.status(500).json({ error: "Failed to fetch offboarded employees" });
  }
};