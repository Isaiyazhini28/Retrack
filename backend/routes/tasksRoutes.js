// routes/taskRoutes.js
import express from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import db from "../db.js";
import {
  runFullAutomation,
  progressTaskStatus,
  rebalanceAfterUpdate,
} from "../services/fullAutomationService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ════════════════════════════════════════════
   INTERNAL: parse Excel rows → task objects
   Handles any column name variant
════════════════════════════════════════════ */
function parseExcelRows(rows) {
  const norm = (k) => String(k).toLowerCase().trim().replace(/\s+/g, "_");
  return rows
    .map((row) => {
      const r = {};
      for (const [k, v] of Object.entries(row)) r[norm(k)] = v;
      const task_name      = String(r.task_name || r.name || r.task || r.title || r["task_name"] || "").trim();
      const skill_required = String(r.skill_required || r.skill || r.skills || r.skill_set || "General").trim();
      const description    = String(r.description || r.desc || r.details || "").trim();
      if (!task_name) return null;
      return { task_name, skill_required, description };
    })
    .filter(Boolean);
}

/* ════════════════════════════════════════════
   GET ALL TASKS (with AI risk + sprint info)
════════════════════════════════════════════ */
router.get("/all", async (req, res) => {
  try {
    const { project_id } = req.query;
    const [tasks] = await db.query(
      `SELECT
         t.id, t.project_id, t.task_name, t.description,
         t.priority, t.skill_required, t.assigned_to,
         t.estimated_hours, t.story_points, t.status,
         t.start_date, t.due_date, t.created_at,
         e.first_name                      AS assigned_name,
         ai.risk_level,
         ai.predicted_delay_days,
         ai.confidence_score,
         s.sprint_name,
         s.start_date                      AS sprint_start,
         s.end_date                        AS sprint_end
       FROM tasks t
       LEFT JOIN employees e       ON t.assigned_to = e.id
       LEFT JOIN ai_predictions ai ON ai.task_id    = t.id
       LEFT JOIN sprint_tasks   st ON st.task_id    = t.id
       LEFT JOIN sprints        s  ON s.id          = st.sprint_id
       ${project_id ? "WHERE t.project_id = ?" : ""}
       ORDER BY FIELD(t.priority,'Critical','High','Medium','Low'), t.due_date ASC`,
      project_id ? [project_id] : []
    );
    res.json(tasks);
  } catch (err) {
    console.error("❌ GET /tasks/all:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/* ════════════════════════════════════════════
   GET SPRINTS WITH TASKS
   Falls back to assigning tasks by date range
   if sprint_tasks join table is empty
════════════════════════════════════════════ */
router.get("/sprints/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // 1. Get all sprints for this project
    const [sprints] = await db.query(
      `SELECT * FROM sprints WHERE project_id = ? ORDER BY start_date ASC`,
      [projectId]
    );
    if (!sprints.length) return res.json([]);

    // 2. Get all tasks for this project with employee + risk info
    const [allTasks] = await db.query(
      `SELECT t.*,
              e.first_name                    AS assigned_name,
              ai.risk_level,
              ai.predicted_delay_days,
              ai.confidence_score
       FROM tasks t
       LEFT JOIN employees e       ON e.id          = t.assigned_to
       LEFT JOIN ai_predictions ai ON ai.task_id    = t.id
       WHERE t.project_id = ?
       ORDER BY FIELD(t.priority,'Critical','High','Medium','Low')`,
      [projectId]
    );

    // 3. Check if sprint_tasks is populated
    const [stRows] = await db.query(
      `SELECT st.task_id, st.sprint_id
       FROM sprint_tasks st
       JOIN sprints s ON s.id = st.sprint_id
       WHERE s.project_id = ?`,
      [projectId]
    );

    let taskToSprintMap = {};

    if (stRows.length > 0) {
      // sprint_tasks is populated — use it directly
      stRows.forEach((r) => {
        taskToSprintMap[Number(r.task_id)] = Number(r.sprint_id);
      });
    } else {
      // FALLBACK: assign tasks to sprints by task start_date / due_date range
      // If tasks have no dates, distribute evenly by index
      const SPRINT_CAPACITY = 80; // hours
      let sIdx = 0;
      let sprintHours = 0;

      for (const task of allTasks) {
        // Try date-based assignment first
        if (task.start_date && sprints.length > 0) {
          const taskStart = new Date(task.start_date);
          const matched = sprints.find((sp) => {
            const s = new Date(sp.start_date);
            const e = new Date(sp.end_date);
            return taskStart >= s && taskStart <= e;
          });
          if (matched) {
            taskToSprintMap[Number(task.id)] = Number(matched.id);
            continue;
          }
        }

        // Capacity-based round-robin fallback
        if (sprintHours + (task.estimated_hours || 0) > SPRINT_CAPACITY) {
          sIdx = Math.min(sIdx + 1, sprints.length - 1);
          sprintHours = 0;
        }
        taskToSprintMap[Number(task.id)] = Number(sprints[sIdx].id);
        sprintHours += task.estimated_hours || 0;
      }

      // Persist the mapping so next call uses sprint_tasks
      if (allTasks.length > 0) {
        const insertVals = Object.entries(taskToSprintMap).map(
          ([tid, sid]) => [sid, tid]
        );
        await db.query(
          `INSERT IGNORE INTO sprint_tasks (sprint_id, task_id) VALUES ?`,
          [insertVals]
        ).catch(() => {}); // ignore if table constraint fails
      }
    }

    // 4. Build result: sprints with nested tasks + computed stats
    const result = sprints.map((sp) => {
      const spTasks = allTasks.filter(
        (t) => taskToSprintMap[Number(t.id)] === Number(sp.id)
      );
      const total_tasks  = spTasks.length;
      const total_hours  = spTasks.reduce((s, t) => s + (Number(t.estimated_hours) || 0), 0);
      const done_tasks   = spTasks.filter((t) => t.status === "Done").length;
      return { ...sp, total_tasks, total_hours, done_tasks, tasks: spTasks };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ GET /tasks/sprints:", err);
    res.status(500).json({ error: "Failed to fetch sprints" });
  }
});

/* ════════════════════════════════════════════
   GET WORKLOAD PER EMPLOYEE
   Works even if assigned_to is NULL — shows unassigned bucket
════════════════════════════════════════════ */
router.get("/workload/:projectId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         COALESCE(e.id, 0)                                          AS id,
         COALESCE(e.first_name, 'Unassigned')                       AS first_name,
         COUNT(t.id)                                                AS total_tasks,
         COALESCE(SUM(t.estimated_hours), 0)                        AS total_hours,
         SUM(CASE WHEN t.status = 'Done'        THEN 1 ELSE 0 END) AS done,
         SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
         SUM(CASE WHEN t.status = 'Todo'        THEN 1 ELSE 0 END) AS todo,
         SUM(CASE WHEN t.status = 'Backlog'     THEN 1 ELSE 0 END) AS backlog
       FROM tasks t
       LEFT JOIN employees e ON e.id = t.assigned_to
       WHERE t.project_id = ?
       GROUP BY e.id, e.first_name
       ORDER BY total_tasks DESC`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /tasks/workload:", err);
    res.status(500).json({ error: "Failed to fetch workload" });
  }
});

/* ════════════════════════════════════════════
   GET AI RISK
   Auto-generates predictions if ai_predictions
   table is empty for this project's tasks
════════════════════════════════════════════ */
router.get("/ai-risk/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if predictions exist
    const [[{ cnt }]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM ai_predictions ai
       JOIN tasks t ON t.id = ai.task_id
       WHERE t.project_id = ?`,
      [projectId]
    );

    // Auto-generate if missing
    if (Number(cnt) === 0) {
      const [tasks] = await db.query(
        `SELECT t.id, t.priority, t.estimated_hours, t.assigned_to,
                COALESCE(
                  (SELECT SUM(t2.estimated_hours) FROM tasks t2
                   WHERE t2.assigned_to = t.assigned_to
                     AND t2.id != t.id AND t2.status != 'Done'
                     AND t2.project_id = t.project_id), 0
                ) AS assignee_load
         FROM tasks t WHERE t.project_id = ?`,
        [projectId]
      );

      for (const t of tasks) {
        let score = 0;
        score += ({ Low:5, Medium:15, High:28, Critical:40 }[t.priority] || 15);
        if (t.estimated_hours > 120)     score += 25;
        else if (t.estimated_hours > 80) score += 15;
        else if (t.estimated_hours > 40) score += 8;
        if (t.assignee_load > 200)       score += 25;
        else if (t.assignee_load > 160)  score += 15;
        else if (t.assignee_load > 120)  score += 8;
        score += Math.floor(Math.random() * 10) - 5;
        score = Math.max(0, Math.min(100, score));

        const risk_level = score >= 65 ? "High" : score >= 35 ? "Medium" : "Low";
        const predicted_delay_days =
          risk_level === "High"   ? 5  + Math.floor(Math.random() * 6) :
          risk_level === "Medium" ? 2  + Math.floor(Math.random() * 4) :
                                    Math.floor(Math.random() * 2);
        const confidence_score = parseFloat((0.68 + (score / 100) * 0.29).toFixed(2));

        await db.query(
          `INSERT IGNORE INTO ai_predictions
             (task_id, risk_level, predicted_delay_days, confidence_score)
           VALUES (?, ?, ?, ?)`,
          [t.id, risk_level, predicted_delay_days, confidence_score]
        );
      }
      console.log(`🤖 Auto-generated AI risk for ${tasks.length} tasks in project ${projectId}`);
    }

    const [rows] = await db.query(
      `SELECT
         t.id, t.task_name, t.priority, t.status,
         t.assigned_to, e.first_name AS assigned_name,
         ai.risk_level, ai.predicted_delay_days, ai.confidence_score,
         t.due_date
       FROM tasks t
       JOIN ai_predictions ai ON ai.task_id = t.id
       LEFT JOIN employees e  ON e.id       = t.assigned_to
       WHERE t.project_id = ?
       ORDER BY FIELD(ai.risk_level,'High','Medium','Low'),
                ai.predicted_delay_days DESC`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /tasks/ai-risk:", err);
    res.status(500).json({ error: "Failed to fetch AI risk" });
  }
});

/* ════════════════════════════════════════════
   UPDATE TASK STATUS (with auto-progression)
════════════════════════════════════════════ */
router.post("/update-status", async (req, res) => {
  try {
    const { taskId, status, employeeId } = req.body;
    if (!taskId || !status)
      return res.status(400).json({ error: "taskId and status are required" });

    if (employeeId) {
      const result = await progressTaskStatus(taskId, employeeId);
      return res.json(result);
    }
    await db.query("UPDATE tasks SET status = ? WHERE id = ?", [status, taskId]);
    res.json({ message: "Status updated", nextStatus: status });
  } catch (err) {
    console.error("❌ POST /tasks/update-status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

/* ════════════════════════════════════════════
   EXCEL UPLOAD → FULL AUTOMATION PIPELINE
   Robust multi-sheet parser with debug logging
════════════════════════════════════════════ */
router.post("/upload-excel", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No file uploaded" });

    const ext = req.file.originalname.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext))
      return res.status(400).json({ error: "Only .xlsx / .xls / .csv files supported" });

    console.log(`📁 Uploaded: ${req.file.originalname} (${req.file.size} bytes)`);

    // Read workbook from buffer — try multiple type options for robustness
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, {
        type: "buffer",
        cellDates: true,
        cellNF: false,
        raw: false,
        dense: false,
      });
    } catch (parseErr) {
      // Fallback: try array type
      workbook = XLSX.read(new Uint8Array(req.file.buffer), { type: "array", cellDates: true });
    }

    console.log(`📊 Sheets: ${workbook.SheetNames.join(", ")}`);

    // Scan all sheets, pick first with data
    let rawRows = [];
    let usedSheet = "";
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet || !sheet["!ref"]) {
        console.log(`  Sheet "${name}": empty (no ref)`);
        continue;
      }
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        blankrows: false,
        raw: false,
      });
      console.log(`  Sheet "${name}": ${rows.length} rows, keys: ${rows[0] ? Object.keys(rows[0]).join(", ") : "n/a"}`);
      if (rows.length > 0) {
        rawRows = rows;
        usedSheet = name;
        break;
      }
    }

    if (rawRows.length === 0) {
      return res.status(400).json({
        error: `No data found in any sheet. Sheet names: ${workbook.SheetNames.join(", ")}. Make sure row 1 has headers like: task_name, skill_required, description`,
      });
    }

    console.log(`✅ Using sheet "${usedSheet}" with ${rawRows.length} rows`);
    console.log(`📋 Columns found: ${Object.keys(rawRows[0]).join(", ")}`);

    // Parse into task objects
    const tasks = parseExcelRows(rawRows);
    if (tasks.length === 0) {
      return res.status(400).json({
        error: `No valid tasks found. Need a column: 'task_name', 'name', 'task', or 'title'. ` +
               `Found columns: ${Object.keys(rawRows[0]).join(", ")}`,
      });
    }

    const projectName = String(req.body.projectName || "").trim()
      || `Project – ${new Date().toLocaleDateString("en-GB")}`;

    console.log(`🚀 Running automation: "${projectName}" — ${tasks.length} tasks`);

    const projectId = await runFullAutomation(tasks, projectName);

    res.json({
      message: `Automation complete. ${tasks.length} tasks processed.`,
      projectId,
      taskCount: tasks.length,
    });
  } catch (err) {
    console.error("❌ POST /tasks/upload-excel:", err);
    res.status(500).json({ error: err.message || "Automation failed" });
  }
});

/* ════════════════════════════════════════════
   CREATE SINGLE TASK
════════════════════════════════════════════ */
router.post("/create", async (req, res) => {
  try {
    const {
      project_id, task_name, priority = "Medium",
      skill_required = "General", estimated_hours = 40,
      description = "", assigned_to = null,
    } = req.body;
    if (!project_id || !task_name)
      return res.status(400).json({ error: "project_id and task_name required" });
    const [result] = await db.query(
      `INSERT INTO tasks
         (project_id, task_name, description, priority,
          skill_required, estimated_hours, assigned_to, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Backlog')`,
      [project_id, task_name, description, priority, skill_required, estimated_hours, assigned_to]
    );
    res.json({ message: "Task created", taskId: result.insertId });
  } catch (err) {
    console.error("❌ POST /tasks/create:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

/* ════════════════════════════════════════════
   TASK ACTIVITY LOG
════════════════════════════════════════════ */
router.get("/activity/:taskId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ta.*, e.first_name FROM task_activity ta
       LEFT JOIN employees e ON e.id = ta.employee_id
       WHERE ta.task_id = ? ORDER BY ta.created_at DESC`,
      [req.params.taskId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /tasks/activity:", err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

router.post("/daily-update", upload.single("file"), async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    console.log("📄 ROWS:", rows.length);

    const STATUS_ORDER = ["Backlog", "Todo", "In Progress", "Review", "Done"];

    const normalizeText = (str) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    /* =========================================================
       ✅ STEP 1: AUTO-DETECT PROJECT FROM FIRST MATCHING TASK
    ========================================================== */
    let detectedProjectId = null;

    for (const row of rows) {
      const rawTaskName = String(
        row.task_name || row["Task Name"] || row.task || ""
      ).trim();

      if (!rawTaskName) continue;

      const normalizedExcelName = normalizeText(rawTaskName);

      const [match] = await conn.query(
        `SELECT id, project_id, task_name FROM tasks`
      );

      for (const t of match) {
        const dbName = normalizeText(t.task_name);

        if (
          dbName === normalizedExcelName ||
          dbName.includes(normalizedExcelName) ||
          normalizedExcelName.includes(dbName)
        ) {
          detectedProjectId = t.project_id;
          console.log("🎯 Detected Project ID:", detectedProjectId);
          break;
        }
      }

      if (detectedProjectId) break;
    }

    if (!detectedProjectId) {
      throw new Error("❌ Could not detect project from Excel tasks");
    }

    /* =========================================================
       ✅ STEP 2: LOAD ALL TASKS OF THAT PROJECT
    ========================================================== */
    const [tasks] = await conn.query(
      `SELECT id, task_name, project_id FROM tasks WHERE project_id = ?`,
      [detectedProjectId]
    );

    console.log("📊 DB Tasks:", tasks.length);

    const affectedProjects = new Set();
    let updated = 0;

    /* =========================================================
       ✅ STEP 3: PROCESS EXCEL
    ========================================================== */
    for (const row of rows) {
      const rawTaskName = String(
        row.task_name || row["Task Name"] || row.task || ""
      ).trim();

      const rawStatus = String(
        row.status || row["Status"] || ""
      ).trim();

      const cleanStatus = STATUS_ORDER.find(
        (s) => s.toLowerCase() === rawStatus.toLowerCase()
      );

      if (!rawTaskName || !cleanStatus) continue;

      const normalizedExcelName = normalizeText(rawTaskName);

      let matchedTask = null;

      for (const t of tasks) {
        const dbName = normalizeText(t.task_name);

        if (
          dbName === normalizedExcelName ||
          dbName.includes(normalizedExcelName) ||
          normalizedExcelName.includes(dbName)
        ) {
          matchedTask = t;
          break;
        }
      }

      if (!matchedTask) {
        console.log("❌ No match for:", rawTaskName);
        continue;
      }

      await conn.query(
        `UPDATE tasks SET status = ? WHERE id = ?`,
        [cleanStatus, matchedTask.id]
      );

      affectedProjects.add(matchedTask.project_id);
      updated++;

      console.log("✅ Updated:", rawTaskName, "→", cleanStatus);
    }

    /* =========================================================
       ✅ STEP 4: REBALANCE
    ========================================================== */
    for (const pid of affectedProjects) {
      await rebalanceAfterUpdate(conn, pid);
    }

    await conn.commit();

    res.json({
      message: `✅ Updated ${updated} tasks`,
      detectedProjectId,
      totalRows: rows.length,
    });

  } catch (err) {
    console.error("❌ ERROR:", err);

    if (conn) await conn.rollback();

    res.status(500).json({ error: err.message });

  } finally {
    if (conn) conn.release();
  }
});

export default router;