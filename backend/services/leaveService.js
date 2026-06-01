import pool from "../db.js";
import nodemailer from "nodemailer";

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: "isai12d25@gmail.com", pass: "keka dcyg ypus tpwn" },
});

export const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({ from: "isai12d25@gmail.com", to, subject, text });
  } catch (err) {
    console.error("❌ Email failed:", err.message);
  }
};

// AI Auto-Approval
export const determineAutoApproval = (leaveType, numberOfDays, availableDays) => {
  let status = "Rejected"; // default for exceeding limits
switch (leaveType) {
  case "Sick Leave":
    if (numberOfDays <= 3 && numberOfDays <= availableDays) status = "Approved";
    break;
  case "Casual Leave":
    if (numberOfDays <= 2 && numberOfDays <= availableDays) status = "Approved";
    break;
  case "Earned Leave":
    if (numberOfDays <= 5 && numberOfDays <= availableDays) status = "Approved";
    break;
  case "Paternity Leave":
    if (numberOfDays <= availableDays) status = "Approved";
    break;
  case "Maternity Leave":
    status = "Pending"; // manual approval
    break;
  default:
    status = "Rejected";
}
return status;
};
const parseSheetDate = (dateStr) => {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split("/").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// Extract year from DD/MM/YYYY
const getYearFromSheetDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split("/").map(Number);
  return parts[2];
};

// Submit Leave Request
export const submitLeaveRequest = async (data) => {
  const {
    employee_id, leave_type_id, start_date, end_date,
    number_of_days, reason, attachment_url, manager_id, forcePending = false
  } = data;

  const year = new Date(start_date).getFullYear();

  // Get leave type
  const [ltRows] = await pool.query(
    "SELECT leave_name, max_days_per_year FROM leave_types WHERE leave_type_id=?",
    [leave_type_id]
  );
  if (!ltRows.length) throw new Error("Invalid leave type");
  const leaveType = ltRows[0].leave_name;
  const maxDays = ltRows[0].max_days_per_year;

  // Get leave balance
  const [balanceRows] = await pool.query(
    "SELECT * FROM leave_balance WHERE employee_id=? AND leave_type_id=? AND year=?",
    [employee_id, leave_type_id, year]
  );
  const availableDays = balanceRows.length
    ? balanceRows[0].total_allocated - balanceRows[0].used_days
    : maxDays;

  // Determine status
  let status = forcePending ? "Pending" : determineAutoApproval(leaveType, number_of_days, availableDays);

  // Insert leave_request
  const [insertResult] = await pool.query(
    `INSERT INTO leave_requests
     (employee_id, leave_type_id, start_date, end_date, number_of_days, reason, attachment_url, manager_id, status, applied_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [employee_id, leave_type_id, start_date, end_date, number_of_days, reason || null, attachment_url || null, manager_id || null, status]
  );
  const leave_request_id = insertResult.insertId;

  // If approved, update leave balance
  if (status === "Approved") {
    if (!balanceRows.length) {
      await pool.query(
        "INSERT INTO leave_balance (employee_id, leave_type_id, year, total_allocated, used_days) VALUES (?,?,?,?,?)",
        [employee_id, leave_type_id, year, maxDays, number_of_days]
      );
    } else {
      await pool.query(
        "UPDATE leave_balance SET used_days = used_days + ?, updated_at = NOW() WHERE balance_id=?",
        [number_of_days, balanceRows[0].balance_id]
      );
    }
  }

  // Log approval
  await pool.query(
    "INSERT INTO leave_approvals_log (leave_request_id, approved_by, status, comments) VALUES (?,?,?,?)",
    [leave_request_id, manager_id || null, status, status === "Approved" ? "Auto-approved" : "Pending"]
  );

  // Insert notification + send email
  const message = `Your leave from ${start_date} to ${end_date} has been ${status}.`;
  await pool.query(
    "INSERT INTO leave_notifications (leave_request_id, employee_id, title, message) VALUES (?,?,?,?)",
    [leave_request_id, employee_id, `Leave ${status}`, message]
  );
  const [empRows] = await pool.query("SELECT email FROM employees WHERE id=? LIMIT 1", [employee_id]);
  if (empRows.length) await sendEmail(empRows[0].email, `Leave ${status}`, message);

  return { leave_request_id, status };
};

// Cron: Process Pending Leaves older than 8 hours
export const processPendingLeaves = async () => {
  const [rows] = await pool.query(
    `SELECT lr.*, lt.leave_name, lb.used_days, lb.total_allocated, e.email
     FROM leave_requests lr
     JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
     LEFT JOIN leave_balance lb ON lb.employee_id = lr.employee_id AND lb.leave_type_id = lr.leave_type_id AND YEAR(lr.start_date) = lb.year
     JOIN employees e ON e.id = lr.employee_id
     WHERE lr.status='Pending' AND TIMESTAMPDIFF(HOUR, lr.applied_at, NOW()) >= 8`
  );

  for (const row of rows) {
    const availableDays = row.total_allocated ? row.total_allocated - row.used_days : row.max_days_per_year;
    const status = determineAutoApproval(row.leave_name, row.number_of_days, availableDays);

    await pool.query("UPDATE leave_requests SET status=?, updated_at=NOW() WHERE leave_request_id=?",
      [status, row.leave_request_id]);

    if (status === "Approved") {
      if (!row.used_days) {
        await pool.query(
          "INSERT INTO leave_balance (employee_id, leave_type_id, year, total_allocated, used_days) VALUES (?,?,?,?,?)",
          [row.employee_id, row.leave_type_id, new Date(row.start_date).getFullYear(), row.max_days_per_year, row.number_of_days]
        );
      } else {
        await pool.query(
          "UPDATE leave_balance SET used_days = used_days + ?, updated_at=NOW() WHERE employee_id=? AND leave_type_id=? AND year=?",
          [row.number_of_days, row.employee_id, row.leave_type_id, new Date(row.start_date).getFullYear()]
        );
      }
    }

    await pool.query(
      "INSERT INTO leave_approvals_log (leave_request_id, status, comments) VALUES (?,?,?)",
      [row.leave_request_id, status, status === "Approved" ? "Auto-approved by AI" : "Rejected by AI"]
    );

    await pool.query(
      "INSERT INTO leave_notifications (leave_request_id, employee_id, title, message) VALUES (?,?,?,?)",
      [row.leave_request_id, row.employee_id, `Leave ${status}`, `Your leave from ${row.start_date} to ${row.end_date} has been ${status}`]
    );

    await sendEmail(row.email, `Leave ${status}`, `Your leave from ${row.start_date} to ${row.end_date} has been ${status}`);
  }

  console.log("✅ Pending leaves processed by AI cron");
};