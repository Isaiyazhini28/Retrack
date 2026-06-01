import axios from "axios";
import csv from "csv-parser";
import { Readable } from "stream";
import db from "../db.js";
import moment from "moment";

const SHEET_URL =
"https://docs.google.com/spreadsheets/d/1BaAVRzy0glt0WTEOkiPBqXouJFaieYUOEUlb-BPT4Pw/export?format=csv&gid=1998584712";

export const syncSheetData = async () => {

  const [syncRow] = await db.query(
    "SELECT last_synced_at FROM sheet_sync_log ORDER BY id DESC LIMIT 1"
  );

  const lastSynced = syncRow.length
    ? syncRow[0].last_synced_at
    : "1970-01-01 00:00:00";

  const response = await axios.get(SHEET_URL);

  const results = [];
  const stream = Readable.from([response.data]);

  return new Promise((resolve, reject) => {

    stream
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        try {

          let latestTimestamp = lastSynced;

         for (const row of results) {

  const formattedDate = moment(
    row["Timestamp"],
    "DD/MM/YYYY HH:mm:ss"
  ).format("YYYY-MM-DD HH:mm:ss");

  const email = row["Email address"];

  const [existing] = await db.query(
    "SELECT background_check_status FROM background_verifications WHERE email = ?",
    [email]
  );

  if (existing.length > 0) {

    if (existing[0].background_check_status !== row["BACKGROUND CHECK"]) {

      await db.query(
        `UPDATE background_verifications 
         SET background_check_status = ? 
         WHERE email = ?`,
        [row["BACKGROUND CHECK"], email]
      );

      console.log(`Updated status for ${email}`);
    }

  } else {

    await db.query(
      `INSERT INTO background_verifications
      (timestamp,email,pan_card,aadhar_card,passport,education_records,previous_employment_record,signed_consent,background_check_status)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        formattedDate,
        email,
        row["PAN CARD"],
        row["AADHAR CARD"],
        row["PASSPORT"],
        row["EDUCATION RECORDS"],
        row["PREVIOUS EMPLOYMENT RECORD"],
        row["SIGNED CONSENT"],
        row["BACKGROUND CHECK"]
      ]
    );

    console.log(`Inserted new record for ${email}`);
  }
}

          await db.query(
            "INSERT INTO sheet_sync_log (last_synced_at) VALUES (?)",
            [latestTimestamp]
          );

          console.log("New rows synced successfully");

          resolve();

        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
};