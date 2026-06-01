// backend/services/offboardingService.js
import db from "../db.js";
import { sendOffboardingEmail ,sendEmail} from "../services/offmailService.js";

export const triggerOffboarding = async (employeeId, lastDay, successorEmail) => {

  // 1️⃣ Update employee status
  await db.query(
    "UPDATE employees SET status = ?, last_day = ? WHERE id = ?",
    ["offboarding", lastDay, employeeId]
  );
  
  const [[employee]] = await db.query(
  "SELECT first_name, last_name FROM employees WHERE id = ?",
  [employeeId]
);

const employeeName = `${employee.first_name} ${employee.last_name}`;

  // 2️⃣ Offboarding tasks
  const tasks = [
    { task_name: "Revoke System Access", assigned_to: "IT" },
    { task_name: "Asset Recovery", assigned_to: "IT" },
    { task_name: "Final Payroll & Benefits", assigned_to: "Payroll" },
    { task_name: "Knowledge Transfer", assigned_to: "Manager" },
    { task_name: "Exit Survey", assigned_to: "HR" },
  ];

  for (let task of tasks) {

  const [existing] = await db.query(
    "SELECT id FROM offboarding_tasks WHERE employee_id = ? AND task_name = ?",
    [employeeId, task.task_name]
  );

  if (existing.length > 0) continue;
  
    await db.query(
      `INSERT INTO offboarding_tasks 
      (employee_id, task_name, assigned_to, due_date, status) 
      VALUES (?, ?, ?, ?, ?)`,
      [employeeId, task.task_name, task.assigned_to, lastDay, "pending"]
    );

    // Email routing
    let emailTo =
      task.assigned_to === "IT"
        ? "it@company.com"
        : task.assigned_to === "Payroll"
        ? "payroll@company.com"
        : task.assigned_to === "Manager"
        ? successorEmail
        : "hr@company.com";

  await sendEmail(
  emailTo,
  "Offboarding Task Assigned",
  `Task Assigned: ${task.task_name}

Employee: ${employeeName}
Employee ID: ${employeeId}

Due Date: ${lastDay}

Please complete this task before the employee's last working day.

Regards,
HR Team`
);
  }

  // 3️⃣ Knowledge transfer task
  await db.query(
    `INSERT INTO knowledge_transfer 
    (employee_id, task_description, assigned_to, status)
    VALUES (?, ?, ?, ?)`,
    [
      employeeId,
      "Complete handover and project documentation",
      successorEmail,
      "pending",
    ]
  );

  // 4️⃣ Exit survey
  await db.query(
    `INSERT INTO exit_surveys (employee_id, survey_link, status)
     VALUES (?, ?, ?)`,
    [employeeId, `https://company.com/survey/${employeeId}`, "pending"]
  );

  return { message: "Offboarding workflow triggered successfully" };
};



// Get status of specific employee
export const getOffboardingStatus = async (employeeId) => {

  const [tasks] = await db.query(`
    SELECT 
      t.id,
      t.task_name,
      t.assigned_to,
      t.status,
      t.due_date,
      CONCAT(e.first_name,' ',e.last_name) AS employee_name
    FROM offboarding_tasks t
    JOIN employees e ON t.employee_id = e.id
    WHERE t.employee_id = ?
  `,[employeeId]);

  const [knowledge] = await db.query(
    "SELECT * FROM knowledge_transfer WHERE employee_id = ?",
    [employeeId]
  );

  const [survey] = await db.query(
    "SELECT * FROM exit_surveys WHERE employee_id = ?",
    [employeeId]
  );

  return { tasks, knowledge, survey };
};



// Get all tasks for dashboard
export const getAllTasks = async () => {

  const [tasks] = await db.query(`
   SELECT 
  t.id,
  t.employee_id,  -- ✅ ADD THIS
  CONCAT(e.first_name,' ',e.last_name) AS employee_name,
  e.department,
  t.task_name,
  t.assigned_to,
  t.status,
  t.due_date
FROM offboarding_tasks t
JOIN employees e ON t.employee_id = e.id
ORDER BY t.due_date ASC
  `);

  return tasks;
};



// Get all exit surveys
export const getAllSurveys = async () => {

  const [surveys] = await db.query(`
    SELECT 
      s.id,
      CONCAT(e.first_name,' ',e.last_name) AS employee_name,
      s.survey_link,
      s.status
    FROM exit_surveys s
    JOIN employees e ON s.employee_id = e.id
  `);

  return surveys;
};
export const getOffboardingStats = async () => {
  // total employees in offboarding
  const [employees] = await db.query(`
    SELECT COUNT(*) as totalEmployees
    FROM employees
    WHERE status = 'offboarding'
  `);

  // completed tasks
  const [completed] = await db.query(`
    SELECT COUNT(*) as completedTasks
    FROM offboarding_tasks
    WHERE status = 'completed'
  `);

  // pending tasks
  const [pending] = await db.query(`
    SELECT COUNT(*) as pendingTasks
    FROM offboarding_tasks
    WHERE status = 'pending'
  `);

  // surveys completed
  const [surveyCompleted] = await db.query(`
    SELECT COUNT(*) as surveysCompleted
    FROM exit_surveys
    WHERE status = 'completed'
  `);

  // surveys pending
  const [surveyPending] = await db.query(`
    SELECT COUNT(*) as surveysPending
    FROM exit_surveys
    WHERE status = 'pending'
  `);

  return {
    name: "Offboarding",
    totalEmployees: employees[0].totalEmployees,
    completedTasks: completed[0].completedTasks,
    pendingTasks: pending[0].pendingTasks,
    surveysCompleted: surveyCompleted[0].surveysCompleted,
    surveysPending: surveyPending[0].surveysPending
  };
};