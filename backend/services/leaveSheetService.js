import pool from "../db.js";
import axios from "axios";
import csv from "csv-parser";
import { Readable } from "stream";
import { submitLeaveRequest } from "./leaveService.js";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1BaAVRzy0glt0WTEOkiPBqXouJFaieYUOEUlb-BPT4Pw/export?format=csv&gid=2120647181";

// Helper to convert DD/MM/YYYY → YYYY-MM-DD
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split("/").map(Number);
  return `${year}-${month.toString().padStart(2,"0")}-${day.toString().padStart(2,"0")}`;
};

// Fetch Google Sheet CSV
export const fetchLeavesFromSheet = async () => {
  const response = await axios.get(SHEET_URL);
  const results = [];
  const stream = Readable.from(response.data);

  await new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", resolve)
      .on("error", reject);
  });

  return results;
};

// Process sheet rows and submit leaves
export const processSheetLeaves = async () => {
  const rows = await fetchLeavesFromSheet();
  console.log("Fetched rows:", rows);

  for (const row of rows) {
    try {
      // Trim keys & values
      const cleanedRow = {};
      Object.keys(row).forEach((key) => {
        cleanedRow[key.trim()] = row[key]?.trim();
      });

      const employee_id = parseInt(cleanedRow["Employee ID"]);
      const leaveTypeName = cleanedRow["Leave Type"];
      const startDate = formatDate(cleanedRow["Start Date of Leave"]);
      const endDate = formatDate(cleanedRow["End Date of Leave"]);
      const number_of_days = parseInt(cleanedRow["Number of Leave Days"]);
      const reason = cleanedRow["Reason / Comment"] || null;
      const attachment = cleanedRow["Attachment"] || null;
      const approverName = cleanedRow["Approver Name"] || null;

      if (!employee_id || !leaveTypeName || !startDate || !endDate) {
        console.warn("Skipping row due to missing fields:", cleanedRow);
        continue;
      }

      // Get leave_type_id
      const [ltRows] = await pool.query(
        "SELECT leave_type_id FROM leave_types WHERE leave_name=? LIMIT 1",
        [leaveTypeName]
      );
      if (!ltRows.length) {
        console.warn("Leave type not found:", leaveTypeName);
        continue;
      }
      const leave_type_id = ltRows[0].leave_type_id;

      // Check for duplicates
      const [existing] = await pool.query(
        "SELECT leave_request_id FROM leave_requests WHERE employee_id=? AND leave_type_id=? AND start_date=? AND end_date=?",
        [employee_id, leave_type_id, startDate, endDate]
      );
      if (existing.length) {
        console.log("Duplicate leave request found, skipping:", employee_id, leave_type_id, startDate, endDate);
        continue;
      }

      // Get manager_id
      let manager_id = null;
      if (approverName) {
        const [mgrRows] = await pool.query(
          "SELECT id FROM users WHERE name LIKE ? LIMIT 1",
          [`%${approverName}%`]
        );
        if (mgrRows.length) manager_id = mgrRows[0].id;
      }

      // Submit leave request
      const result = await submitLeaveRequest({
        employee_id,
        leave_type_id,
        start_date: startDate,
        end_date: endDate,
        number_of_days,
        reason,
        attachment_url: attachment,
        manager_id,
      });

      console.log("Inserted leave_request:", result);

    } catch (err) {
      console.error("Error processing row:", row, err);
    }
  }

  console.log("✅ Google Sheet leaves processed and stored as Pending");
};