// sheets.js
import { google } from "googleapis";
import fs from "fs";
import path from "path";

// Load service account credentials
const creds = JSON.parse(fs.readFileSync(path.resolve("service-account.json"), "utf-8"));

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

// Fetch and normalize sheet rows
export async function fetchSheetRows(sheetId, range = "A:Z") {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return [];

  const [header, ...data] = rows;
  return data.map(r => {
    const obj = {};
    header.forEach((h, i) => {
      const key = h.trim();
      const val = r[i] ? r[i].toString().trim() : "";
      obj[key] = val;
    });
    return obj;
  });
}