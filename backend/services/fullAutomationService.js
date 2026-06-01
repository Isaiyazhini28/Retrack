// services/fullAutomationService.js
import db from "../db.js";

/* ════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════ */
const SPRINT_CAPACITY_HOURS           = 80;   // 2 weeks × 8h × 5 days
const SPRINT_DURATION_DAYS            = 14;   // calendar days per sprint
const MIN_TASK_DAYS                   = 3;    // floor: 3 working days
const MAX_TASK_DAYS                   = 21;   // ceiling: 3 weeks
const MAX_TASKS_PER_PERSON_PER_SPRINT = 4;    // soft cap before escalation

/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */

/** Add N working days (Mon–Fri) to a Date */
const addWorkingDays = (startDate, days) => {
  const date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date;
};

/** Date → 'YYYY-MM-DD' */
const toDateStr = (d) => new Date(d).toISOString().split("T")[0];

/** Department → role ENUM */
const departmentToRole = (dept = "") => {
  const d = dept.toLowerCase();
  if (d.includes("manager") || d.includes("lead") || d.includes("pm")) return "Manager";
  if (d.includes("design")  || d.includes("ui")   || d.includes("ux")) return "Designer";
  if (d.includes("test")    || d.includes("qa"))                        return "Tester";
  return "Developer";
};

/** Derive priority + hours from task name keywords */
const classifyTask = (taskName = "") => {
  const lower = taskName.toLowerCase();
  let priority, minDays, maxDays;

  if (lower.match(/critical|urgent|hotfix|security|outage/)) {
    priority = "Critical"; minDays = 3;  maxDays = 7;
  } else if (lower.match(/bug|fix|patch|deploy|migrate|optimize/)) {
    priority = "High";     minDays = 5;  maxDays = 10;
  } else if (lower.match(/feature|implement|build|create|develop|design/)) {
    priority = "Medium";   minDays = 8;  maxDays = 14;
  } else if (lower.match(/test|research|review|document|integration|report/)) {
    priority = "Low";      minDays = 10; maxDays = 18;
  } else {
    priority = "Medium";   minDays = 7;  maxDays = 12;
  }

  const days = minDays + Math.floor(Math.random() * (maxDays - minDays + 1));
  return { priority, estimated_hours: days * 8, estimated_days: days };
};

/* ════════════════════════════════════════════
   EXCEL / DOCUMENT PARSER
   Accepts rows from any parsed document.
   Normalises column names flexibly.
════════════════════════════════════════════ */
export const parseDocumentTasks = (rows) => {
  if (!rows?.length) throw new Error("Document has no rows.");

  const norm = (key) =>
    String(key).toLowerCase().trim().replace(/[\s\-\/]+/g, "_");

  return rows
    .map((row) => {
      const r = {};
      for (const [k, v] of Object.entries(row)) {
        r[norm(k)] = String(v ?? "").trim();
      }

      const task_name      = r.task_name || r.task || r.name || r.title || "";
      const skill_required = r.skill_required || r.skill || r.skills || r.tech || "General";
      const description    = r.description || r.desc || r.details || "";
      const priority_hint  = r.priority || "";

      // ✅ NEW: Capture status from Excel
      const status = r.status || "";

      if (!task_name) return null;

      return {
        task_name,
        skill_required,
        description,
        priority_hint,
        status   // ✅ important
      };
    })
    .filter(Boolean);
};
/* ════════════════════════════════════════════
   STATUS PROGRESSION
════════════════════════════════════════════ */
const STATUS_ORDER = ["Backlog", "Todo", "In Progress", "Review", "Done"];

export const progressTaskStatus = async (taskId, employeeId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[task]] = await conn.query("SELECT * FROM tasks WHERE id = ?", [taskId]);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const idx = STATUS_ORDER.indexOf(task.status);
    if (idx === -1 || idx === STATUS_ORDER.length - 1)
      return { message: "Task already Done.", task };

    const next = STATUS_ORDER[idx + 1];
    await conn.query("UPDATE tasks SET status = ? WHERE id = ?", [next, taskId]);
    await conn.query(
      `INSERT INTO task_activity (task_id, employee_id, activity_type, description)
       VALUES (?, ?, 'status_change', ?)`,
      [taskId, employeeId, `${task.status} → ${next}`]
    );

    // Auto-activate next queued task when this one is Done
    if (next === "Done") {
      const [[nextTask]] = await conn.query(
        `SELECT id FROM tasks
         WHERE assigned_to = ? AND status = 'Todo'
         ORDER BY FIELD(priority,'Critical','High','Medium','Low'), due_date ASC
         LIMIT 1`,
        [task.assigned_to]
      );
      if (nextTask) {
        await conn.query("UPDATE tasks SET status = 'In Progress' WHERE id = ?", [nextTask.id]);
        await conn.query(
          `INSERT INTO task_activity (task_id, employee_id, activity_type, description)
           VALUES (?, ?, 'auto_activated', 'Auto-activated after previous task completed')`,
          [nextTask.id, task.assigned_to]
        );
      }
      await rebalanceAfterUpdate(conn, task.project_id);
    }

    await conn.commit();
    return { message: `Moved to ${next}`, nextStatus: next };
  } catch (err) {
    await conn.rollback(); throw err;
  } finally { conn.release(); }
};

/* ════════════════════════════════════════════
   STEP 1 — CREATE PROJECT
════════════════════════════════════════════ */
const createProject = async (conn, projectName, tasks) => {
  const totalDays  = tasks.reduce((s, t) => s + classifyTask(t.task_name).estimated_days, 0);
  const parallelism = Math.max(1, Math.floor(tasks.length / 4));
  const deadlineDays = Math.max(21, Math.ceil(totalDays / parallelism));

  const [res] = await conn.query(
    `INSERT INTO projects
      (project_name, description, created_by, start_date, deadline, status)
     VALUES (?, ?, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'Active')`,
    [projectName, `Auto-generated project: ${projectName}`, deadlineDays]
  );
  console.log(`📁 Project "${projectName}" created → ID ${res.insertId}, deadline +${deadlineDays}d`);
  return res.insertId;
};

/* ════════════════════════════════════════════
   STEP 2 — FETCH EMPLOYEES WITH SKILLS
════════════════════════════════════════════ */
const getEmployeesWithSkills = async (conn) => {
  const [employees] = await conn.query(`
    SELECT e.id, e.first_name, e.department,
           GROUP_CONCAT(LOWER(s.name) SEPARATOR ',') AS skill_names
    FROM employees e
    LEFT JOIN employee_skills es ON es.employee_id = e.id
    LEFT JOIN skills s ON s.id = es.skill_id
    WHERE e.status = 'Active'
      AND (e.last_day IS NULL OR e.last_day > CURDATE())
    GROUP BY e.id
  `);

  return employees.map((e) => ({
    ...e,
    skills: e.skill_names ? e.skill_names.split(",").filter(Boolean) : [],
  }));
};

/* ════════════════════════════════════════════
   STEP 3 — ASSIGN MEMBERS TO PROJECT
════════════════════════════════════════════ */
const assignMembers = async (conn, projectId, employees) => {
  for (const emp of employees) {
    await conn.query(
      `INSERT IGNORE INTO project_members (project_id, employee_id, role)
       VALUES (?, ?, ?)`,
      [projectId, emp.id, departmentToRole(emp.department)]
    );
  }
};

/* ════════════════════════════════════════════
   STEP 4 — INSERT TASKS (Backlog, unassigned)
════════════════════════════════════════════ */
const insertTasks = async (conn, projectId, tasks) => {
  const values = tasks.map((t) => {
    const { priority, estimated_hours } = classifyTask(t.task_name);
    // Honour explicit priority hint from document if present
    const finalPriority = ["Low","Medium","High","Critical"].includes(t.priority_hint)
      ? t.priority_hint : priority;
    return [
      projectId,
      t.task_name,
      t.description || "",
      finalPriority,
      t.skill_required || "General",
      estimated_hours,
      Math.ceil(estimated_hours / 8),
      "Backlog",
    ];
  });

  await conn.query(
    `INSERT INTO tasks
      (project_id, task_name, description, priority,
       skill_required, estimated_hours, story_points, status)
     VALUES ?`,
    [values]
  );
  console.log(`📋 ${tasks.length} tasks inserted`);
};

/* ════════════════════════════════════════════
   STEP 5 — SKILL TABLE SYNC
════════════════════════════════════════════ */
const ensureSkill = async (conn, skillName) => {
  if (!skillName || skillName === "General") return null;
  const clean = skillName.trim();
  const [rows] = await conn.query("SELECT id FROM skills WHERE LOWER(name) = LOWER(?)", [clean]);
  if (rows.length) return rows[0].id;
  const [res] = await conn.query("INSERT INTO skills (name) VALUES (?)", [clean]);
  return res.insertId;
};

/* ════════════════════════════════════════════
   STEP 6 — SMART ROUND-ROBIN ASSIGNMENT
   Logic:
   • Build a skill→[employeeIds] index upfront
   • For each task (sorted by priority):
     1. Try skill-matched employees
     2. Fall back to all active employees
     3. Pick the one with LOWEST current assigned_hours
        (ties broken by task count, then employee id for determinism)
   • Track in-memory: hours_assigned[], task_count[]
   • Priority escalation when person hits sprint cap
   • Auto-learn: add skill to fallback employee
════════════════════════════════════════════ */
const WORK_HOURS_PER_DAY = 8;
const WORK_DAYS_PER_YEAR = 252;
const YEARLY_CAPACITY_HOURS = WORK_HOURS_PER_DAY * WORK_DAYS_PER_YEAR; // 2016h/year per employee

export const autoAssignTasks = async (conn, projectId, employees) => {
  if (!employees.length) throw new Error("No active employees found.");

  // Fetch unassigned tasks
  const [tasks] = await conn.query(
    `SELECT * FROM tasks
     WHERE project_id = ? AND assigned_to IS NULL
     ORDER BY FIELD(priority,'Critical','High','Medium','Low'), id ASC`,
    [projectId]
  );

  // Existing workload
  const [existingLoad] = await conn.query(`
    SELECT assigned_to,
           COALESCE(SUM(estimated_hours), 0) AS hours
    FROM tasks
    WHERE status NOT IN ('Done','Backlog')
      AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  `);

  // Workload map
  const workloadMap = {};
  for (const e of employees) workloadMap[e.id] = 0;

  for (const row of existingLoad) {
    if (workloadMap[row.assigned_to] !== undefined) {
      workloadMap[row.assigned_to] = Number(row.hours);
    }
  }

  // Build skill index
  const skillIndex = {};
  for (const emp of employees) {
    for (const skill of emp.skills) {
      const key = skill.toLowerCase();
      if (!skillIndex[key]) skillIndex[key] = [];
      skillIndex[key].push(emp);
    }
  }

  const VALID_STATUS = ["Backlog", "Todo", "In Progress", "Review", "Done"];

  // Assign tasks
  for (const task of tasks) {
    const skillKey = (task.skill_required || "").toLowerCase().trim();
    let candidates = skillIndex[skillKey] || employees;

    // Pick least loaded employee
    let selected = candidates.reduce((best, cur) => {
      if ((workloadMap[cur.id] ?? Infinity) < (workloadMap[best.id] ?? Infinity)) return cur;
      if ((workloadMap[cur.id] ?? 0) === (workloadMap[best.id] ?? 0)) {
        return cur.id < best.id ? cur : best;
      }
      return best;
    });

    // Auto-learn skill
    if (!skillIndex[skillKey] || skillIndex[skillKey].length === 0) {
      const skillId = await ensureSkill(conn, task.skill_required);
      if (skillId) {
        await conn.query(
          `INSERT IGNORE INTO employee_skills (employee_id, skill_id, proficiency)
           VALUES (?, ?, 3)`,
          [selected.id, skillId]
        );

        if (!skillIndex[skillKey]) skillIndex[skillKey] = [];
        skillIndex[skillKey].push(selected);
        selected.skills.push(skillKey);

        console.log(`🧠 Auto-learned: "${task.skill_required}" → ${selected.first_name}`);
      }
    }

    // 🧠 Preserve status logic
    let finalStatus = task.status;

    if (!VALID_STATUS.includes(finalStatus)) {
      finalStatus = "Backlog";
    }

    // Only upgrade Backlog → Todo
    if (finalStatus === "Backlog" || !finalStatus) {
      finalStatus = "Todo";
    }

    // ✅ Assign WITHOUT overwriting meaningful statuses
    await conn.query(
      `UPDATE tasks 
       SET assigned_to = ?, status = ?
       WHERE id = ?`,
      [selected.id, finalStatus, task.id]
    );

    // Update workload
    workloadMap[selected.id] += task.estimated_hours || 8;

    console.log(
      `✅ "${task.task_name}" → ${selected.first_name} | status: ${finalStatus} | load: ${workloadMap[selected.id]}h`
    );
  }

  console.log("\n📊 Final workload distribution:");
  for (const e of employees) {
    console.log(`   ${e.first_name}: ${workloadMap[e.id]}h`);
  }
};

/* ════════════════════════════════════════════
   STEP 7 — SPRINT SCHEDULING
   • Sort tasks: priority → estimated_hours DESC
   • Bin-pack into 80h sprints
   • Sprint 1 = Active, rest = Planned
   • Each sprint starts after previous ends (working day)
════════════════════════════════════════════ */
const createSprints = async (conn, projectId) => {
  const [tasks] = await conn.query(
    `SELECT * FROM tasks
     WHERE project_id = ?
     ORDER BY FIELD(priority,'Critical','High','Medium','Low'),
              estimated_hours DESC`,
    [projectId]
  );

  let sprintNum = 1;
  let sprintStart = new Date();
  sprintStart.setHours(0, 0, 0, 0);

  let bucket = [];
  let bucketHours = 0;

  const flushSprint = async () => {
    if (!bucket.length) return;

    const sprintEnd = addWorkingDays(sprintStart, 10); // 2-week sprint = 10 working days
    const [res] = await conn.query(
      `INSERT INTO sprints (project_id, sprint_name, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, `Sprint ${sprintNum}`, toDateStr(sprintStart), toDateStr(sprintEnd), sprintNum === 1 ? 'Active' : 'Planned']
    );

    // Assign tasks to sprint and set start/due dates
    for (const t of bucket) {
      await conn.query("INSERT INTO sprint_tasks (sprint_id, task_id) VALUES (?, ?)", [res.insertId, t.id]);

      // Task dates: start = sprintStart, due = sprintStart + days needed
      const daysNeeded = Math.ceil((t.estimated_hours || 8) / 8);
      const taskStart = new Date(sprintStart);
      const taskDue = addWorkingDays(taskStart, daysNeeded);
      await conn.query("UPDATE tasks SET start_date = ?, due_date = ? WHERE id = ?", [toDateStr(taskStart), toDateStr(taskDue), t.id]);
    }

    console.log(`📦 Sprint ${sprintNum} [${toDateStr(sprintStart)} → ${toDateStr(sprintEnd)}] | ${bucket.length} tasks | ${bucketHours}h`);

    // Prepare next sprint
    sprintStart = addWorkingDays(sprintEnd, 1);
    sprintNum++;
    bucket = [];
    bucketHours = 0;
  };

  for (const task of tasks) {
    const h = task.estimated_hours || 8;
    // Flush sprint if adding task exceeds capacity
    if (bucket.length > 0 && bucketHours + h > SPRINT_CAPACITY_HOURS) {
      await flushSprint();
    }
    bucket.push(task);
    bucketHours += h;
  }

  await flushSprint(); // flush last bucket
};

/* ════════════════════════════════════════════
   STEP 8 — TASK DATE ASSIGNMENT
   • Per-employee cursor: tracks when they finish last task
   • task.start = max(sprint.start, employee_cursor)
   • task.due   = start + clamped working days
════════════════════════════════════════════ */
const setTaskDates = async (conn, projectId) => {
  const [rows] = await conn.query(
    `SELECT t.id, t.estimated_hours, t.assigned_to, t.priority,
            s.start_date AS sprint_start, s.end_date AS sprint_end
     FROM tasks t
     JOIN sprint_tasks st ON st.task_id = t.id
     JOIN sprints s       ON s.id = st.sprint_id
     WHERE t.project_id = ?
     ORDER BY s.start_date ASC,
              FIELD(t.priority,'Critical','High','Medium','Low'),
              t.estimated_hours DESC`,
    [projectId]
  );

  const cursor = {}; // empId → Date (next available start)

  for (const t of rows) {
    const empId = String(t.assigned_to);
    const sprintStart = new Date(t.sprint_start);
    const sprintEnd   = new Date(t.sprint_end);

    // Days needed for task (clamped)
    const rawDays = Math.ceil((t.estimated_hours || 8) / 8);
    const taskDays = Math.min(MAX_TASK_DAYS, Math.max(MIN_TASK_DAYS, rawDays));

    // Task starts after last task for employee or sprint start, whichever is later
    let taskStart = cursor[empId] && cursor[empId] > sprintStart ? cursor[empId] : sprintStart;

    // Clamp task to not exceed sprint end
    let taskDue = addWorkingDays(taskStart, taskDays);
    if (taskDue > sprintEnd) taskDue = new Date(sprintEnd);

    await conn.query(
      "UPDATE tasks SET start_date = ?, due_date = ? WHERE id = ?",
      [toDateStr(taskStart), toDateStr(taskDue), t.id]
    );

    // Move cursor to next working day after this task
    let nextStart = addWorkingDays(taskDue, 1);
    if (nextStart > sprintEnd) nextStart = new Date(sprintEnd); // don't exceed sprint
    cursor[empId] = nextStart;
  }

  console.log(`📅 Task dates set for ${rows.length} tasks`);
};

/* ════════════════════════════════════════════
   STEP 9 — AI RISK PREDICTIONS
   Weighted scoring model (0–100):
     Priority weight    : 0–35
     Task duration      : 0–25
     Assignee overload  : 0–25
     Skill proficiency  : 0–15  (low proficiency = high risk)
   + small random noise ±5
════════════════════════════════════════════ */
const addAiRisk = async (conn, projectId) => {
  const [tasks] = await conn.query(
    `SELECT
       t.id, t.priority, t.estimated_hours, t.assigned_to,
       t.skill_required,
       COALESCE(
         (SELECT SUM(t2.estimated_hours)
          FROM tasks t2
          JOIN sprint_tasks st2 ON st2.task_id = t2.id
          JOIN sprints s2 ON s2.id = st2.sprint_id
          WHERE t2.assigned_to = t.assigned_to
            AND t2.id != t.id
            AND t2.status NOT IN ('Done','Backlog')
            AND s2.project_id = t.project_id
       ), 0) AS peer_load,
       COALESCE(
         (SELECT es.proficiency
          FROM employee_skills es
          JOIN skills sk ON sk.id = es.skill_id
          WHERE es.employee_id = t.assigned_to
            AND LOWER(sk.name) = LOWER(t.skill_required)
          LIMIT 1),
         5
       ) AS proficiency
     FROM tasks t
     WHERE t.project_id = ?`,
    [projectId]
  );

  for (const t of tasks) {
    let score = 0;
    score += { Critical: 35, High: 25, Medium: 13, Low: 4 }[t.priority] ?? 13;

    if      (t.estimated_hours > 120) score += 25;
    else if (t.estimated_hours > 80)  score += 16;
    else if (t.estimated_hours > 40)  score += 8;
    else                              score += 3;

    if      (t.peer_load > 200) score += 25;
    else if (t.peer_load > 140) score += 16;
    else if (t.peer_load > 80)  score += 8;
    else                        score += 2;

    score += Math.round((10 - Math.min(10, t.proficiency || 5)) * 1.5);

    score += Math.floor(Math.random() * 10) - 5;
    score  = Math.max(0, Math.min(100, score));

    const risk_level =
      score >= 62 ? "High" :
      score >= 32 ? "Medium" : "Low";

    const predicted_delay_days =
      risk_level === "High"   ? Math.ceil(t.estimated_hours / 8 / 2) + Math.floor(Math.random() * 3)
      : risk_level === "Medium" ? Math.ceil(t.estimated_hours / 8 / 4) + Math.floor(Math.random() * 2)
      : Math.floor(Math.random() * 2);

    const confidence_score = parseFloat((0.65 + (score / 100) * 0.32).toFixed(2));

    await conn.query(
      `INSERT INTO ai_predictions (task_id, risk_level, predicted_delay_days, confidence_score)
       VALUES (?, ?, ?, ?)`,
      [t.id, risk_level, predicted_delay_days, confidence_score]
    );

    console.log(`🧪 Task ${t.id}: score=${score}, risk=${risk_level}, delay=${predicted_delay_days}d`);
  }

  console.log(`🤖 AI risk predictions generated for ${tasks.length} tasks`);
};

/* ════════════════════════════════════════════
   FULL AUTOMATION PIPELINE ENTRY POINT
════════════════════════════════════════════ */
export const runFullAutomation = async (tasks, projectName) => {
  if (!tasks?.length) throw new Error("No tasks provided.");

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    console.log(`\n🚀 ═══ Automation: "${projectName}" | ${tasks.length} tasks ═══`);

    const projectId = await createProject(conn, projectName, tasks);
    const employees = await getEmployeesWithSkills(conn);
    if (!employees.length) throw new Error("No active employees in database.");
    console.log(`👥 ${employees.length} active employees`);

    await assignMembers(conn, projectId, employees);
    await insertTasks(conn, projectId, tasks);
    await autoAssignTasks(conn, projectId, employees);
    await createSprints(conn, projectId);
    await setTaskDates(conn, projectId);
    await addAiRisk(conn, projectId);

    await conn.commit();
    console.log(`\n✅ Automation complete → Project ID: ${projectId}\n`);
    return projectId;
  } catch (err) {
    await conn.rollback();
    console.error("❌ Rolled back:", err.message);
    throw err;
  } finally {
    conn.release();
  }
};
/* ════════════════════════════════════════════
   DAILY EXCEL UPDATE + AUTO FLOW
════════════════════════════════════════════ */

import XLSX from "xlsx";

export const processDailyExcelUpdate = async (fileBuffer, employeeId) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    console.log(`\n📥 Processing daily update for Employee ${employeeId}`);

    // Read Excel
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const tasksFromExcel = parseDocumentTasks(rows);

    const updatedTaskIds = new Set();
    let projectId = null;

    for (const row of tasksFromExcel) {
      if (!row.task_name) continue;

     let task;

// 1️⃣ Try exact match first
[[task]] = await conn.query(
  `SELECT * FROM tasks 
   WHERE assigned_to = ?
   AND LOWER(TRIM(task_name)) = LOWER(TRIM(?))
   LIMIT 1`,
  [employeeId, row.task_name]
);

// 2️⃣ Fallback to partial match ONLY if exact fails
if (!task) {
  const [tasks] = await conn.query(
    `SELECT * FROM tasks 
     WHERE assigned_to = ?
     AND LOWER(task_name) LIKE LOWER(?)
     ORDER BY LENGTH(task_name) ASC
     LIMIT 1`,
    [employeeId, `%${row.task_name}%`]
  );

  task = tasks[0];
}

if (!task) {
  console.log(`❌ No match for: ${row.task_name}`);
  continue;
}
      if (!task) continue;

      projectId = task.project_id;

      // ✅ STATUS UPDATE FROM EXCEL (if provided)
    if (row.status) {
  const cleanStatus = row.status.trim();

  if (STATUS_ORDER.includes(cleanStatus)) {
    await conn.query(
      "UPDATE tasks SET status = ? WHERE id = ?",
      [cleanStatus, task.id]
    );

    console.log(`📌 Status set from Excel → ${cleanStatus}`);
  } else {
    console.log(`⚠️ Invalid status in Excel: ${row.status}`);
  }
}

      // ✅ Optional: actual hours update
      if (row.actual_hours) {
        await conn.query(
          "UPDATE tasks SET actual_hours = ? WHERE id = ?",
          [Number(row.actual_hours), task.id]
        );
      }

      updatedTaskIds.add(task.id);

      console.log(`🔄 Updated: ${task.task_name}`);
    }

    // ✅ AUTO-ASSIGN NEW TASKS IF EMPLOYEE IS FREE
    const [[activeTask]] = await conn.query(
      `SELECT id FROM tasks 
       WHERE assigned_to = ? 
         AND status IN ('In Progress','Review')
       LIMIT 1`,
      [employeeId]
    );

    if (!activeTask) {
      const [[nextTask]] = await conn.query(
        `SELECT * FROM tasks
         WHERE status = 'Backlog'
         ORDER BY FIELD(priority,'Critical','High','Medium','Low'),
                  estimated_hours ASC
         LIMIT 1`
      );

      if (nextTask) {
        await conn.query(
          `UPDATE tasks 
           SET assigned_to = ?, status = 'In Progress' 
           WHERE id = ?`,
          [employeeId, nextTask.id]
        );

        console.log(`🚀 Auto-assigned new task: ${nextTask.task_name}`);
      }
    }

    // ✅ RECALCULATE SPRINT + DATES + AI
    if (projectId) {
      await setTaskDates(conn, projectId);
      await addAiRisk(conn, projectId);
    }

    await conn.commit();

    console.log(`\n✅ Daily update completed for Employee ${employeeId}\n`);

    return {
      success: true,
      updatedTasks: updatedTaskIds.size
    };

  } catch (err) {
    await conn.rollback();
    console.error("❌ Daily update failed:", err.message);
    throw err;
  } finally {
    conn.release();
  }
};

export const rebalanceAfterUpdate = async (conn, projectId) => {
  console.log("♻️ Rebalancing project:", projectId);

  // ✅ FIX: get employees WITH skills
  const employees = await getEmployeesWithSkills(conn);

  await autoAssignTasks(conn, projectId, employees);
  await setTaskDates(conn, projectId);

  await conn.query(`
    DELETE ai FROM ai_predictions ai
    JOIN tasks t ON t.id = ai.task_id
    WHERE t.project_id = ?
  `, [projectId]);

  await addAiRisk(conn, projectId);

  console.log("✅ Rebalance complete");
};