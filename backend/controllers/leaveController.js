import { submitLeaveRequest, processPendingLeaves } from "../services/leaveService.js";
import { processSheetLeaves } from "../services/leaveSheetService.js";
import pool from "../db.js";


export const createLeave = async (req, res) => {
  try {
    const result = await submitLeaveRequest(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const triggerCron = async (req, res) => {
  try {
    await processPendingLeaves();
    res.json({ success: true, message: "Pending leaves processed by AI" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const syncSheetLeaves = async (req, res) => {
  try {
    await processSheetLeaves();
    res.json({ success: true, message: "Leaves synced from Google Sheet" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Fetch all leave requests
export const getAllLeaves = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT lr.*, lt.leave_name AS leave_type
      FROM leave_requests lr
      JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
      ORDER BY lr.start_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
};

// Fetch all leave balances
export const getAllLeaveBalance = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM leave_balance ORDER BY employee_id, leave_type_id`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leave balances" });
  }
};

// Fetch all leave approvals log
export const getAllLeaveApprovalsLog = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM leave_approvals_log l
      WHERE status = 'Approved'
      AND log_id IN (
        SELECT MIN(log_id)
        FROM leave_approvals_log
        WHERE status = 'Approved'
        GROUP BY leave_request_id
      )
      ORDER BY action_date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leave approvals log" });
  }
};