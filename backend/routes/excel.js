// routes/excel.js
import express from "express";
import ExcelJS from "exceljs";
import { google } from "googleapis";
import pool from "../db.js";
import fs from "fs";
import path from "path";

const creds = JSON.parse(fs.readFileSync(path.resolve("service-account.json"), "utf-8"));
const router = express.Router();

const APTI_SHEET_ID = "1wAXx2HWtN9VgNFLDojRPhwRzMatKC8q8D-DXD5s8QfM";
const TECH_SHEET_ID = "1P1lmLycDLEtyWYqrCzIxeaNO3Pbs_GnpyRzz0A88yXA";
const HR_SHEET_ID = "1BaAVRzy0glt0WTEOkiPBqXouJFaieYUOEUlb-BPT4Pw";

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

async function fetchSheetRows(sheetId, range = "A:Z") {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const rows = res.data.values || [];
  if (rows.length === 0) return [];

  const [header, ...data] = rows;
  return data.map(r => {
    const obj = {};
    header.forEach((h, i) => {
      obj[h.trim()] = r[i] ? r[i].toString().trim() : "";
    });
    return obj;
  });
}

function findScore(rows, email, position) {
  const row = rows.find(
    r =>
      r["Email address"]?.toLowerCase() === email.toLowerCase() &&
      r.Position?.toLowerCase() === position.toLowerCase()
  );
  if (!row) return "-";
  return row.Score || "-";
}

router.get("/download-candidates-excel", async (req, res) => {
  try {
    const [candidates] = await pool.query(`
      SELECT id AS candidate_id, first_name, last_name, email, position, ai_score, shortlist_status
      FROM external_candidates
      ORDER BY first_name, last_name
    `);

    const [aptiRows, techRows, hrRows] = await Promise.all([
      fetchSheetRows(APTI_SHEET_ID),
      fetchSheetRows(TECH_SHEET_ID),
      fetchSheetRows(HR_SHEET_ID),
    ]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Candidates");

    sheet.columns = [
      { header: "Candidate Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Position", key: "position", width: 20 },
      { header: "Shortlist Status", key: "shortlist_status", width: 15 },
      { header: "AI Status", key: "ai_score", width: 12 },
      { header: "Aptitude Status", key: "apti_score", width: 15 },
      { header: "Technical Score", key: "tech_score", width: 15 },
      { header: "HR Status", key: "hr_score", width: 12 },
    ];

    candidates.forEach(c => {
      sheet.addRow({
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        position: c.position,
        shortlist_status: c.shortlist_status || "-",
        ai_score: c.ai_score || "-",
        apti_score: findScore(aptiRows, c.email, c.position),
        tech_score: findScore(techRows, c.email, c.position),
        hr_score: findScore(hrRows, c.email, c.position),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=candidates.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating Excel file");
  }
});

export default router;