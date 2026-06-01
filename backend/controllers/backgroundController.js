import axios from "axios";
import csv from "csv-parser";
import { Readable } from "stream";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1BaAVRzy0glt0WTEOkiPBqXouJFaieYUOEUlb-BPT4Pw/export?format=csv&gid=1998584712";

export const getBackgroundList = async (req, res) => {
  try {
    const response = await axios.get(SHEET_URL);

    const results = [];
    const stream = Readable.from(response.data);

    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        res.json(results);
      });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sheet data" });
  }
};